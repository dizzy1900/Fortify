import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  lte,
  or,
} from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { DOCUMENT_PIPELINE_VERSION } from "@/lib/contracts/document-intelligence";
import { assertAuthorized, AuthorizationDeniedError } from "@/lib/production/authorization";
import {
  DeterministicCorrespondenceExtractor,
  DeterministicDocumentClassifier,
  DocumentProviderError,
  type DocumentClassifier,
  type DocumentTextProvider,
  type ProviderDocument,
  type VersionedDocumentExtractor,
} from "@/lib/production/document-providers";
import { assertTenantObjectKey, type ObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  appendAudit,
  IdempotencyConflictError,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export class DocumentPipelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentPipelineValidationError";
  }
}

export class DocumentPipelineStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentPipelineStateError";
  }
}

function sha256(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

function requestHash(value: Record<string, unknown>) {
  return createHash("sha256")
    .update(JSON.stringify(Object.fromEntries(Object.entries(value).sort())))
    .digest("hex");
}

function at(clock: () => Date) {
  return clock().toISOString();
}

function conciseError(error: unknown) {
  const message = error instanceof Error ? error.message : "Document processing failed.";
  return message.replace(/\s+/g, " ").trim().slice(0, 500);
}

function providerError(error: unknown) {
  if (error instanceof DocumentProviderError)
    return { code: error.code, message: conciseError(error), retryable: error.retryable };
  return {
    code: "document_pipeline_error",
    message: conciseError(error),
    retryable: false,
  };
}

interface LeasedJob {
  job: typeof schema.documentProcessingJobs.$inferSelect;
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
}

export class DocumentPipelineService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly textProvider: DocumentTextProvider,
    private readonly classifier: DocumentClassifier = new DeterministicDocumentClassifier(),
    private readonly extractors: VersionedDocumentExtractor[] = [
      new DeterministicCorrespondenceExtractor(),
    ],
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async intake(
    context: TenantContext,
    input: {
      storageObjectId: string;
      caseId?: string;
      sourceSystem?: string;
      supersedesSourceDocumentId?: string;
      idempotencyKey: string;
      maxAttempts?: number;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "source_document",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    assertAuthorized(context, {
      action: "create",
      resource: "document_processing_job",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 160)
      throw new DocumentPipelineValidationError(
        "A bounded document-intake idempotency key is required.",
      );
    const objects = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, input.storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const object = objects[0];
    if (!object || object.state !== "clean" || object.scanStatus !== "clean")
      throw new DocumentPipelineValidationError(
        "Document intake requires a clean, scanned private-storage object.",
      );
    if (!this.textProvider.supports(object.mimeType))
      throw new DocumentPipelineValidationError(
        `The configured provider ${this.textProvider.key} does not support ${object.mimeType}.`,
      );
    assertTenantObjectKey(object.objectKey, context.organizationId);
    const maxAttempts = Math.min(Math.max(input.maxAttempts ?? 3, 1), 10);
    const hash = requestHash({
      storageObjectId: input.storageObjectId,
      caseId: input.caseId ?? null,
      sourceSystem: input.sourceSystem ?? "direct_upload",
      supersedesSourceDocumentId: input.supersedesSourceDocumentId ?? null,
      pipelineVersion: DOCUMENT_PIPELINE_VERSION,
      maxAttempts,
    });
    const priorKeys = await this.database
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(schema.idempotencyKeys.organizationId, context.organizationId),
          eq(schema.idempotencyKeys.scope, "document-intake"),
          eq(schema.idempotencyKeys.key, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (priorKeys[0]) {
      if (priorKeys[0].requestHash !== hash) throw new IdempotencyConflictError();
      return priorKeys[0].responseJson as {
        sourceDocumentId: string;
        jobId: string;
        duplicate: boolean;
      };
    }
    if (input.caseId) {
      const cases = await this.database
        .select({ id: schema.renewalCases.id })
        .from(schema.renewalCases)
        .where(
          and(
            eq(schema.renewalCases.id, input.caseId),
            eq(schema.renewalCases.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!cases[0]) throw new TenantResourceNotFoundError("Renewal case");
    }
    let parent: typeof schema.sourceDocuments.$inferSelect | undefined;
    if (input.supersedesSourceDocumentId) {
      const parents = await this.database
        .select()
        .from(schema.sourceDocuments)
        .where(
          and(
            eq(schema.sourceDocuments.id, input.supersedesSourceDocumentId),
            eq(schema.sourceDocuments.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      parent = parents[0];
      if (!parent) throw new TenantResourceNotFoundError("Superseded document");
      if ((parent.caseId ?? undefined) !== input.caseId)
        throw new DocumentPipelineValidationError(
          "A superseding document must remain in the same renewal case.",
        );
    }
    const duplicateDocuments = await this.database
      .select()
      .from(schema.sourceDocuments)
      .where(
        and(
          eq(schema.sourceDocuments.organizationId, context.organizationId),
          eq(schema.sourceDocuments.sha256, object.sha256),
        ),
      )
      .limit(1);
    if (duplicateDocuments[0]) {
      const jobs = await this.database
        .select({ id: schema.documentProcessingJobs.id })
        .from(schema.documentProcessingJobs)
        .where(
          and(
            eq(
              schema.documentProcessingJobs.sourceDocumentId,
              duplicateDocuments[0].id,
            ),
            eq(schema.documentProcessingJobs.organizationId, context.organizationId),
            eq(schema.documentProcessingJobs.pipelineVersion, DOCUMENT_PIPELINE_VERSION),
          ),
        )
        .limit(1);
      if (!jobs[0])
        throw new DocumentPipelineStateError(
          "The matching source document exists without the requested pipeline job.",
        );
      const response = {
        sourceDocumentId: duplicateDocuments[0].id,
        jobId: jobs[0].id,
        duplicate: true,
      };
      await this.recordIdempotency(context, input.idempotencyKey, hash, response);
      return response;
    }
    const sourceDocumentId = randomUUID();
    const jobId = randomUUID();
    const receivedAt = at(this.clock);
    const response = { sourceDocumentId, jobId, duplicate: false };
    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.sourceDocuments).values({
        id: sourceDocumentId,
        ...tenantRecord(context, receivedAt),
        caseId: input.caseId,
        storageObjectId: object.id,
        supersedesSourceDocumentId: parent?.id,
        versionNumber: parent ? parent.versionNumber + 1 : 1,
        documentType: "unclassified",
        filename: object.originalFilename,
        mimeType: object.mimeType,
        storageKey: object.objectKey,
        sha256: object.sha256,
        sourceSystem: input.sourceSystem ?? "direct_upload",
        receivedAt,
        processingStatus: "queued",
        synthetic: false,
      });
      await transaction.insert(schema.documentProcessingJobs).values({
        id: jobId,
        ...tenantRecord(context, receivedAt),
        sourceDocumentId,
        pipelineVersion: DOCUMENT_PIPELINE_VERSION,
        status: "queued",
        attemptCount: 0,
        maxAttempts,
        availableAt: receivedAt,
      });
      await transaction.insert(schema.idempotencyKeys).values({
        id: randomUUID(),
        ...tenantRecord(context, receivedAt),
        scope: "document-intake",
        key: input.idempotencyKey,
        requestHash: hash,
        responseJson: response,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "document.intake_queued",
        resourceType: "source_document",
        resourceId: sourceDocumentId,
        detail: {
          jobId,
          storageObjectId: object.id,
          sha256: object.sha256,
          pipelineVersion: DOCUMENT_PIPELINE_VERSION,
          supersedesSourceDocumentId: parent?.id ?? null,
        },
        occurredAt: receivedAt,
      });
    });
    return response;
  }

  private async recordIdempotency(
    context: TenantContext,
    key: string,
    hash: string,
    response: Record<string, unknown>,
  ) {
    const recordedAt = at(this.clock);
    await this.database.insert(schema.idempotencyKeys).values({
      id: randomUUID(),
      ...tenantRecord(context, recordedAt),
      scope: "document-intake",
      key,
      requestHash: hash,
      responseJson: response,
    });
  }

  private assertWorker(context: TenantContext) {
    assertAuthorized(context, {
      action: "update",
      resource: "document_processing_job",
      resourceOrganizationId: context.organizationId,
    });
    for (const [resource, action] of [
      ["source_document", "update"],
      ["document_processing_attempt", "create"],
      ["document_processing_attempt", "update"],
      ["document_extraction_run", "create"],
      ["source_passage", "create"],
      ["extracted_field", "create"],
    ] as const)
      assertAuthorized(context, {
        action,
        resource,
        resourceOrganizationId: context.organizationId,
      });
    if (context.principalType !== "service_account")
      throw new AuthorizationDeniedError(
        "Document processing requires an explicitly scoped service account.",
      );
  }

  private async reapExpiredFinalLeases(context: TenantContext) {
    const now = at(this.clock);
    const stale = await this.database
      .select()
      .from(schema.documentProcessingJobs)
      .where(
        and(
          eq(schema.documentProcessingJobs.organizationId, context.organizationId),
          eq(schema.documentProcessingJobs.status, "running"),
          lte(schema.documentProcessingJobs.leaseExpiresAt, now),
        ),
      );
    for (const job of stale.filter((candidate) => candidate.attemptCount >= candidate.maxAttempts)) {
      await this.database.transaction(async (transaction) => {
        await transaction
          .update(schema.documentProcessingAttempts)
          .set({
            status: "failed_terminal",
            errorCode: "worker_lease_expired",
            errorMessage: "The worker lease expired on the final permitted attempt.",
            finishedAt: now,
            updatedAt: now,
            updatedBy: context.actorSubject,
            revision: job.revision + 1,
          })
          .where(
            and(
              eq(schema.documentProcessingAttempts.jobId, job.id),
              eq(schema.documentProcessingAttempts.attemptNumber, job.attemptCount),
              eq(schema.documentProcessingAttempts.status, "running"),
            ),
          );
        await transaction
          .update(schema.documentProcessingJobs)
          .set({
            status: "dead_letter",
            deadLetteredAt: now,
            lastErrorCode: "worker_lease_expired",
            lastErrorMessage: "The worker lease expired on the final permitted attempt.",
            leaseOwner: null,
            leaseExpiresAt: null,
            updatedAt: now,
            updatedBy: context.actorSubject,
            revision: job.revision + 1,
          })
          .where(eq(schema.documentProcessingJobs.id, job.id));
        await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
          action: "document.job_dead_lettered",
          resourceType: "document_processing_job",
          resourceId: job.id,
          detail: { reason: "worker_lease_expired", attemptCount: job.attemptCount },
          occurredAt: now,
        });
      });
    }
  }

  private async leaseNextJob(
    context: TenantContext,
    workerId: string,
    leaseSeconds: number,
  ): Promise<LeasedJob | undefined> {
    this.assertWorker(context);
    if (!workerId.trim())
      throw new DocumentPipelineValidationError("A worker identifier is required.");
    await this.reapExpiredFinalLeases(context);
    const now = at(this.clock);
    const leaseExpiresAt = new Date(
      this.clock().getTime() + Math.min(Math.max(leaseSeconds, 10), 300) * 1000,
    ).toISOString();
    return this.database.transaction(async (transaction) => {
      const candidates = await transaction
        .select()
        .from(schema.documentProcessingJobs)
        .where(
          and(
            eq(schema.documentProcessingJobs.organizationId, context.organizationId),
            lt(
              schema.documentProcessingJobs.attemptCount,
              schema.documentProcessingJobs.maxAttempts,
            ),
            or(
              and(
                inArray(schema.documentProcessingJobs.status, [
                  "queued",
                  "retry_scheduled",
                ]),
                lte(schema.documentProcessingJobs.availableAt, now),
              ),
              and(
                eq(schema.documentProcessingJobs.status, "running"),
                lte(schema.documentProcessingJobs.leaseExpiresAt, now),
              ),
            ),
          ),
        )
        .orderBy(asc(schema.documentProcessingJobs.availableAt), asc(schema.documentProcessingJobs.createdAt))
        .limit(1);
      const job = candidates[0];
      if (!job) return undefined;
      if (job.status === "running")
        await transaction
          .update(schema.documentProcessingAttempts)
          .set({
            status: "failed_retryable",
            errorCode: "worker_lease_expired",
            errorMessage: "The previous worker lease expired before completion.",
            finishedAt: now,
            updatedAt: now,
            updatedBy: context.actorSubject,
            revision: job.revision + 1,
          })
          .where(
            and(
              eq(schema.documentProcessingAttempts.jobId, job.id),
              eq(schema.documentProcessingAttempts.attemptNumber, job.attemptCount),
              eq(schema.documentProcessingAttempts.status, "running"),
            ),
          );
      const attemptNumber = job.attemptCount + 1;
      const leased = await transaction
        .update(schema.documentProcessingJobs)
        .set({
          status: "running",
          attemptCount: attemptNumber,
          leaseOwner: workerId,
          leaseExpiresAt,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: job.revision + 1,
        })
        .where(
          and(
            eq(schema.documentProcessingJobs.id, job.id),
            eq(schema.documentProcessingJobs.organizationId, context.organizationId),
            eq(schema.documentProcessingJobs.revision, job.revision),
          ),
        )
        .returning();
      if (!leased[0]) return undefined;
      const attemptId = randomUUID();
      await transaction.insert(schema.documentProcessingAttempts).values({
        id: attemptId,
        ...tenantRecord(context, now),
        jobId: job.id,
        attemptNumber,
        workerId,
        status: "running",
        providerKey: this.textProvider.key,
        providerVersion: this.textProvider.version,
        startedAt: now,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "document.job_leased",
        resourceType: "document_processing_job",
        resourceId: job.id,
        detail: { workerId, attemptNumber, leaseExpiresAt },
        occurredAt: now,
      });
      return {
        job: leased[0],
        attemptId,
        attemptNumber,
        startedAt: now,
      };
    });
  }

  async processNext(
    context: TenantContext,
    input: { workerId: string; leaseSeconds?: number; retryDelayMs?: number },
  ) {
    const lease = await this.leaseNextJob(
      context,
      input.workerId,
      input.leaseSeconds ?? 60,
    );
    if (!lease) return { status: "idle" as const };
    try {
      const rows = await this.database
        .select({ document: schema.sourceDocuments, object: schema.storageObjects })
        .from(schema.sourceDocuments)
        .innerJoin(
          schema.storageObjects,
          eq(schema.sourceDocuments.storageObjectId, schema.storageObjects.id),
        )
        .where(
          and(
            eq(schema.sourceDocuments.id, lease.job.sourceDocumentId),
            eq(schema.sourceDocuments.organizationId, context.organizationId),
            eq(schema.storageObjects.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row) throw new DocumentPipelineValidationError("The source document or storage object is missing.");
      if (row.object.state !== "clean" || row.object.scanStatus !== "clean")
        throw new DocumentPipelineValidationError("The source object is no longer clean and processable.");
      assertTenantObjectKey(row.object.objectKey, context.organizationId);
      const body = await this.storage.read(row.object.objectKey);
      if (body.byteLength !== row.object.sizeBytes || sha256(body) !== row.object.sha256)
        throw new DocumentPipelineValidationError("Stored document bytes no longer match their registered size and hash.");
      const providerDocument = await this.textProvider.extract({
        body,
        filename: row.document.filename,
        mimeType: row.document.mimeType,
        sha256: row.document.sha256 ?? row.object.sha256,
      });
      const classification = this.classifier.classify(providerDocument);
      const extractors = this.extractors.filter((extractor) =>
        extractor.supports(classification.documentType),
      );
      if (!extractors.length)
        throw new DocumentPipelineValidationError(
          `No versioned extractor is registered for ${classification.documentType}.`,
        );
      const result = await this.completeJob(
        context,
        lease,
        row.document,
        providerDocument,
        classification,
        extractors,
      );
      return { status: "succeeded" as const, ...result };
    } catch (error) {
      const failure = await this.failJob(
        context,
        lease,
        error,
        input.retryDelayMs ?? 30_000,
      );
      return { status: failure.status, jobId: lease.job.id, error: failure.error };
    }
  }

  private async completeJob(
    context: TenantContext,
    lease: LeasedJob,
    document: typeof schema.sourceDocuments.$inferSelect,
    providerDocument: ProviderDocument,
    classification: ReturnType<DocumentClassifier["classify"]>,
    extractors: VersionedDocumentExtractor[],
  ) {
    const completedAt = at(this.clock);
    const passageIds = new Map<string, string>();
    for (const passage of providerDocument.passages)
      passageIds.set(`${passage.pageNumber}:${passage.segment}`, randomUUID());
    let candidateCount = 0;
    const runIds: string[] = [];
    await this.database.transaction(async (transaction) => {
      for (const extractor of extractors) {
        const runId = randomUUID();
        runIds.push(runId);
        const candidates = extractor.extract({
          documentType: classification.documentType,
          document: providerDocument,
        });
        candidateCount += candidates.length;
        await transaction.insert(schema.documentExtractionRuns).values({
          id: runId,
          ...tenantRecord(context, lease.startedAt),
          sourceDocumentId: document.id,
          jobId: lease.job.id,
          providerKey: this.textProvider.key,
          providerVersion: this.textProvider.version,
          extractorKey: extractor.key,
          extractorVersion: extractor.version,
          inputSha256: document.sha256!,
          modelDerived: providerDocument.modelDerived || extractor.modelDerived,
          pageCount: providerDocument.pageCount,
          warnings: providerDocument.warnings,
          status: "succeeded",
          startedAt: lease.startedAt,
          completedAt,
        });
        for (const passage of providerDocument.passages) {
          const passageId = passageIds.get(`${passage.pageNumber}:${passage.segment}`)!;
          await transaction
            .insert(schema.sourcePassages)
            .values({
              id: passageId,
              ...tenantRecord(context, completedAt),
              sourceDocumentId: document.id,
              extractionRunId: runId,
              pageNumber: passage.pageNumber,
              segment: passage.segment,
              region: passage.region,
              passageKind: passage.kind,
              textContent: passage.text,
              extractorVersion: `${this.textProvider.key}@${this.textProvider.version}`,
              confidence: null,
              confirmationStatus: "unreviewed",
            })
            .onConflictDoNothing({ target: schema.sourcePassages.id });
        }
        const ordinals = new Map<string, number>();
        for (const candidate of candidates) {
          const ordinal = (ordinals.get(candidate.fieldKey) ?? 0) + 1;
          ordinals.set(candidate.fieldKey, ordinal);
          await transaction.insert(schema.extractedFields).values({
            id: randomUUID(),
            ...tenantRecord(context, completedAt),
            sourceDocumentId: document.id,
            extractionRunId: runId,
            sourcePassageId: passageIds.get(
              `${candidate.passage.pageNumber}:${candidate.passage.segment}`,
            ),
            fieldKey: candidate.fieldKey,
            fieldLabel: candidate.fieldLabel,
            candidateOrdinal: ordinal,
            value: candidate.value,
            valueType: candidate.valueType,
            confidence: candidate.confidence.toFixed(4),
            modelDerived: providerDocument.modelDerived || extractor.modelDerived,
          });
        }
      }
      await transaction
        .update(schema.sourceDocuments)
        .set({
          documentType: classification.documentType,
          classificationConfidence: classification.confidence.toFixed(4),
          classifierKey: classification.classifierKey,
          classifierVersion: classification.classifierVersion,
          processingStatus: candidateCount ? "review_required" : "no_candidates",
          updatedAt: completedAt,
          updatedBy: context.actorSubject,
          revision: document.revision + 1,
        })
        .where(eq(schema.sourceDocuments.id, document.id));
      await transaction
        .update(schema.documentProcessingAttempts)
        .set({
          status: "succeeded",
          finishedAt: completedAt,
          updatedAt: completedAt,
          updatedBy: context.actorSubject,
          revision: lease.attemptNumber + 1,
        })
        .where(eq(schema.documentProcessingAttempts.id, lease.attemptId));
      await transaction
        .update(schema.documentProcessingJobs)
        .set({
          status: "succeeded",
          completedAt,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
          updatedAt: completedAt,
          updatedBy: context.actorSubject,
          revision: lease.job.revision + 1,
        })
        .where(eq(schema.documentProcessingJobs.id, lease.job.id));
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "document.processing_succeeded",
        resourceType: "source_document",
        resourceId: document.id,
        detail: {
          jobId: lease.job.id,
          attemptNumber: lease.attemptNumber,
          documentType: classification.documentType,
          classificationConfidence: classification.confidence,
          candidateCount,
          runIds,
          modelDerived: providerDocument.modelDerived,
          warnings: providerDocument.warnings,
        },
        occurredAt: completedAt,
      });
    });
    return {
      jobId: lease.job.id,
      sourceDocumentId: document.id,
      documentType: classification.documentType,
      candidateCount,
      runIds,
    };
  }

  private async failJob(
    context: TenantContext,
    lease: LeasedJob,
    error: unknown,
    retryDelayMs: number,
  ) {
    const failure = providerError(error);
    const failedAt = at(this.clock);
    const shouldRetry = failure.retryable && lease.attemptNumber < lease.job.maxAttempts;
    const status = shouldRetry ? "retry_scheduled" : "dead_letter";
    const availableAt = new Date(
      this.clock().getTime() + Math.max(0, retryDelayMs) * lease.attemptNumber,
    ).toISOString();
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(schema.documentProcessingAttempts)
        .set({
          status: shouldRetry ? "failed_retryable" : "failed_terminal",
          errorCode: failure.code,
          errorMessage: failure.message,
          finishedAt: failedAt,
          updatedAt: failedAt,
          updatedBy: context.actorSubject,
          revision: lease.attemptNumber + 1,
        })
        .where(eq(schema.documentProcessingAttempts.id, lease.attemptId));
      await transaction
        .update(schema.documentProcessingJobs)
        .set({
          status,
          availableAt,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: failure.code,
          lastErrorMessage: failure.message,
          deadLetteredAt: shouldRetry ? null : failedAt,
          updatedAt: failedAt,
          updatedBy: context.actorSubject,
          revision: lease.job.revision + 1,
        })
        .where(eq(schema.documentProcessingJobs.id, lease.job.id));
      await transaction
        .update(schema.sourceDocuments)
        .set({
          processingStatus: status,
          updatedAt: failedAt,
          updatedBy: context.actorSubject,
        })
        .where(eq(schema.sourceDocuments.id, lease.job.sourceDocumentId));
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: shouldRetry
          ? "document.processing_retry_scheduled"
          : "document.processing_dead_lettered",
        resourceType: "document_processing_job",
        resourceId: lease.job.id,
        detail: {
          sourceDocumentId: lease.job.sourceDocumentId,
          attemptNumber: lease.attemptNumber,
          errorCode: failure.code,
          retryable: failure.retryable,
          nextAvailableAt: shouldRetry ? availableAt : null,
        },
        occurredAt: failedAt,
      });
    });
    return { status: status as "retry_scheduled" | "dead_letter", error: failure };
  }

  async reviewCandidate(
    context: TenantContext,
    input: {
      extractedFieldId: string;
      action: "confirmed" | "corrected" | "rejected";
      reviewedValue?: string;
      note?: string;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "extracted_field_review",
      resourceOrganizationId: context.organizationId,
    });
    if (context.principalType !== "membership")
      throw new AuthorizationDeniedError(
        "Extracted facts require review by an authenticated organization member.",
      );
    const rows = await this.database
      .select({ field: schema.extractedFields, document: schema.sourceDocuments })
      .from(schema.extractedFields)
      .innerJoin(
        schema.sourceDocuments,
        eq(schema.extractedFields.sourceDocumentId, schema.sourceDocuments.id),
      )
      .where(
        and(
          eq(schema.extractedFields.id, input.extractedFieldId),
          eq(schema.extractedFields.organizationId, context.organizationId),
          eq(schema.sourceDocuments.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) throw new TenantResourceNotFoundError("Extracted field");
    assertAuthorized(context, {
      action: "create",
      resource: "document_fact",
      resourceOrganizationId: context.organizationId,
      caseId: row.document.caseId ?? undefined,
    });
    const reviewedValue =
      input.action === "confirmed"
        ? row.field.value
        : input.action === "corrected"
          ? input.reviewedValue?.trim()
          : undefined;
    if (input.action === "corrected" && !reviewedValue)
      throw new DocumentPipelineValidationError(
        "A corrected value is required when correcting an extracted field.",
      );
    if (input.action === "corrected" && !input.note?.trim())
      throw new DocumentPipelineValidationError(
        "A correction reason is required to preserve the fact history.",
      );
    const existingFacts = await this.database
      .select()
      .from(schema.documentFacts)
      .where(
        and(
          eq(schema.documentFacts.organizationId, context.organizationId),
          eq(schema.documentFacts.sourceDocumentId, row.document.id),
          eq(schema.documentFacts.factKey, row.field.fieldKey),
        ),
      )
      .orderBy(desc(schema.documentFacts.versionNumber))
      .limit(1);
    const previousFact = existingFacts[0];
    if (
      input.action === "confirmed" &&
      previousFact &&
      previousFact.value !== reviewedValue
    )
      throw new DocumentPipelineStateError(
        "A different confirmed value already exists; record an explicit correction with a reason.",
      );
    if (
      input.action !== "rejected" &&
      previousFact?.value === reviewedValue
    )
      throw new DocumentPipelineStateError(
        "This value is already the current confirmed fact.",
      );
    const reviewedAt = at(this.clock);
    const reviewId = randomUUID();
    const factId = input.action === "rejected" ? undefined : randomUUID();
    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.extractedFieldReviews).values({
        id: reviewId,
        ...tenantRecord(context, reviewedAt),
        extractedFieldId: row.field.id,
        action: input.action,
        reviewedValue,
        reviewerSubject: context.actorSubject,
        reviewerPrincipalType: context.principalType,
        note: input.note?.trim(),
        reviewedAt,
      });
      if (factId && reviewedValue)
        await transaction.insert(schema.documentFacts).values({
          id: factId,
          ...tenantRecord(context, reviewedAt),
          sourceDocumentId: row.document.id,
          extractedFieldId: row.field.id,
          reviewId,
          sourcePassageId: row.field.sourcePassageId,
          factKey: row.field.fieldKey,
          value: reviewedValue,
          versionNumber: (previousFact?.versionNumber ?? 0) + 1,
          supersedesFactId: previousFact?.id,
          confirmedBy: context.actorSubject,
          confirmedAt: reviewedAt,
          correctionReason:
            input.action === "corrected" ? input.note!.trim() : undefined,
        });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: `document.field_${input.action}`,
        resourceType: "extracted_field_review",
        resourceId: reviewId,
        detail: {
          sourceDocumentId: row.document.id,
          extractedFieldId: row.field.id,
          fieldKey: row.field.fieldKey,
          factId: factId ?? null,
          factVersion: factId ? (previousFact?.versionNumber ?? 0) + 1 : null,
          supersedesFactId: factId ? previousFact?.id ?? null : null,
          modelDerived: row.field.modelDerived,
        },
        occurredAt: reviewedAt,
      });
    });
    return {
      reviewId,
      factId,
      action: input.action,
      reviewedValue,
      versionNumber: factId ? (previousFact?.versionNumber ?? 0) + 1 : undefined,
    };
  }

  async retryDeadLetter(
    context: TenantContext,
    jobId: string,
    input: { reason: string },
  ) {
    assertAuthorized(context, {
      action: "update",
      resource: "document_processing_job",
      resourceOrganizationId: context.organizationId,
    });
    if (!input.reason.trim())
      throw new DocumentPipelineValidationError(
        "A manual retry reason is required for the audit record.",
      );
    const jobs = await this.database
      .select()
      .from(schema.documentProcessingJobs)
      .where(
        and(
          eq(schema.documentProcessingJobs.id, jobId),
          eq(schema.documentProcessingJobs.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const job = jobs[0];
    if (!job) throw new TenantResourceNotFoundError("Document processing job");
    if (job.status !== "dead_letter")
      throw new DocumentPipelineStateError(
        "Only a dead-lettered document job can be manually retried.",
      );
    if (job.maxAttempts >= 10)
      throw new DocumentPipelineStateError(
        "This job has reached the hard limit of ten processing attempts.",
      );
    const retriedAt = at(this.clock);
    return this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(schema.documentProcessingJobs)
        .set({
          status: "queued",
          maxAttempts: job.maxAttempts + 1,
          availableAt: retriedAt,
          deadLetteredAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          updatedAt: retriedAt,
          updatedBy: context.actorSubject,
          revision: job.revision + 1,
        })
        .where(
          and(
            eq(schema.documentProcessingJobs.id, job.id),
            eq(schema.documentProcessingJobs.status, "dead_letter"),
            eq(schema.documentProcessingJobs.revision, job.revision),
          ),
        )
        .returning();
      if (!updated[0])
        throw new DocumentPipelineStateError(
          "The job changed before it could be retried; refresh the workspace.",
        );
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "document.dead_letter_retried",
        resourceType: "document_processing_job",
        resourceId: job.id,
        detail: {
          reason: input.reason.trim(),
          previousAttemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts + 1,
        },
        occurredAt: retriedAt,
      });
      return updated[0];
    });
  }
}

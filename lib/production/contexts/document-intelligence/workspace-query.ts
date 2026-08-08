import { and, asc, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { DOCUMENT_PIPELINE_VERSION } from "@/lib/contracts/document-intelligence";
import { assertAuthorized } from "@/lib/production/authorization";
import type { DocumentTextProvider } from "@/lib/production/document-providers";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";
import type { StorageObjectQueryPort } from "@/lib/production/contexts/evidence-custody/storage-object-query-port";

const workspaceReadResources = [
  "renewal_case",
  "storage_object",
  "source_document",
  "document_processing_job",
  "document_processing_attempt",
  "document_extraction_run",
  "source_passage",
  "extracted_field",
  "extracted_field_review",
  "document_fact",
] as const;

export type DocumentWorkspaceQuery = QueryOperation<
  "document_intelligence.workspace",
  TenantContext
>;

export function documentWorkspaceQuery(
  context: TenantContext,
): DocumentWorkspaceQuery {
  return defineQuery({
    boundedContext: "document_intelligence",
    name: "document_intelligence.workspace",
    context,
    input: undefined,
  });
}

export interface DocumentWorkspaceQueryPort {
  execute(query: DocumentWorkspaceQuery): Promise<DocumentWorkspace>;
}

function assertWorkspaceRead(context: TenantContext, caseId?: string) {
  for (const resource of workspaceReadResources)
    assertAuthorized(context, {
      action: "read",
      resource,
      resourceOrganizationId: context.organizationId,
      caseId,
    });
}

export class DocumentWorkspaceQueryService
  implements DocumentWorkspaceQueryPort
{
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly textProvider: DocumentTextProvider,
    private readonly storageObjects: StorageObjectQueryPort,
  ) {}

  async execute(query: DocumentWorkspaceQuery) {
    const { context } = query;
    assertWorkspaceRead(context);

    if (context.assignedCaseIds?.length === 0)
      return {
        pipelineVersion: DOCUMENT_PIPELINE_VERSION,
        provider: {
          key: this.textProvider.key,
          version: this.textProvider.version,
          modelDerived: this.textProvider.modelDerived,
        },
        cases: [],
        cleanObjects: [],
        documents: [],
        jobs: [],
        attempts: [],
        runs: [],
        passages: [],
        candidates: [],
        reviews: [],
        facts: [],
      };

    const organizationId = context.organizationId;
    const cases = await this.database
      .select({
        id: schema.renewalCases.id,
        title: schema.renewalCases.title,
        status: schema.renewalCases.status,
      })
      .from(schema.renewalCases)
      .where(
        and(
          eq(schema.renewalCases.organizationId, organizationId),
          eq(schema.renewalCases.lifecycleStatus, "active"),
          context.assignedCaseIds
            ? inArray(schema.renewalCases.id, context.assignedCaseIds)
            : undefined,
        ),
      )
      .orderBy(asc(schema.renewalCases.title));
    for (const caseRecord of cases) assertWorkspaceRead(context, caseRecord.id);

    const documents = await this.database
      .select()
      .from(schema.sourceDocuments)
      .where(
        and(
          eq(schema.sourceDocuments.organizationId, organizationId),
          context.assignedCaseIds
            ? inArray(schema.sourceDocuments.caseId, context.assignedCaseIds)
            : undefined,
        ),
      )
      .orderBy(desc(schema.sourceDocuments.createdAt))
      .limit(100);
    const documentIds = documents.map((document) => document.id);
    const storageObjectIds = documents.flatMap((document) =>
      document.storageObjectId ? [document.storageObjectId] : [],
    );

    const cleanObjects = await this.storageObjects.listDocumentIntakeObjects(
      context,
      storageObjectIds,
    );

    const jobs =
      documentIds.length === 0
        ? []
        : await this.database
            .select()
            .from(schema.documentProcessingJobs)
            .where(
              and(
                eq(
                  schema.documentProcessingJobs.organizationId,
                  organizationId,
                ),
                inArray(
                  schema.documentProcessingJobs.sourceDocumentId,
                  documentIds,
                ),
              ),
            )
            .orderBy(desc(schema.documentProcessingJobs.createdAt))
            .limit(100);
    const jobIds = jobs.map((job) => job.id);

    const [attempts, runs, passages, candidates, facts] = await Promise.all([
      jobIds.length === 0
        ? Promise.resolve([])
        : this.database
            .select()
            .from(schema.documentProcessingAttempts)
            .where(
              and(
                eq(
                  schema.documentProcessingAttempts.organizationId,
                  organizationId,
                ),
                inArray(schema.documentProcessingAttempts.jobId, jobIds),
              ),
            )
            .orderBy(desc(schema.documentProcessingAttempts.startedAt))
            .limit(200),
      documentIds.length === 0
        ? Promise.resolve([])
        : this.database
            .select()
            .from(schema.documentExtractionRuns)
            .where(
              and(
                eq(
                  schema.documentExtractionRuns.organizationId,
                  organizationId,
                ),
                inArray(
                  schema.documentExtractionRuns.sourceDocumentId,
                  documentIds,
                ),
              ),
            )
            .orderBy(desc(schema.documentExtractionRuns.createdAt))
            .limit(100),
      documentIds.length === 0
        ? Promise.resolve([])
        : this.database
            .select()
            .from(schema.sourcePassages)
            .where(
              and(
                eq(schema.sourcePassages.organizationId, organizationId),
                inArray(schema.sourcePassages.sourceDocumentId, documentIds),
              ),
            )
            .orderBy(
              asc(schema.sourcePassages.pageNumber),
              asc(schema.sourcePassages.segment),
            )
            .limit(500),
      documentIds.length === 0
        ? Promise.resolve([])
        : this.database
            .select()
            .from(schema.extractedFields)
            .where(
              and(
                eq(schema.extractedFields.organizationId, organizationId),
                inArray(schema.extractedFields.sourceDocumentId, documentIds),
              ),
            )
            .orderBy(
              asc(schema.extractedFields.fieldKey),
              asc(schema.extractedFields.candidateOrdinal),
            )
            .limit(500),
      documentIds.length === 0
        ? Promise.resolve([])
        : this.database
            .select()
            .from(schema.documentFacts)
            .where(
              and(
                eq(schema.documentFacts.organizationId, organizationId),
                inArray(schema.documentFacts.sourceDocumentId, documentIds),
              ),
            )
            .orderBy(
              asc(schema.documentFacts.factKey),
              desc(schema.documentFacts.versionNumber),
            )
            .limit(500),
    ]);
    const candidateIds = candidates.map((candidate) => candidate.id);
    const reviews =
      candidateIds.length === 0
        ? []
        : await this.database
            .select()
            .from(schema.extractedFieldReviews)
            .where(
              and(
                eq(schema.extractedFieldReviews.organizationId, organizationId),
                inArray(
                  schema.extractedFieldReviews.extractedFieldId,
                  candidateIds,
                ),
              ),
            )
            .orderBy(desc(schema.extractedFieldReviews.reviewedAt))
            .limit(500);

    return {
      pipelineVersion: DOCUMENT_PIPELINE_VERSION,
      provider: {
        key: this.textProvider.key,
        version: this.textProvider.version,
        modelDerived: this.textProvider.modelDerived,
      },
      cases,
      cleanObjects: cleanObjects.map((object) => ({
        ...object,
        providerSupported: this.textProvider.supports(object.mimeType),
      })),
      documents,
      jobs,
      attempts,
      runs,
      passages,
      candidates,
      reviews,
      facts,
    };
  }
}

export type DocumentWorkspace = Awaited<
  ReturnType<DocumentWorkspaceQueryService["execute"]>
>;

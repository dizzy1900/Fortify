import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import type { ExternalCaseAccessIssuer } from "@/lib/production/contexts/identity-access/external-case-access-port";
import { hashOpaqueSecret } from "@/lib/production/kernel/opaque-secret";
import type { MarketDeliveryProvider } from "@/lib/production/market-delivery";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  appendAudit,
  digest,
  IdempotencyConflictError,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export class RecognitionValidationError extends Error {
  constructor(message: string) { super(message); this.name = "RecognitionValidationError"; }
}
export class RecognitionStateError extends Error {
  constructor(message: string) { super(message); this.name = "RecognitionStateError"; }
}

export type EvidenceDisposition = "accepted" | "partially_accepted" | "clarification_required" | "rejected" | "stale" | "wrong_scope" | "unsupported_source" | "unverifiable" | "not_applicable";
export type ModelDisposition = "input_accepted" | "input_modified" | "mapping_rejected" | "model_does_not_represent_intervention" | "model_version_changed" | "no_response";
export type RatingDisposition = "filed_discount_applied" | "factor_changed" | "discount_not_applicable" | "filing_does_not_recognise_intervention" | "insufficient_evidence" | "unknown";
export type UnderwritingDisposition = "classification_changed" | "reconsideration_opened" | "terms_changed" | "capacity_offered" | "referred" | "no_change" | "declined" | "nonrenewed" | "quote_review_initiated";
export type PlacementDisposition = "quote" | "revised_quote" | "bind" | "renewal" | "no_quote" | "withdrawn" | "fair_plan_transition" | "voluntary_market_transition" | "lost_to_another_option";
export type FundingDisposition = "approved" | "conditionally_approved" | "milestone_approved" | "milestone_rejected" | "disbursement_exported" | "programme_ineligible";

type ResponseBasis = {
  submissionVersionId: string;
  sourceAuthority: string;
  sourceReference: string;
  originalLanguage: string;
  normalizedReason: string;
  humanConfirmed: boolean;
  supersedesEventId?: string;
};

const required = (value: string | undefined, label: string) => {
  if (!value?.trim()) throw new RecognitionValidationError(`${label} is required.`);
  return value.trim();
};
const member = (context: TenantContext, confirmed: boolean, action: string) => {
  if (context.principalType !== "membership" || !confirmed)
    throw new RecognitionStateError(`${action} requires explicit confirmation by a human organization member.`);
};
const sha256 = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

export class RecognitionSubmissionService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly deliveryProvider: MarketDeliveryProvider,
    private readonly identity: ExternalCaseAccessIssuer,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async prepareSubmission(context: TenantContext, idempotencyKey: string, input: {
    submissionVersionId: string;
    playbookVersionId: string;
    profileVersionId: string;
    commitmentVersionId?: string;
    mappingIds: string[];
    requestedAction: string;
    destinationLabel: string;
    deliveryMethod: "secure_review_link" | "encrypted_email" | "manual_export" | "provider_api";
    readinessStatus: "ready_for_human_confirmation" | "ready_with_caveats";
    blockerSnapshot: string[];
    caveatSnapshot: string[];
    humanConfirmed: boolean;
  }) {
    member(context, input.humanConfirmed, "Recognition submission preparation");
    if (!idempotencyKey.trim()) throw new IdempotencyConflictError();
    if (input.blockerSnapshot.length) throw new RecognitionStateError("Blocked readiness cannot become a recognition submission.");
    const requestHash = digest({ ...input, requestedAction: required(input.requestedAction, "Requested action"), destinationLabel: required(input.destinationLabel, "Destination") });
    const replay = await this.idempotent(context, "recognition_submission.prepare", idempotencyKey, requestHash);
    if (replay) return replay;

    const bundle = await this.submissionBundle(context, input.submissionVersionId);
    assertAuthorized(context, { action: "create", resource: "recognition_submission_binding", resourceOrganizationId: context.organizationId, caseId: bundle.submission.caseId });
    if (bundle.version.status !== "confirmed" || !bundle.version.confirmedBy || !bundle.version.manifestHash)
      throw new RecognitionStateError("Only a human-confirmed immutable submission version with a manifest hash can be bound.");
    if (!bundle.artifacts.length) throw new RecognitionStateError("The submission version has no immutable artifacts.");
    for (const row of bundle.artifacts) {
      const [head, body] = await Promise.all([this.storage.head(row.storage.objectKey), this.storage.read(row.storage.objectKey)]);
      if (!head || head.sha256 !== row.artifact.sha256 || head.sizeBytes !== row.artifact.sizeBytes || sha256(body) !== row.artifact.sha256)
        throw new RecognitionStateError(`Artifact ${row.artifact.filename} failed exact-byte readback.`);
    }
    const [caseLink, profile] = await Promise.all([
      this.database.select().from(schema.casePlaybookLinks).where(and(eq(schema.casePlaybookLinks.organizationId, context.organizationId), eq(schema.casePlaybookLinks.caseId, bundle.submission.caseId), eq(schema.casePlaybookLinks.playbookVersionId, input.playbookVersionId), eq(schema.casePlaybookLinks.destinationMarketId, bundle.submission.marketId!))).orderBy(desc(schema.casePlaybookLinks.linkedAt)).limit(1),
      this.database.select().from(schema.targetProfileVersions).where(and(eq(schema.targetProfileVersions.organizationId, context.organizationId), eq(schema.targetProfileVersions.id, input.profileVersionId), eq(schema.targetProfileVersions.status, "published"))).limit(1),
    ]);
    if (!caseLink[0]) throw new RecognitionStateError("The exact playbook version must be linked to this case and destination market.");
    if (!profile[0]) throw new RecognitionStateError("The target profile version must be published in the active tenant.");
    if (input.commitmentVersionId) {
      const commitment = await this.database.select().from(schema.marketCommitmentVersions).where(and(eq(schema.marketCommitmentVersions.organizationId, context.organizationId), eq(schema.marketCommitmentVersions.id, input.commitmentVersionId), eq(schema.marketCommitmentVersions.profileVersionId, input.profileVersionId), eq(schema.marketCommitmentVersions.status, "published"))).limit(1);
      if (!commitment[0]) throw new RecognitionStateError("The commitment must be published and pinned to the submitted target profile.");
    }
    const mappingSnapshots = await this.mappingSnapshots(context, bundle.submission.caseId, input.mappingIds);
    const at = this.clock().toISOString(), bindingId = randomUUID();
    const response = { bindingId, submissionVersionId: input.submissionVersionId, manifestHash: bundle.version.manifestHash, artifactHashes: bundle.artifacts.map(({ artifact }) => ({ filename: artifact.filename, sha256: artifact.sha256 })), mappingCount: mappingSnapshots.length, readinessStatus: input.readinessStatus, replayed: false };
    await this.database.transaction(async (tx) => {
      const db = tx as unknown as ProductionDatabaseLike;
      await db.insert(schema.recognitionSubmissionBindings).values({
        id: bindingId,
        ...tenantRecord(context, at),
        submissionVersionId: input.submissionVersionId,
        playbookVersionId: input.playbookVersionId,
        profileVersionId: input.profileVersionId,
        commitmentVersionId: input.commitmentVersionId,
        requestedAction: required(input.requestedAction, "Requested action"),
        destinationLabel: required(input.destinationLabel, "Destination"),
        deliveryMethod: input.deliveryMethod,
        readinessStatus: input.readinessStatus,
        blockerSnapshot: input.blockerSnapshot,
        caveatSnapshot: input.caveatSnapshot,
        preparedBy: context.actorSubject,
        preparedAt: at,
        humanConfirmed: true,
      });
      if (mappingSnapshots.length) await db.insert(schema.recognitionSubmissionMappings).values(mappingSnapshots.map((row) => ({ id: randomUUID(), ...tenantRecord(context, at), submissionVersionId: input.submissionVersionId, mappingId: row.mappingId, stateAtSubmission: row.state, acceptedValueSnapshot: row.acceptedValue })));
      await appendAudit(db, context, { action: "recognition_submission.prepared", resourceType: "recognition_submission_binding", resourceId: bindingId, detail: { caseId: bundle.submission.caseId, submissionVersionId: input.submissionVersionId, playbookVersionId: input.playbookVersionId, profileVersionId: input.profileVersionId, commitmentVersionId: input.commitmentVersionId ?? null, mappingCount: mappingSnapshots.length, artifactHashes: response.artifactHashes, exactByteReadback: true, outcomeImplied: false }, occurredAt: at });
      await db.insert(schema.idempotencyKeys).values({ id: randomUUID(), ...tenantRecord(context, at), scope: "recognition_submission.prepare", key: idempotencyKey, requestHash, responseJson: response });
    });
    return response;
  }

  async deliverSubmission(context: TenantContext, idempotencyKey: string, input: { submissionVersionId: string; destination: string; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Recognition submission delivery");
    const bundle = await this.submissionBundle(context, input.submissionVersionId);
    assertAuthorized(context, { action: "create", resource: "submission_delivery", resourceOrganizationId: context.organizationId, caseId: bundle.submission.caseId });
    const bindings = await this.database.select().from(schema.recognitionSubmissionBindings).where(and(eq(schema.recognitionSubmissionBindings.organizationId, context.organizationId), eq(schema.recognitionSubmissionBindings.submissionVersionId, input.submissionVersionId))).limit(1);
    if (!bindings[0]) throw new RecognitionStateError("Prepare and confirm the recognition binding before delivery.");
    const requestHash = digest({ submissionVersionId: input.submissionVersionId, destination: required(input.destination, "Delivery destination"), method: bindings[0].deliveryMethod, manifestHash: bundle.version.manifestHash });
    const replay = await this.idempotent(context, "recognition_submission.deliver", idempotencyKey, requestHash);
    if (replay) return replay;
    const prior = await this.database.select().from(schema.submissionDeliveries).where(and(eq(schema.submissionDeliveries.organizationId, context.organizationId), eq(schema.submissionDeliveries.submissionVersionId, input.submissionVersionId))).orderBy(desc(schema.submissionDeliveries.attemptNumber)).limit(1);
    const at = this.clock().toISOString(), deliveryId = randomUUID(), attemptNumber = (prior[0]?.attemptNumber ?? 0) + 1;
    const artifactHashes = bundle.artifacts.map(({ artifact }) => ({ filename: artifact.filename, sha256: artifact.sha256 }));
    let delivered: Awaited<ReturnType<MarketDeliveryProvider["deliver"]>>;
    try {
      delivered = await this.deliveryProvider.deliver({ organizationId: context.organizationId, submissionVersionId: input.submissionVersionId, destination: required(input.destination, "Delivery destination"), deliveryMethod: bindings[0].deliveryMethod as "secure_review_link" | "encrypted_email" | "manual_export" | "provider_api", requestHash, artifactHashes, attemptedAt: at });
    } catch (error) {
      const failureCode = error instanceof Error ? error.message.slice(0, 240) : "delivery_provider_failed";
      await this.database.transaction(async (tx) => {
        const db = tx as unknown as ProductionDatabaseLike;
        await db.insert(schema.submissionDeliveries).values({ id: deliveryId, ...tenantRecord(context, at), submissionVersionId: input.submissionVersionId, attemptNumber, deliveryMethod: bindings[0].deliveryMethod, destination: input.destination, providerKey: this.deliveryProvider.key, status: "failed", failureCode, deliveredBy: context.actorSubject, attemptedAt: at, requestHash, supersedesDeliveryId: prior[0]?.id });
        await appendAudit(db, context, { action: "recognition_submission.delivery_failed", resourceType: "submission_delivery", resourceId: deliveryId, detail: { submissionVersionId: input.submissionVersionId, attemptNumber, providerKey: this.deliveryProvider.key, failureCode, deliveryClaimed: false }, occurredAt: at });
      });
      throw new RecognitionStateError(failureCode);
    }
    const receiptHash = sha256(delivered.receiptBody), objectKey = `tenants/${context.organizationId}/generated/delivery-receipts/${deliveryId}.json`;
    await this.storage.put({ key: objectKey, body: delivered.receiptBody, mimeType: "application/json", sha256: receiptHash });
    const [head, readback] = await Promise.all([this.storage.head(objectKey), this.storage.read(objectKey)]);
    if (!head || head.sha256 !== receiptHash || sha256(readback) !== receiptHash) { await this.storage.delete(objectKey); throw new RecognitionStateError("Delivery receipt exact-byte storage readback failed."); }
    const storageObjectId = randomUUID(), receiptId = randomUUID();
    const response = { deliveryId, receiptId, status: "delivered", attemptNumber, providerReference: delivered.providerReference, receiptHash, replayed: false };
    try {
      await this.database.transaction(async (tx) => {
        const db = tx as unknown as ProductionDatabaseLike;
        await db.insert(schema.storageObjects).values({ id: storageObjectId, ...tenantRecord(context, at), provider: this.storage.provider, bucket: this.storage.bucket, objectKey, originalFilename: `${deliveryId}.json`, mimeType: "application/json", sizeBytes: delivered.receiptBody.byteLength, sha256: receiptHash, checksumAlgorithm: "sha256", encryptionMode: head.encryptionMode, state: "clean", scanStatus: "clean" });
        await db.insert(schema.malwareScanResults).values({ id: randomUUID(), ...tenantRecord(context, at), storageObjectId, scanner: "fortify-internal-generator", engineVersion: "fortify-delivery-receipt-1", status: "clean", findings: [], scannedAt: at });
        await db.insert(schema.submissionDeliveries).values({ id: deliveryId, ...tenantRecord(context, at), submissionVersionId: input.submissionVersionId, attemptNumber, deliveryMethod: bindings[0].deliveryMethod, destination: input.destination, providerKey: this.deliveryProvider.key, status: "delivered", providerReference: delivered.providerReference, deliveredBy: context.actorSubject, attemptedAt: at, deliveredAt: delivered.deliveredAt, requestHash, supersedesDeliveryId: prior[0]?.id });
        await db.insert(schema.deliveryReceipts).values({ id: receiptId, ...tenantRecord(context, at), deliveryId, storageObjectId, receiptType: delivered.receiptType, receiptHash, sourceAuthority: delivered.sourceAuthority, sourceReference: delivered.sourceReference, receivedAt: delivered.deliveredAt, humanConfirmed: true });
        await appendAudit(db, context, { action: "recognition_submission.delivered", resourceType: "submission_delivery", resourceId: deliveryId, detail: { submissionVersionId: input.submissionVersionId, attemptNumber, providerKey: this.deliveryProvider.key, providerReference: delivered.providerReference, receiptHash, exactByteReadback: true, recipientAcceptanceImplied: false }, occurredAt: at });
        await db.insert(schema.idempotencyKeys).values({ id: randomUUID(), ...tenantRecord(context, at), scope: "recognition_submission.deliver", key: idempotencyKey, requestHash, responseJson: response });
      });
    } catch (error) { await this.storage.delete(objectKey); throw error; }
    return response;
  }

  async openReviewerSession(context: TenantContext, input: { submissionVersionId: string; email: string; displayName: string; expiresAt: string; allowedActions: string[]; downloadAllowed: boolean; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Reviewer access creation");
    const bundle = await this.submissionBundle(context, input.submissionVersionId);
    assertAuthorized(context, { action: "create", resource: "reviewer_session", resourceOrganizationId: context.organizationId, caseId: bundle.submission.caseId });
    const delivered = await this.database.select().from(schema.submissionDeliveries).where(and(eq(schema.submissionDeliveries.organizationId, context.organizationId), eq(schema.submissionDeliveries.submissionVersionId, input.submissionVersionId), eq(schema.submissionDeliveries.status, "delivered"))).limit(1);
    if (!delivered[0]) throw new RecognitionStateError("A reviewer session can only pin a delivered submission version.");
    const supported = new Set(["submission:read", "submission_artifact:read", "evidence_version:read", "model_input_mapping:read", "reviewer_request:create", "evidence_acceptance_event:create", "model_response_event:create", "rating_treatment_event:create", "underwriting_treatment_event:create", "placement_response_event:create"]);
    if (!input.allowedActions.length || input.allowedActions.some((scope) => !supported.has(scope))) throw new RecognitionValidationError("Reviewer actions must be a non-empty subset of the recognition-review allowlist.");
    const access = await this.identity.createExternalCaseAccess(context, { caseId: bundle.submission.caseId, principalType: "external_reviewer", email: required(input.email, "Reviewer email"), displayName: required(input.displayName, "Reviewer name"), purpose: `Review exact submission version ${input.submissionVersionId}`, scopes: input.allowedActions, expiresAt: input.expiresAt });
    const at = this.clock().toISOString(), sessionId = randomUUID();
    await this.database.transaction(async (tx) => {
      const db = tx as unknown as ProductionDatabaseLike;
      await db.insert(schema.reviewerSessions).values({ id: sessionId, ...tenantRecord(context, at), submissionVersionId: input.submissionVersionId, externalPrincipalId: access.principalId, externalAccessGrantId: access.grantId, tokenHash: hashOpaqueSecret(access.token), allowedActions: input.allowedActions, downloadAllowed: input.downloadAllowed, status: "active", expiresAt: input.expiresAt });
      await appendAudit(db, context, { action: "recognition_reviewer.session_opened", resourceType: "reviewer_session", resourceId: sessionId, detail: { caseId: bundle.submission.caseId, submissionVersionId: input.submissionVersionId, externalPrincipalId: access.principalId, expiresAt: input.expiresAt, allowedActions: input.allowedActions, downloadAllowed: input.downloadAllowed }, occurredAt: at });
    });
    return { sessionId, token: access.token, expiresAt: input.expiresAt };
  }

  async getReviewerWorkspace(context: TenantContext, reviewerSessionId: string) {
    const rows = await this.database.select().from(schema.reviewerSessions).where(and(eq(schema.reviewerSessions.organizationId, context.organizationId), eq(schema.reviewerSessions.id, reviewerSessionId))).limit(1);
    const session = rows[0];
    if (!session) throw new TenantResourceNotFoundError("Reviewer session");
    if (context.principalType !== "external_reviewer" || context.actorSubject !== `external:${session.externalPrincipalId}`) throw new RecognitionStateError("Reviewer access is isolated to its assigned human principal.");
    if (session.status !== "active" || new Date(session.expiresAt) <= this.clock()) throw new RecognitionStateError("Reviewer access is revoked, completed, or expired.");
    const bundle = await this.submissionBundle(context, session.submissionVersionId);
    assertAuthorized(context, { action: "read", resource: "submission", resourceOrganizationId: context.organizationId, caseId: bundle.submission.caseId });
    const [binding, items, mappings, requests, evidenceResponses, modelResponses, ratingResponses, underwritingResponses, placementResponses] = await Promise.all([
      this.database.select().from(schema.recognitionSubmissionBindings).where(and(eq(schema.recognitionSubmissionBindings.organizationId, context.organizationId), eq(schema.recognitionSubmissionBindings.submissionVersionId, session.submissionVersionId))).limit(1),
      this.database.select().from(schema.submissionItems).where(and(eq(schema.submissionItems.organizationId, context.organizationId), eq(schema.submissionItems.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.recognitionSubmissionMappings).where(and(eq(schema.recognitionSubmissionMappings.organizationId, context.organizationId), eq(schema.recognitionSubmissionMappings.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.reviewerRequests).where(and(eq(schema.reviewerRequests.organizationId, context.organizationId), eq(schema.reviewerRequests.reviewerSessionId, session.id))).orderBy(asc(schema.reviewerRequests.requestedAt)),
      this.database.select().from(schema.evidenceAcceptanceEvents).where(and(eq(schema.evidenceAcceptanceEvents.organizationId, context.organizationId), eq(schema.evidenceAcceptanceEvents.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.modelResponseEvents).where(and(eq(schema.modelResponseEvents.organizationId, context.organizationId), eq(schema.modelResponseEvents.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.ratingTreatmentEvents).where(and(eq(schema.ratingTreatmentEvents.organizationId, context.organizationId), eq(schema.ratingTreatmentEvents.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.underwritingTreatmentEvents).where(and(eq(schema.underwritingTreatmentEvents.organizationId, context.organizationId), eq(schema.underwritingTreatmentEvents.submissionVersionId, session.submissionVersionId))),
      this.database.select().from(schema.placementResponseEvents).where(and(eq(schema.placementResponseEvents.organizationId, context.organizationId), eq(schema.placementResponseEvents.submissionVersionId, session.submissionVersionId))),
    ]);
    await this.database.update(schema.reviewerSessions).set({ openedAt: session.openedAt ?? this.clock().toISOString(), lastUsedAt: this.clock().toISOString(), updatedAt: this.clock().toISOString(), updatedBy: context.actorSubject, revision: session.revision + 1 }).where(eq(schema.reviewerSessions.id, session.id));
    return { session: { id: session.id, status: session.status, expiresAt: session.expiresAt, allowedActions: session.allowedActions, downloadAllowed: session.downloadAllowed }, submission: { id: bundle.submission.id, caseId: bundle.submission.caseId, versionId: bundle.version.id, versionNumber: bundle.version.versionNumber, purpose: bundle.submission.purpose, message: bundle.version.message, caveats: bundle.version.caveats, manifestHash: bundle.version.manifestHash }, binding: binding[0], artifacts: bundle.artifacts.map(({ artifact }) => ({ filename: artifact.filename, mimeType: artifact.mimeType, sizeBytes: artifact.sizeBytes, sha256: artifact.sha256 })), evidenceItems: items, mappings, requests, responses: { evidence: evidenceResponses, model: modelResponses, rating: ratingResponses, underwriting: underwritingResponses, placement: placementResponses }, doctrine: { evidenceReadinessOnly: true, acceptanceNotImplied: true, pricingNotPredicted: true, missingOutcomesRemainUnknown: true } };
  }

  async revokeReviewerSession(context: TenantContext, reviewerSessionId: string, input: { reason: string; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Reviewer access revocation");
    const rows = await this.database.select({ session: schema.reviewerSessions, submission: schema.submissions }).from(schema.reviewerSessions).innerJoin(schema.submissionVersions, eq(schema.submissionVersions.id, schema.reviewerSessions.submissionVersionId)).innerJoin(schema.submissions, eq(schema.submissions.id, schema.submissionVersions.submissionId)).where(and(eq(schema.reviewerSessions.organizationId, context.organizationId), eq(schema.reviewerSessions.id, reviewerSessionId))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Reviewer session");
    assertAuthorized(context, { action: "update", resource: "reviewer_session", resourceOrganizationId: context.organizationId, caseId: rows[0].submission.caseId });
    if (rows[0].session.status !== "active") throw new RecognitionStateError("Only an active reviewer session can be revoked.");
    const reason = required(input.reason, "Revocation reason"), at = this.clock().toISOString();
    await this.identity.revokeExternalAccess(context, rows[0].session.externalAccessGrantId, reason);
    await this.database.transaction(async (tx) => {
      const db = tx as unknown as ProductionDatabaseLike;
      await db.update(schema.reviewerSessions).set({ status: "revoked", revokedAt: at, revocationReason: reason, updatedAt: at, updatedBy: context.actorSubject, revision: rows[0].session.revision + 1 }).where(eq(schema.reviewerSessions.id, reviewerSessionId));
      await appendAudit(db, context, { action: "recognition_reviewer.session_revoked", resourceType: "reviewer_session", resourceId: reviewerSessionId, detail: { submissionVersionId: rows[0].session.submissionVersionId, externalAccessGrantId: rows[0].session.externalAccessGrantId, reason }, occurredAt: at });
    });
    return { sessionId: reviewerSessionId, status: "revoked" as const };
  }

  async requestClarification(context: TenantContext, input: { reviewerSessionId: string; requestType: "clarification" | "additional_evidence" | "correction"; originalLanguage: string; normalizedReason: "scope_clarification" | "freshness_clarification" | "source_clarification" | "verifier_clarification" | "model_mapping_clarification" | "missing_evidence" | "record_correction"; supersedesRequestId?: string }) {
    const workspace = await this.getReviewerWorkspace(context, input.reviewerSessionId);
    assertAuthorized(context, { action: "create", resource: "reviewer_request", resourceOrganizationId: context.organizationId, caseId: workspace.submission.caseId });
    if (!(workspace.session.allowedActions as string[]).includes("reviewer_request:create")) throw new RecognitionStateError("This reviewer session cannot request clarification.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.reviewerRequests).values({ id, ...tenantRecord(context, at), reviewerSessionId: input.reviewerSessionId, submissionVersionId: workspace.submission.versionId, requestType: input.requestType, originalLanguage: required(input.originalLanguage, "Original request language"), normalizedReason: input.normalizedReason, status: "open", requestedBy: context.actorSubject, requestedAt: at, supersedesRequestId: input.supersedesRequestId });
    await appendAudit(this.database, context, { action: "recognition_reviewer.clarification_requested", resourceType: "reviewer_request", resourceId: id, detail: { reviewerSessionId: input.reviewerSessionId, submissionVersionId: workspace.submission.versionId, requestType: input.requestType, normalizedReason: input.normalizedReason, originalLanguagePreserved: true }, occurredAt: at });
    return { reviewerRequestId: id, status: "open" };
  }

  async respondToRequest(context: TenantContext, input: { reviewerRequestId: string; originalLanguage: string; evidenceVersionIds: string[]; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Clarification response");
    const rows = await this.database.select({ request: schema.reviewerRequests, session: schema.reviewerSessions, submission: schema.submissions }).from(schema.reviewerRequests).innerJoin(schema.reviewerSessions, eq(schema.reviewerSessions.id, schema.reviewerRequests.reviewerSessionId)).innerJoin(schema.submissionVersions, eq(schema.submissionVersions.id, schema.reviewerRequests.submissionVersionId)).innerJoin(schema.submissions, eq(schema.submissions.id, schema.submissionVersions.submissionId)).where(and(eq(schema.reviewerRequests.organizationId, context.organizationId), eq(schema.reviewerRequests.id, input.reviewerRequestId))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Reviewer request");
    assertAuthorized(context, { action: "create", resource: "reviewer_request_response", resourceOrganizationId: context.organizationId, caseId: rows[0].submission.caseId });
    if (rows[0].request.status !== "open") throw new RecognitionStateError("Only an open clarification request can be answered.");
    if (input.evidenceVersionIds.length) {
      const linked = await this.database.select({ id: schema.submissionItems.evidenceVersionId }).from(schema.submissionItems).where(and(eq(schema.submissionItems.organizationId, context.organizationId), eq(schema.submissionItems.submissionVersionId, rows[0].request.submissionVersionId), inArray(schema.submissionItems.evidenceVersionId, input.evidenceVersionIds)));
      if (new Set(linked.map((row) => row.id)).size !== new Set(input.evidenceVersionIds).size) throw new RecognitionStateError("Clarification evidence must already be pinned to the submitted version; prepare a corrected successor for new evidence.");
    }
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (tx) => {
      const db = tx as unknown as ProductionDatabaseLike;
      await db.insert(schema.reviewerRequestResponses).values({ id, ...tenantRecord(context, at), reviewerRequestId: input.reviewerRequestId, originalLanguage: required(input.originalLanguage, "Original response language"), evidenceVersionIds: input.evidenceVersionIds, respondedBy: context.actorSubject, respondedAt: at, humanConfirmed: true });
      await db.update(schema.reviewerRequests).set({ status: "responded", updatedAt: at, updatedBy: context.actorSubject, revision: rows[0].request.revision + 1 }).where(eq(schema.reviewerRequests.id, input.reviewerRequestId));
      await appendAudit(db, context, { action: "recognition_reviewer.clarification_responded", resourceType: "reviewer_request_response", resourceId: id, detail: { reviewerRequestId: input.reviewerRequestId, evidenceVersionIds: input.evidenceVersionIds, originalLanguagePreserved: true }, occurredAt: at });
    });
    return { reviewerRequestResponseId: id, status: "responded" };
  }

  async recordEvidenceResponse(context: TenantContext, input: ResponseBasis & { evidenceVersionId: string; disposition: EvidenceDisposition }) {
    const common = await this.responseCommon(context, "evidence_acceptance_event", input);
    await this.assertSubmittedEvidence(context, input.submissionVersionId, input.evidenceVersionId);
    const id = randomUUID();
    await this.database.insert(schema.evidenceAcceptanceEvents).values({ id, ...common, evidenceVersionId: input.evidenceVersionId, disposition: input.disposition, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "evidence", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async recordModelResponse(context: TenantContext, input: ResponseBasis & { mappingId: string; disposition: ModelDisposition; acceptedValue?: Record<string, unknown> }) {
    const common = await this.responseCommon(context, "model_response_event", input);
    const linked = await this.database.select().from(schema.recognitionSubmissionMappings).where(and(eq(schema.recognitionSubmissionMappings.organizationId, context.organizationId), eq(schema.recognitionSubmissionMappings.submissionVersionId, input.submissionVersionId), eq(schema.recognitionSubmissionMappings.mappingId, input.mappingId))).limit(1);
    if (!linked[0]) throw new RecognitionStateError("Model response must reference a mapping pinned to the exact submission version.");
    if (["input_accepted", "input_modified"].includes(input.disposition) !== Boolean(input.acceptedValue)) throw new RecognitionValidationError("Accepted model input outcomes require the separately recorded accepted value; other outcomes must not include one.");
    const id = randomUUID();
    await this.database.insert(schema.modelResponseEvents).values({ id, ...common, mappingId: input.mappingId, disposition: input.disposition, acceptedValue: input.acceptedValue, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "model", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async recordRatingResponse(context: TenantContext, input: ResponseBasis & { disposition: RatingDisposition; governedSourceVersionId?: string }) {
    const common = await this.responseCommon(context, "rating_treatment_event", input);
    if (["filed_discount_applied", "factor_changed"].includes(input.disposition) && !input.governedSourceVersionId) throw new RecognitionValidationError("A positive rating treatment requires a governed source version; correspondence alone is insufficient.");
    const id = randomUUID();
    await this.database.insert(schema.ratingTreatmentEvents).values({ id, ...common, disposition: input.disposition, governedSourceVersionId: input.governedSourceVersionId, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "rating", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async recordUnderwritingResponse(context: TenantContext, input: ResponseBasis & { disposition: UnderwritingDisposition }) {
    const common = await this.responseCommon(context, "underwriting_treatment_event", input), id = randomUUID();
    await this.database.insert(schema.underwritingTreatmentEvents).values({ id, ...common, disposition: input.disposition, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "underwriting", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async recordPlacementResponse(context: TenantContext, input: ResponseBasis & { disposition: PlacementDisposition; termSnapshot?: Record<string, unknown> }) {
    const common = await this.responseCommon(context, "placement_response_event", input), id = randomUUID();
    await this.database.insert(schema.placementResponseEvents).values({ id, ...common, disposition: input.disposition, termSnapshot: input.termSnapshot, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "placement", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async recordFundingResponse(context: TenantContext, input: ResponseBasis & { disposition: FundingDisposition }) {
    if (context.principalType !== "membership") throw new RecognitionStateError("External market reviewers cannot record funding outcomes.");
    const common = await this.responseCommon(context, "funding_response_event", input), id = randomUUID();
    await this.database.insert(schema.fundingResponseEvents).values({ id, ...common, disposition: input.disposition, supersedesEventId: input.supersedesEventId });
    await this.auditResponse(context, "funding", id, input.submissionVersionId, input.disposition, common.recordedAt);
    return { eventId: id, disposition: input.disposition };
  }

  async closeRecognitionCase(context: TenantContext, input: { caseId: string; submissionVersionId: string; closureStatus: "closed" | "closed_outcome_pending" | "reopened" | "corrected"; unresolvedCaveats: string[]; note: string; supersedesEventId?: string; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Recognition case closure");
    assertAuthorized(context, { action: "create", resource: "recognition_case_closure_event", resourceOrganizationId: context.organizationId, caseId: input.caseId });
    const bundle = await this.submissionBundle(context, input.submissionVersionId);
    if (bundle.submission.caseId !== input.caseId) throw new RecognitionStateError("Closure must reference a submission for the same case.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.recognitionCaseClosureEvents).values({ id, ...tenantRecord(context, at), ...input, note: required(input.note, "Closure note"), humanConfirmed: true, decidedBy: context.actorSubject, decidedAt: at });
    await appendAudit(this.database, context, { action: `recognition_case.${input.closureStatus}`, resourceType: "recognition_case_closure_event", resourceId: id, detail: { caseId: input.caseId, submissionVersionId: input.submissionVersionId, unresolvedCaveats: input.unresolvedCaveats, missingOutcomeFilled: false }, occurredAt: at });
    return { closureEventId: id, closureStatus: input.closureStatus };
  }

  async rollForwardMaintenance(context: TenantContext, input: { sourceCaseId: string; targetCaseId: string; maintenanceObligationId: string; evidenceVersionId?: string; status: "carried_forward" | "expired" | "review_required" | "not_applicable"; basis: string; humanConfirmed: boolean }) {
    member(context, input.humanConfirmed, "Maintenance roll-forward");
    assertAuthorized(context, { action: "create", resource: "maintenance_roll_forward", resourceOrganizationId: context.organizationId, caseId: input.targetCaseId });
    const [source, target, obligation, closure] = await Promise.all([
      this.database.select({ case: schema.renewalCases, propertyId: schema.policies.propertyId }).from(schema.renewalCases).innerJoin(schema.policies, eq(schema.policies.id, schema.renewalCases.policyId)).where(and(eq(schema.renewalCases.organizationId, context.organizationId), eq(schema.renewalCases.id, input.sourceCaseId))).limit(1),
      this.database.select({ case: schema.renewalCases, propertyId: schema.policies.propertyId }).from(schema.renewalCases).innerJoin(schema.policies, eq(schema.policies.id, schema.renewalCases.policyId)).where(and(eq(schema.renewalCases.organizationId, context.organizationId), eq(schema.renewalCases.id, input.targetCaseId))).limit(1),
      this.database.select({ obligation: schema.maintenanceObligations, propertyId: schema.resilienceProjects.propertyId }).from(schema.maintenanceObligations).innerJoin(schema.verificationCertificates, eq(schema.verificationCertificates.id, schema.maintenanceObligations.certificateId)).innerJoin(schema.verificationAssignments, eq(schema.verificationAssignments.id, schema.verificationCertificates.assignmentId)).innerJoin(schema.resilienceProjects, eq(schema.resilienceProjects.id, schema.verificationAssignments.projectId)).where(and(eq(schema.maintenanceObligations.organizationId, context.organizationId), eq(schema.maintenanceObligations.id, input.maintenanceObligationId))).limit(1),
      this.database.select({ id: schema.recognitionCaseClosureEvents.id }).from(schema.recognitionCaseClosureEvents).where(and(eq(schema.recognitionCaseClosureEvents.organizationId, context.organizationId), eq(schema.recognitionCaseClosureEvents.caseId, input.sourceCaseId))).orderBy(desc(schema.recognitionCaseClosureEvents.decidedAt)).limit(1),
    ]);
    if (!source[0] || !target[0] || !obligation[0] || !closure[0] || source[0].propertyId !== target[0].propertyId || source[0].propertyId !== obligation[0].propertyId || target[0].case.renewalDate <= source[0].case.renewalDate)
      throw new RecognitionStateError("Maintenance can roll only from a closed case to a later renewal case for the same property and obligation.");
    if (input.evidenceVersionId) {
      const evidence = await this.database.select({ id: schema.evidenceVersions.id }).from(schema.evidenceVersions).innerJoin(schema.evidenceItems, eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId)).where(and(eq(schema.evidenceVersions.organizationId, context.organizationId), eq(schema.evidenceVersions.id, input.evidenceVersionId), eq(schema.evidenceItems.propertyId, source[0].propertyId))).limit(1);
      if (!evidence[0]) throw new RecognitionStateError("Roll-forward evidence must belong to the same property.");
    }
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.maintenanceRollForwards).values({ id, ...tenantRecord(context, at), ...input, basis: required(input.basis, "Roll-forward basis"), humanConfirmed: true, reviewedBy: context.actorSubject, reviewedAt: at });
    await appendAudit(this.database, context, { action: "recognition_maintenance.rolled_forward", resourceType: "maintenance_roll_forward", resourceId: id, detail: { sourceCaseId: input.sourceCaseId, targetCaseId: input.targetCaseId, maintenanceObligationId: input.maintenanceObligationId, evidenceVersionId: input.evidenceVersionId ?? null, status: input.status, autoApproved: false }, occurredAt: at });
    return { rollForwardId: id, status: input.status };
  }

  async getWorkspace(context: TenantContext) {
    const organizationId = context.organizationId;
    const [bindings, deliveries, receipts, sessions, requests, requestResponses, evidence, model, rating, underwriting, placement, funding, closures, rollForwards] = await Promise.all([
      this.database.select().from(schema.recognitionSubmissionBindings).where(eq(schema.recognitionSubmissionBindings.organizationId, organizationId)).orderBy(desc(schema.recognitionSubmissionBindings.preparedAt)),
      this.database.select().from(schema.submissionDeliveries).where(eq(schema.submissionDeliveries.organizationId, organizationId)).orderBy(desc(schema.submissionDeliveries.attemptedAt)),
      this.database.select().from(schema.deliveryReceipts).where(eq(schema.deliveryReceipts.organizationId, organizationId)),
      this.database.select().from(schema.reviewerSessions).where(eq(schema.reviewerSessions.organizationId, organizationId)).orderBy(desc(schema.reviewerSessions.createdAt)),
      this.database.select().from(schema.reviewerRequests).where(eq(schema.reviewerRequests.organizationId, organizationId)).orderBy(desc(schema.reviewerRequests.requestedAt)),
      this.database.select().from(schema.reviewerRequestResponses).where(eq(schema.reviewerRequestResponses.organizationId, organizationId)),
      this.database.select().from(schema.evidenceAcceptanceEvents).where(eq(schema.evidenceAcceptanceEvents.organizationId, organizationId)).orderBy(desc(schema.evidenceAcceptanceEvents.recordedAt)),
      this.database.select().from(schema.modelResponseEvents).where(eq(schema.modelResponseEvents.organizationId, organizationId)).orderBy(desc(schema.modelResponseEvents.recordedAt)),
      this.database.select().from(schema.ratingTreatmentEvents).where(eq(schema.ratingTreatmentEvents.organizationId, organizationId)).orderBy(desc(schema.ratingTreatmentEvents.recordedAt)),
      this.database.select().from(schema.underwritingTreatmentEvents).where(eq(schema.underwritingTreatmentEvents.organizationId, organizationId)).orderBy(desc(schema.underwritingTreatmentEvents.recordedAt)),
      this.database.select().from(schema.placementResponseEvents).where(eq(schema.placementResponseEvents.organizationId, organizationId)).orderBy(desc(schema.placementResponseEvents.recordedAt)),
      this.database.select().from(schema.fundingResponseEvents).where(eq(schema.fundingResponseEvents.organizationId, organizationId)).orderBy(desc(schema.fundingResponseEvents.recordedAt)),
      this.database.select().from(schema.recognitionCaseClosureEvents).where(eq(schema.recognitionCaseClosureEvents.organizationId, organizationId)).orderBy(desc(schema.recognitionCaseClosureEvents.decidedAt)),
      this.database.select().from(schema.maintenanceRollForwards).where(eq(schema.maintenanceRollForwards.organizationId, organizationId)).orderBy(desc(schema.maintenanceRollForwards.reviewedAt)),
    ]);
    return { bindings, deliveries, receipts, sessions, requests, requestResponses, outcomes: { evidence, model, rating, underwriting, placement, funding }, closures, rollForwards, doctrine: { evidenceReadinessOnly: true, deliveryDoesNotEqualAcceptance: true, modelInputProposalDoesNotEqualAcceptance: true, marketOutcomesAreRecordedNotPredicted: true, missingOutcomesRemainUnknown: true } };
  }

  private async responseCommon(context: TenantContext, resource: "evidence_acceptance_event" | "model_response_event" | "rating_treatment_event" | "underwriting_treatment_event" | "placement_response_event" | "funding_response_event", input: ResponseBasis) {
    if (!input.humanConfirmed) throw new RecognitionStateError("External response recording requires explicit human confirmation.");
    const bundle = await this.submissionBundle(context, input.submissionVersionId);
    assertAuthorized(context, { action: "create", resource, resourceOrganizationId: context.organizationId, caseId: bundle.submission.caseId });
    const delivered = await this.database.select({ id: schema.submissionDeliveries.id }).from(schema.submissionDeliveries).where(and(eq(schema.submissionDeliveries.organizationId, context.organizationId), eq(schema.submissionDeliveries.submissionVersionId, input.submissionVersionId), eq(schema.submissionDeliveries.status, "delivered"))).limit(1);
    if (!delivered[0]) throw new RecognitionStateError("A market response cannot precede documented delivery.");
    const at = this.clock().toISOString();
    return { ...tenantRecord(context, at), submissionVersionId: input.submissionVersionId, sourceAuthority: required(input.sourceAuthority, "Response source authority"), sourceReference: required(input.sourceReference, "Response source reference"), originalLanguage: required(input.originalLanguage, "Original response language"), normalizedReason: required(input.normalizedReason, "Normalized response reason"), humanConfirmed: true, recordedBy: context.actorSubject, recordedAt: at };
  }

  private async auditResponse(context: TenantContext, category: string, id: string, submissionVersionId: string, disposition: string, at: string) {
    await appendAudit(this.database, context, { action: `recognition_response.${category}_recorded`, resourceType: `${category}_response_event`, resourceId: id, detail: { submissionVersionId, disposition, originalLanguagePreserved: true, normalizedTaxonomySeparate: true, outcomePredicted: false }, occurredAt: at });
  }

  private async mappingSnapshots(context: TenantContext, caseId: string, mappingIds: string[]) {
    if (!mappingIds.length) return [];
    const mappings = await this.database.select({ mapping: schema.modelInputMappings, event: schema.modelInputMappingEvents }).from(schema.modelInputMappings).innerJoin(schema.modelInputMappingEvents, eq(schema.modelInputMappingEvents.mappingId, schema.modelInputMappings.id)).innerJoin(schema.resilienceProjects, eq(schema.resilienceProjects.propertyId, schema.modelInputMappings.propertyId)).innerJoin(schema.policies, eq(schema.policies.propertyId, schema.resilienceProjects.propertyId)).innerJoin(schema.renewalCases, eq(schema.renewalCases.policyId, schema.policies.id)).where(and(eq(schema.modelInputMappings.organizationId, context.organizationId), eq(schema.renewalCases.id, caseId), inArray(schema.modelInputMappings.id, mappingIds))).orderBy(asc(schema.modelInputMappingEvents.occurredAt));
    const byId = new Map<string, typeof mappings[number]>();
    for (const row of mappings) byId.set(row.mapping.id, row);
    if (byId.size !== new Set(mappingIds).size) throw new RecognitionStateError("Every submitted mapping must belong to the case property and have a human-confirmed state event.");
    return [...byId.values()].map(({ mapping, event }) => {
      if (!["submitted", "accepted_by_model_market", "accepted_with_modification"].includes(event.eventType) || !event.humanConfirmed) throw new RecognitionStateError("Unsupported, rejected, expired, or unconfirmed mappings cannot be submitted as recognised inputs.");
      return { mappingId: mapping.id, state: event.eventType, acceptedValue: event.acceptedValue ?? undefined };
    });
  }

  private async assertSubmittedEvidence(context: TenantContext, submissionVersionId: string, evidenceVersionId: string) {
    const rows = await this.database.select({ id: schema.submissionItems.id }).from(schema.submissionItems).where(and(eq(schema.submissionItems.organizationId, context.organizationId), eq(schema.submissionItems.submissionVersionId, submissionVersionId), eq(schema.submissionItems.evidenceVersionId, evidenceVersionId))).limit(1);
    if (!rows[0]) throw new RecognitionStateError("Evidence response must reference evidence pinned to the exact submission version.");
  }

  private async idempotent(context: TenantContext, scope: string, key: string, requestHash: string) {
    const rows = await this.database.select().from(schema.idempotencyKeys).where(and(eq(schema.idempotencyKeys.organizationId, context.organizationId), eq(schema.idempotencyKeys.scope, scope), eq(schema.idempotencyKeys.key, key))).limit(1);
    if (!rows[0]) return undefined;
    if (rows[0].requestHash !== requestHash) throw new IdempotencyConflictError();
    return { ...(rows[0].responseJson as Record<string, unknown>), replayed: true };
  }

  private async submissionBundle(context: TenantContext, submissionVersionId: string) {
    const rows = await this.database.select({ version: schema.submissionVersions, submission: schema.submissions }).from(schema.submissionVersions).innerJoin(schema.submissions, eq(schema.submissions.id, schema.submissionVersions.submissionId)).where(and(eq(schema.submissionVersions.organizationId, context.organizationId), eq(schema.submissionVersions.id, submissionVersionId))).limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Submission version");
    const artifacts = await this.database.select({ artifact: schema.submissionArtifacts, storage: schema.storageObjects }).from(schema.submissionArtifacts).innerJoin(schema.storageObjects, eq(schema.storageObjects.id, schema.submissionArtifacts.storageObjectId)).where(and(eq(schema.submissionArtifacts.organizationId, context.organizationId), eq(schema.submissionArtifacts.submissionVersionId, submissionVersionId)));
    return { ...rows[0], artifacts };
  }
}

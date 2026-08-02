import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { IdentityService } from "@/lib/production/identity-service";
import { DeterministicMarketDeliveryProvider, UnavailableMarketDeliveryProvider } from "@/lib/production/market-delivery";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import { RecognitionStateError, RecognitionSubmissionService, RecognitionValidationError } from "@/lib/production/recognition-submission-service";
import { tenantRecord, type ProductionDatabaseLike } from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const now = "2026-12-12T18:00:00.000Z";
const hash = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: path.resolve(process.cwd(), "drizzle-production") });
});
afterAll(async () => client.close());

async function seedRecognition(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const owned = tenantRecord(fixture.context, now);
  const caseId = `recognition-case-${key}`;
  await database.insert(schema.renewalCases).values({ id: caseId, ...owned, policyId: fixture.policyId, title: "Recognition renewal", status: "open", caseType: "renewal", peril: "wildfire", jurisdiction: "US-CA", propertyClass: "condominium", renewalDate: "2027-01-01", ownerSubject: fixture.context.actorSubject });

  const sourceId = `recognition-source-${key}`, sourceVersionId = `${sourceId}-v1`;
  await database.insert(schema.governedSources).values({ id: sourceId, ...owned, canonicalKey: sourceId, sourceClass: "insurer_mga_material", issuingAuthority: "Fictional market source", title: "Fictional review requirements", jurisdiction: "US-CA", officialUrl: `https://example.test/${key}`, authorityTier: "customer_supplied", reviewOwnerSubject: "source-owner" });
  await database.insert(schema.governedSourceVersions).values({ id: sourceVersionId, ...owned, sourceId, versionNumber: 1, versionLabel: "2026.1", publicationDate: "2026-11-01", effectiveFrom: "2026-11-01", retrievalDate: "2026-12-01", sourceHash: key.padEnd(64, "a").slice(0, 64), snapshotState: "metadata_only_restricted", rightsStatus: "restricted", redistributionAllowed: false, useRestrictions: "Internal fictional review only.", structuredSummary: { boundary: "No outcome implied." }, verifyCurrentStatus: "verified_current", nextReviewDate: "2027-02-01", extractionMethod: "human_authored", humanConfirmed: true, authorSubject: "source-author", changeSummary: "Initial fixture source." });
  await database.insert(schema.governedSourceReviews).values({ id: `${sourceVersionId}-review`, ...owned, sourceVersionId, decision: "approved", reviewerSubject: "source-reviewer", note: "Current source and rights checked.", sourceCompared: true, rightsConfirmed: true, reviewedAt: now });
  await database.insert(schema.governedSourcePublications).values({ id: `${sourceVersionId}-publication`, ...owned, sourceVersionId, decision: "published", publisherSubject: "source-publisher", note: "Published bounded source.", publishedAt: now });

  const profileId = `recognition-profile-${key}`, profileVersionId = `${profileId}-v1`;
  await database.insert(schema.targetProfiles).values({ id: profileId, ...owned, canonicalKey: profileId, name: "California evidence profile", description: "Fictional evidence-readiness profile.", jurisdiction: "US-CA", peril: "wildfire", propertyClass: "condominium" });
  await database.insert(schema.targetProfileVersions).values({ id: profileVersionId, ...owned, profileId, versionNumber: 1, effectiveFrom: "2026-11-01", status: "published", authorSubject: "profile-author", changeSummary: "Initial fixture.", limitations: "No designation, compliance, or insurance outcome.", recognitionState: "unavailable_no_commitment_registry" });
  await database.insert(schema.targetProfileReviews).values({ id: `${profileVersionId}-review`, ...owned, profileVersionId, decision: "approved", reviewerSubject: "profile-reviewer", note: "Scope checked.", sourcePinsChecked: true, reviewedAt: now });
  await database.insert(schema.targetProfilePublications).values({ id: `${profileVersionId}-publication`, ...owned, profileVersionId, decision: "published", publisherSubject: "profile-publisher", note: "Published fixture profile.", publishedAt: now });

  const playbookId = `recognition-playbook-${key}`, playbookVersionId = `${playbookId}-v1`;
  await database.insert(schema.marketPlaybooks).values({ id: playbookId, ...owned, name: `Recognition playbook ${key}`, description: "Fictional destination review requirements." });
  await database.insert(schema.playbookVersions).values({ id: playbookVersionId, ...owned, playbookId, versionNumber: 1, marketId: fixture.marketId, jurisdiction: "US-CA", peril: "wildfire", propertyClass: "condominium", effectiveFrom: "2026-01-01", effectiveTo: "2027-12-31", governedSourceVersionId: sourceVersionId, sourceName: "Fictional review requirements", sourceUrl: `https://example.test/${key}`, sourceVersion: "2026.1", sourceCitation: "Fixture section 1", verifyCurrent: true, changeSummary: "Initial fixture playbook.", contentHash: key.padEnd(64, "b").slice(0, 64), authorSubject: "playbook-author" });
  await database.insert(schema.playbookVersionReviews).values({ id: `${playbookVersionId}-review`, ...owned, playbookVersionId, decision: "approved", reviewerSubject: "playbook-reviewer", note: "Source and destination scope checked.", reviewedAt: now });
  await database.insert(schema.casePlaybookLinks).values({ id: `${playbookVersionId}-link`, ...owned, caseId, playbookVersionId, destinationMarketId: fixture.marketId, linkedAt: now, linkedBy: fixture.context.actorSubject });

  const submissionId = `recognition-submission-${key}`, submissionVersionId = `${submissionId}-v1`;
  const body = new TextEncoder().encode(JSON.stringify({ schema: "fortify.test-submission.1", caseId, evidenceReadinessOnly: true }));
  const bodyHash = hash(body), storageObjectId = `${submissionVersionId}-storage`, objectKey = `tenants/${fixture.organizationId}/generated/submissions/${submissionVersionId}/manifest.json`;
  const storage = new DeterministicObjectStorageAdapter();
  await storage.put({ key: objectKey, body, mimeType: "application/json", sha256: bodyHash });
  await database.insert(schema.submissions).values({ id: submissionId, ...owned, caseId, marketId: fixture.marketId, purpose: "Fictional evidence readiness review", status: "confirmed", currentVersionId: submissionVersionId });
  await database.insert(schema.submissionVersions).values({ id: submissionVersionId, ...owned, submissionId, versionNumber: 1, status: "confirmed", message: "Please review the exact evidence-readiness package; no outcome is implied.", caveats: ["Review does not imply insurance, pricing, capacity, renewal, or acceptance."], confirmedBy: fixture.context.actorSubject, confirmedAt: now, manifestHash: bodyHash });
  await database.insert(schema.storageObjects).values({ id: storageObjectId, ...owned, provider: storage.provider, bucket: storage.bucket, objectKey, originalFilename: "manifest.json", mimeType: "application/json", sizeBytes: body.byteLength, sha256: bodyHash, checksumAlgorithm: "sha256", encryptionMode: "AES256", state: "clean", scanStatus: "clean" });
  await database.insert(schema.malwareScanResults).values({ id: `${storageObjectId}-scan`, ...owned, storageObjectId, scanner: "fortify-test", engineVersion: "1", status: "clean", findings: [], scannedAt: now });
  await database.insert(schema.submissionArtifacts).values({ id: `${submissionVersionId}-artifact`, ...owned, submissionVersionId, storageObjectId, artifactType: "manifest", filename: "manifest.json", mimeType: "application/json", sizeBytes: body.byteLength, sha256: bodyHash, generationRecipeVersion: "fortify-test-submission-1", generatedAt: now });
  return { ...fixture, caseId, profileVersionId, playbookVersionId, submissionVersionId, storage };
}

const prepareInput = (setup: Awaited<ReturnType<typeof seedRecognition>>) => ({ submissionVersionId: setup.submissionVersionId, playbookVersionId: setup.playbookVersionId, profileVersionId: setup.profileVersionId, mappingIds: [], requestedAction: "Review exact evidence and return a disposition", destinationLabel: "Fictional market review desk", deliveryMethod: "secure_review_link" as const, readinessStatus: "ready_with_caveats" as const, blockerSnapshot: [], caveatSnapshot: ["Review-only; no downstream outcome implied."], humanConfirmed: true });

describe("recognition submission, reviewer, and outcome governance", () => {
  test("pins exact artifacts, records failed retry and immutable delivery receipt, and replays idempotently", async () => {
    const setup = await seedRecognition("m9-delivery");
    const service = new RecognitionSubmissionService(db(), setup.storage, new DeterministicMarketDeliveryProvider(), () => new Date(now));
    const prepared = await service.prepareSubmission(setup.context, "prepare-1", prepareInput(setup));
    expect(prepared).toMatchObject({ mappingCount: 0, readinessStatus: "ready_with_caveats", replayed: false });
    expect(await service.prepareSubmission(setup.context, "prepare-1", prepareInput(setup))).toMatchObject({ replayed: true, bindingId: (prepared as unknown as { bindingId: string }).bindingId });
    await expect(service.prepareSubmission(setup.context, "prepare-blocked", { ...prepareInput(setup), blockerSnapshot: ["Missing current evidence"] })).rejects.toBeInstanceOf(RecognitionStateError);

    const unavailable = new RecognitionSubmissionService(db(), setup.storage, new UnavailableMarketDeliveryProvider(), () => new Date(now));
    await expect(unavailable.deliverSubmission(setup.context, "delivery-failed", { submissionVersionId: setup.submissionVersionId, destination: "fixture-review@example.test", humanConfirmed: true })).rejects.toBeInstanceOf(RecognitionStateError);
    const delivered = await service.deliverSubmission(setup.context, "delivery-success", { submissionVersionId: setup.submissionVersionId, destination: "fixture-review@example.test", humanConfirmed: true });
    expect(delivered).toMatchObject({ status: "delivered", attemptNumber: 2, replayed: false });
    expect(await service.deliverSubmission(setup.context, "delivery-success", { submissionVersionId: setup.submissionVersionId, destination: "fixture-review@example.test", humanConfirmed: true })).toMatchObject({ replayed: true, deliveryId: (delivered as unknown as { deliveryId: string }).deliveryId });
    const attempts = await database.select().from(schema.submissionDeliveries).where(eq(schema.submissionDeliveries.submissionVersionId, setup.submissionVersionId));
    expect(attempts.map((row) => [row.attemptNumber, row.status])).toEqual([[1, "failed"], [2, "delivered"]]);
    const receipts = await database.select().from(schema.deliveryReceipts).where(eq(schema.deliveryReceipts.deliveryId, (delivered as unknown as { deliveryId: string }).deliveryId));
    expect(receipts[0]).toMatchObject({ humanConfirmed: true, receiptType: "review_link_created" });
    await expect(database.update(schema.deliveryReceipts).set({ sourceReference: "tampered" }).where(eq(schema.deliveryReceipts.id, receipts[0].id))).rejects.toThrow();
  });

  test("isolates reviewer access, preserves correspondence, and keeps response categories separate", async () => {
    const setup = await seedRecognition("m9-reviewer");
    const service = new RecognitionSubmissionService(db(), setup.storage, new DeterministicMarketDeliveryProvider(), () => new Date(now));
    await service.prepareSubmission(setup.context, "prepare-reviewer", prepareInput(setup));
    await service.deliverSubmission(setup.context, "deliver-reviewer", { submissionVersionId: setup.submissionVersionId, destination: "fixture-review@example.test", humanConfirmed: true });
    const session = await service.openReviewerSession(setup.context, { submissionVersionId: setup.submissionVersionId, email: "reviewer@example.test", displayName: "Fictional reviewer", expiresAt: "2026-12-19T18:00:00.000Z", allowedActions: ["submission:read", "reviewer_request:create", "rating_treatment_event:create"], downloadAllowed: false, humanConfirmed: true });
    const reviewer = await new IdentityService(db(), () => new Date(now)).resolveExternalAccess(session.token);
    const workspace = await service.getReviewerWorkspace(reviewer, session.sessionId);
    expect(workspace).toMatchObject({ session: { downloadAllowed: false }, doctrine: { acceptanceNotImplied: true, missingOutcomesRemainUnknown: true } });
    await expect(service.getReviewerWorkspace({ ...reviewer, actorSubject: "external:other" }, session.sessionId)).rejects.toBeInstanceOf(RecognitionStateError);
    const request = await service.requestClarification(reviewer, { reviewerSessionId: session.sessionId, requestType: "clarification", originalLanguage: "Please identify the exact scope represented by the package.", normalizedReason: "scope_clarification" });
    await service.respondToRequest(setup.context, { reviewerRequestId: request.reviewerRequestId, originalLanguage: "The package covers the shared buildings identified in the immutable manifest.", evidenceVersionIds: [], humanConfirmed: true });
    const rating = await service.recordRatingResponse(reviewer, { submissionVersionId: setup.submissionVersionId, disposition: "unknown", sourceAuthority: "Fictional reviewer", sourceReference: "response-1", originalLanguage: "No rating determination is included.", normalizedReason: "no_rating_response", humanConfirmed: true });
    expect(rating.disposition).toBe("unknown");
    await expect(service.recordRatingResponse(reviewer, { submissionVersionId: setup.submissionVersionId, disposition: "filed_discount_applied", sourceAuthority: "Fictional reviewer", sourceReference: "response-2", originalLanguage: "A discount may apply.", normalizedReason: "unverified_positive_treatment", humanConfirmed: true })).rejects.toBeInstanceOf(RecognitionValidationError);
    await expect(service.recordFundingResponse(reviewer, { submissionVersionId: setup.submissionVersionId, disposition: "approved", sourceAuthority: "Fictional reviewer", sourceReference: "response-3", originalLanguage: "Funding approved.", normalizedReason: "external_claim", humanConfirmed: true })).rejects.toBeInstanceOf(RecognitionStateError);
    const preserved = await database.select().from(schema.reviewerRequests).where(eq(schema.reviewerRequests.id, request.reviewerRequestId));
    expect(preserved[0]).toMatchObject({ originalLanguage: "Please identify the exact scope represented by the package.", normalizedReason: "scope_clarification", status: "responded" });
    await expect(database.update(schema.reviewerRequests).set({ originalLanguage: "tampered" }).where(eq(schema.reviewerRequests.id, request.reviewerRequestId))).rejects.toThrow();
    await expect(service.revokeReviewerSession(setup.context, session.sessionId, { reason: "Review cycle complete.", humanConfirmed: false })).rejects.toBeInstanceOf(RecognitionStateError);
    await expect(service.revokeReviewerSession(setup.context, session.sessionId, { reason: "Review cycle complete.", humanConfirmed: true })).resolves.toMatchObject({ status: "revoked" });
    await expect(service.getReviewerWorkspace(reviewer, session.sessionId)).rejects.toBeInstanceOf(RecognitionStateError);
  });
});

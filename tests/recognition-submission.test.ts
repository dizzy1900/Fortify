import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { IdentityService } from "@/lib/production/identity-service";
import {
  DeterministicMarketDeliveryProvider,
  UnavailableMarketDeliveryProvider,
} from "@/lib/production/market-delivery";
import {
  DeterministicObjectStorageAdapter,
  type ObjectStorageAdapter,
} from "@/lib/production/object-storage";
import {
  RecognitionStateError,
  RecognitionSubmissionService,
  RecognitionValidationError,
} from "@/lib/production/recognition-submission-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

const routeState = vi.hoisted(() => ({
  database: undefined as ProductionDatabaseLike | undefined,
  storage: undefined as ObjectStorageAdapter | undefined,
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return { ...original, getProductionDatabase: () => routeState.database };
});

vi.mock("@/lib/production/object-storage-runtime", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/lib/production/object-storage-runtime")
    >();
  return { ...original, getProductionObjectStorage: () => routeState.storage };
});

import { POST as closeRecognitionCase } from "@/app/api/production/recognition/case-closures/route";
import { POST as deliverSubmission } from "@/app/api/production/recognition/deliveries/route";
import { POST as rollForwardMaintenance } from "@/app/api/production/recognition/maintenance-roll-forwards/route";
import { POST as recordRecognitionResponse } from "@/app/api/production/recognition/responses/[category]/route";
import { POST as respondToReviewerRequest } from "@/app/api/production/recognition/reviewer-requests/[requestId]/responses/route";
import { POST as requestClarification } from "@/app/api/production/recognition/reviewer-requests/route";
import { POST as revokeReviewerSession } from "@/app/api/production/recognition/reviewer-sessions/[sessionId]/revoke/route";
import { GET as getReviewerWorkspace } from "@/app/api/production/recognition/reviewer-sessions/[sessionId]/workspace/route";
import { POST as openReviewerSession } from "@/app/api/production/recognition/reviewer-sessions/route";
import { POST as prepareSubmission } from "@/app/api/production/recognition/submissions/route";
import { GET as getRecognitionWorkspace } from "@/app/api/production/recognition/workspace/route";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const now = "2026-12-12T18:00:00.000Z";
const hash = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

beforeAll(async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("FORTIFY_RUNTIME_MODE", "production");
  vi.stubEnv("DATABASE_URL", "postgres://migration.example.test/fortify");
  vi.stubEnv(
    "FORTIFY_APP_DATABASE_URL",
    "postgres://application.example.test/fortify",
  );
  vi.stubEnv(
    "FORTIFY_REQUEST_HASH_KEY",
    "fixture-request-hash-key-32-characters",
  );
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
  routeState.database = db();
});
afterAll(async () => {
  routeState.database = undefined;
  routeState.storage = undefined;
  await client.close();
  vi.unstubAllEnvs();
});

async function seedRecognition(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const owned = tenantRecord(fixture.context, now);
  const caseId = `recognition-case-${key}`;
  await database.insert(schema.renewalCases).values({
    id: caseId,
    ...owned,
    policyId: fixture.policyId,
    title: "Recognition renewal",
    status: "open",
    caseType: "renewal",
    peril: "wildfire",
    jurisdiction: "US-CA",
    propertyClass: "condominium",
    renewalDate: "2027-01-01",
    ownerSubject: fixture.context.actorSubject,
  });

  const sourceId = `recognition-source-${key}`,
    sourceVersionId = `${sourceId}-v1`;
  await database.insert(schema.governedSources).values({
    id: sourceId,
    ...owned,
    canonicalKey: sourceId,
    sourceClass: "insurer_mga_material",
    issuingAuthority: "Fictional market source",
    title: "Fictional review requirements",
    jurisdiction: "US-CA",
    officialUrl: `https://example.test/${key}`,
    authorityTier: "customer_supplied",
    reviewOwnerSubject: "source-owner",
  });
  await database.insert(schema.governedSourceVersions).values({
    id: sourceVersionId,
    ...owned,
    sourceId,
    versionNumber: 1,
    versionLabel: "2026.1",
    publicationDate: "2026-11-01",
    effectiveFrom: "2026-11-01",
    retrievalDate: "2026-12-01",
    sourceHash: key.padEnd(64, "a").slice(0, 64),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Internal fictional review only.",
    structuredSummary: { boundary: "No outcome implied." },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2027-02-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    authorSubject: "source-author",
    changeSummary: "Initial fixture source.",
  });
  await database.insert(schema.governedSourceReviews).values({
    id: `${sourceVersionId}-review`,
    ...owned,
    sourceVersionId,
    decision: "approved",
    reviewerSubject: "source-reviewer",
    note: "Current source and rights checked.",
    sourceCompared: true,
    rightsConfirmed: true,
    reviewedAt: now,
  });
  await database.insert(schema.governedSourcePublications).values({
    id: `${sourceVersionId}-publication`,
    ...owned,
    sourceVersionId,
    decision: "published",
    publisherSubject: "source-publisher",
    note: "Published bounded source.",
    publishedAt: now,
  });

  const profileId = `recognition-profile-${key}`,
    profileVersionId = `${profileId}-v1`;
  await database.insert(schema.targetProfiles).values({
    id: profileId,
    ...owned,
    canonicalKey: profileId,
    name: "California evidence profile",
    description: "Fictional evidence-readiness profile.",
    jurisdiction: "US-CA",
    peril: "wildfire",
    propertyClass: "condominium",
  });
  await database.insert(schema.targetProfileVersions).values({
    id: profileVersionId,
    ...owned,
    profileId,
    versionNumber: 1,
    effectiveFrom: "2026-11-01",
    status: "published",
    authorSubject: "profile-author",
    changeSummary: "Initial fixture.",
    limitations: "No designation, compliance, or insurance outcome.",
    recognitionState: "unavailable_no_commitment_registry",
  });
  await database.insert(schema.targetProfileReviews).values({
    id: `${profileVersionId}-review`,
    ...owned,
    profileVersionId,
    decision: "approved",
    reviewerSubject: "profile-reviewer",
    note: "Scope checked.",
    sourcePinsChecked: true,
    reviewedAt: now,
  });
  await database.insert(schema.targetProfilePublications).values({
    id: `${profileVersionId}-publication`,
    ...owned,
    profileVersionId,
    decision: "published",
    publisherSubject: "profile-publisher",
    note: "Published fixture profile.",
    publishedAt: now,
  });

  const playbookId = `recognition-playbook-${key}`,
    playbookVersionId = `${playbookId}-v1`;
  await database.insert(schema.marketPlaybooks).values({
    id: playbookId,
    ...owned,
    name: `Recognition playbook ${key}`,
    description: "Fictional destination review requirements.",
  });
  await database.insert(schema.playbookVersions).values({
    id: playbookVersionId,
    ...owned,
    playbookId,
    versionNumber: 1,
    marketId: fixture.marketId,
    jurisdiction: "US-CA",
    peril: "wildfire",
    propertyClass: "condominium",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2027-12-31",
    governedSourceVersionId: sourceVersionId,
    sourceName: "Fictional review requirements",
    sourceUrl: `https://example.test/${key}`,
    sourceVersion: "2026.1",
    sourceCitation: "Fixture section 1",
    verifyCurrent: true,
    changeSummary: "Initial fixture playbook.",
    contentHash: key.padEnd(64, "b").slice(0, 64),
    authorSubject: "playbook-author",
  });
  await database.insert(schema.playbookVersionReviews).values({
    id: `${playbookVersionId}-review`,
    ...owned,
    playbookVersionId,
    decision: "approved",
    reviewerSubject: "playbook-reviewer",
    note: "Source and destination scope checked.",
    reviewedAt: now,
  });
  await database.insert(schema.casePlaybookLinks).values({
    id: `${playbookVersionId}-link`,
    ...owned,
    caseId,
    playbookVersionId,
    destinationMarketId: fixture.marketId,
    linkedAt: now,
    linkedBy: fixture.context.actorSubject,
  });

  const submissionId = `recognition-submission-${key}`,
    submissionVersionId = `${submissionId}-v1`;
  const body = new TextEncoder().encode(
    JSON.stringify({
      schema: "fortify.test-submission.1",
      caseId,
      evidenceReadinessOnly: true,
    }),
  );
  const bodyHash = hash(body),
    storageObjectId = `${submissionVersionId}-storage`,
    objectKey = `tenants/${fixture.organizationId}/generated/submissions/${submissionVersionId}/manifest.json`;
  const storage = new DeterministicObjectStorageAdapter();
  await storage.put({
    key: objectKey,
    body,
    mimeType: "application/json",
    sha256: bodyHash,
  });
  await database.insert(schema.submissions).values({
    id: submissionId,
    ...owned,
    caseId,
    marketId: fixture.marketId,
    purpose: "Fictional evidence readiness review",
    status: "confirmed",
    currentVersionId: submissionVersionId,
  });
  await database.insert(schema.submissionVersions).values({
    id: submissionVersionId,
    ...owned,
    submissionId,
    versionNumber: 1,
    status: "confirmed",
    message:
      "Please review the exact evidence-readiness package; no outcome is implied.",
    caveats: [
      "Review does not imply insurance, pricing, capacity, renewal, or acceptance.",
    ],
    confirmedBy: fixture.context.actorSubject,
    confirmedAt: now,
    manifestHash: bodyHash,
  });
  await database.insert(schema.storageObjects).values({
    id: storageObjectId,
    ...owned,
    provider: storage.provider,
    bucket: storage.bucket,
    objectKey,
    originalFilename: "manifest.json",
    mimeType: "application/json",
    sizeBytes: body.byteLength,
    sha256: bodyHash,
    checksumAlgorithm: "sha256",
    encryptionMode: "AES256",
    state: "clean",
    scanStatus: "clean",
  });
  await database.insert(schema.malwareScanResults).values({
    id: `${storageObjectId}-scan`,
    ...owned,
    storageObjectId,
    scanner: "fortify-test",
    engineVersion: "1",
    status: "clean",
    findings: [],
    scannedAt: now,
  });
  await database.insert(schema.submissionArtifacts).values({
    id: `${submissionVersionId}-artifact`,
    ...owned,
    submissionVersionId,
    storageObjectId,
    artifactType: "manifest",
    filename: "manifest.json",
    mimeType: "application/json",
    sizeBytes: body.byteLength,
    sha256: bodyHash,
    generationRecipeVersion: "fortify-test-submission-1",
    generatedAt: now,
  });
  return {
    ...fixture,
    caseId,
    profileVersionId,
    playbookVersionId,
    submissionVersionId,
    storage,
  };
}

const prepareInput = (setup: Awaited<ReturnType<typeof seedRecognition>>) => ({
  submissionVersionId: setup.submissionVersionId,
  playbookVersionId: setup.playbookVersionId,
  profileVersionId: setup.profileVersionId,
  mappingIds: [],
  requestedAction: "Review exact evidence and return a disposition",
  destinationLabel: "Fictional market review desk",
  deliveryMethod: "secure_review_link" as const,
  readinessStatus: "ready_with_caveats" as const,
  blockerSnapshot: [],
  caveatSnapshot: ["Review-only; no downstream outcome implied."],
  humanConfirmed: true,
});

function request(
  url: string,
  credential: string,
  init?: RequestInit,
  kind: "session" | "bearer" = "session",
) {
  const headers = new Headers(init?.headers);
  if (kind === "session")
    headers.set("cookie", `fortify_session=${credential}`);
  else headers.set("authorization", `Bearer ${credential}`);
  return new NextRequest(url, {
    method: init?.method,
    headers,
    body: init?.body,
  });
}

function jsonBody(value: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

function routeParams<T extends Record<string, string>>(value: T) {
  return { params: Promise.resolve(value) };
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== "object") return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

async function issueSession(
  setup: Awaited<ReturnType<typeof seedRecognition>>,
  subject: string,
  role: OrganizationRole = "organization_owner",
) {
  const membership = await createActiveMembership(db(), {
    organizationId: setup.organizationId,
    subject,
    role,
  });
  return new IdentityService(db()).issueSession({
    profile: membership.profile,
    activeOrganizationId: setup.organizationId,
    ttlSeconds: 3_600,
  });
}

async function prepareThroughRoute(
  setup: Awaited<ReturnType<typeof seedRecognition>>,
  token: string,
  key: string,
) {
  routeState.storage = setup.storage;
  return prepareSubmission(
    request(
      "https://fortify.test/api/production/recognition/submissions",
      token,
      jsonBody({ ...prepareInput(setup), idempotencyKey: key }),
    ),
  );
}

async function prepareAndDeliverThroughRoutes(
  setup: Awaited<ReturnType<typeof seedRecognition>>,
  token: string,
  key: string,
) {
  expect(
    (await prepareThroughRoute(setup, token, `prepare-${key}`)).status,
  ).toBe(201);
  const response = await deliverSubmission(
    request(
      "https://fortify.test/api/production/recognition/deliveries",
      token,
      jsonBody({
        idempotencyKey: `deliver-${key}`,
        submissionVersionId: setup.submissionVersionId,
        destination: "fixture-review@example.test",
        humanConfirmed: true,
      }),
    ),
  );
  expect(response.status).toBe(201);
  return response;
}

describe("recognition submission, reviewer, and outcome governance", () => {
  test("pins exact artifacts, records failed retry and immutable delivery receipt, and replays idempotently", async () => {
    const setup = await seedRecognition("m9-delivery");
    const service = new RecognitionSubmissionService(
      db(),
      setup.storage,
      new DeterministicMarketDeliveryProvider(),
      new IdentityService(db(), () => new Date(now)),
      () => new Date(now),
    );
    const prepared = await service.prepareSubmission(
      setup.context,
      "prepare-1",
      prepareInput(setup),
    );
    expect(prepared).toMatchObject({
      mappingCount: 0,
      readinessStatus: "ready_with_caveats",
      replayed: false,
    });
    expect(
      await service.prepareSubmission(
        setup.context,
        "prepare-1",
        prepareInput(setup),
      ),
    ).toMatchObject({
      replayed: true,
      bindingId: (prepared as unknown as { bindingId: string }).bindingId,
    });
    await expect(
      service.prepareSubmission(setup.context, "prepare-blocked", {
        ...prepareInput(setup),
        blockerSnapshot: ["Missing current evidence"],
      }),
    ).rejects.toBeInstanceOf(RecognitionStateError);

    const unavailable = new RecognitionSubmissionService(
      db(),
      setup.storage,
      new UnavailableMarketDeliveryProvider(),
      new IdentityService(db(), () => new Date(now)),
      () => new Date(now),
    );
    await expect(
      unavailable.deliverSubmission(setup.context, "delivery-failed", {
        submissionVersionId: setup.submissionVersionId,
        destination: "fixture-review@example.test",
        humanConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(RecognitionStateError);
    const delivered = await service.deliverSubmission(
      setup.context,
      "delivery-success",
      {
        submissionVersionId: setup.submissionVersionId,
        destination: "fixture-review@example.test",
        humanConfirmed: true,
      },
    );
    expect(delivered).toMatchObject({
      status: "delivered",
      attemptNumber: 2,
      replayed: false,
    });
    expect(
      await service.deliverSubmission(setup.context, "delivery-success", {
        submissionVersionId: setup.submissionVersionId,
        destination: "fixture-review@example.test",
        humanConfirmed: true,
      }),
    ).toMatchObject({
      replayed: true,
      deliveryId: (delivered as unknown as { deliveryId: string }).deliveryId,
    });
    const attempts = await database
      .select()
      .from(schema.submissionDeliveries)
      .where(
        eq(
          schema.submissionDeliveries.submissionVersionId,
          setup.submissionVersionId,
        ),
      );
    expect(attempts.map((row) => [row.attemptNumber, row.status])).toEqual([
      [1, "failed"],
      [2, "delivered"],
    ]);
    const receipts = await database
      .select()
      .from(schema.deliveryReceipts)
      .where(
        eq(
          schema.deliveryReceipts.deliveryId,
          (delivered as unknown as { deliveryId: string }).deliveryId,
        ),
      );
    expect(receipts[0]).toMatchObject({
      humanConfirmed: true,
      receiptType: "review_link_created",
    });
    await expect(
      database
        .update(schema.deliveryReceipts)
        .set({ sourceReference: "tampered" })
        .where(eq(schema.deliveryReceipts.id, receipts[0].id)),
    ).rejects.toThrow();
  });

  test("isolates reviewer access, preserves correspondence, and keeps response categories separate", async () => {
    const setup = await seedRecognition("m9-reviewer");
    const service = new RecognitionSubmissionService(
      db(),
      setup.storage,
      new DeterministicMarketDeliveryProvider(),
      new IdentityService(db(), () => new Date(now)),
      () => new Date(now),
    );
    await service.prepareSubmission(
      setup.context,
      "prepare-reviewer",
      prepareInput(setup),
    );
    await service.deliverSubmission(setup.context, "deliver-reviewer", {
      submissionVersionId: setup.submissionVersionId,
      destination: "fixture-review@example.test",
      humanConfirmed: true,
    });
    const session = await service.openReviewerSession(setup.context, {
      submissionVersionId: setup.submissionVersionId,
      email: "reviewer@example.test",
      displayName: "Fictional reviewer",
      expiresAt: "2026-12-19T18:00:00.000Z",
      allowedActions: [
        "submission:read",
        "reviewer_request:create",
        "rating_treatment_event:create",
      ],
      downloadAllowed: false,
      humanConfirmed: true,
    });
    const reviewer = await new IdentityService(
      db(),
      () => new Date(now),
    ).resolveExternalAccess(session.token);
    const workspace = await service.getReviewerWorkspace(
      reviewer,
      session.sessionId,
    );
    expect(workspace).toMatchObject({
      session: { downloadAllowed: false },
      doctrine: {
        acceptanceNotImplied: true,
        missingOutcomesRemainUnknown: true,
      },
    });
    await expect(
      service.getReviewerWorkspace(
        { ...reviewer, actorSubject: "external:other" },
        session.sessionId,
      ),
    ).rejects.toBeInstanceOf(RecognitionStateError);
    const request = await service.requestClarification(reviewer, {
      reviewerSessionId: session.sessionId,
      requestType: "clarification",
      originalLanguage:
        "Please identify the exact scope represented by the package.",
      normalizedReason: "scope_clarification",
    });
    await service.respondToRequest(setup.context, {
      reviewerRequestId: request.reviewerRequestId,
      originalLanguage:
        "The package covers the shared buildings identified in the immutable manifest.",
      evidenceVersionIds: [],
      humanConfirmed: true,
    });
    const rating = await service.recordRatingResponse(reviewer, {
      submissionVersionId: setup.submissionVersionId,
      disposition: "unknown",
      sourceAuthority: "Fictional reviewer",
      sourceReference: "response-1",
      originalLanguage: "No rating determination is included.",
      normalizedReason: "no_rating_response",
      humanConfirmed: true,
    });
    expect(rating.disposition).toBe("unknown");
    await expect(
      service.recordRatingResponse(reviewer, {
        submissionVersionId: setup.submissionVersionId,
        disposition: "filed_discount_applied",
        sourceAuthority: "Fictional reviewer",
        sourceReference: "response-2",
        originalLanguage: "A discount may apply.",
        normalizedReason: "unverified_positive_treatment",
        humanConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(RecognitionValidationError);
    await expect(
      service.recordFundingResponse(reviewer, {
        submissionVersionId: setup.submissionVersionId,
        disposition: "approved",
        sourceAuthority: "Fictional reviewer",
        sourceReference: "response-3",
        originalLanguage: "Funding approved.",
        normalizedReason: "external_claim",
        humanConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(RecognitionStateError);
    const preserved = await database
      .select()
      .from(schema.reviewerRequests)
      .where(eq(schema.reviewerRequests.id, request.reviewerRequestId));
    expect(preserved[0]).toMatchObject({
      originalLanguage:
        "Please identify the exact scope represented by the package.",
      normalizedReason: "scope_clarification",
      status: "responded",
    });
    await expect(
      database
        .update(schema.reviewerRequests)
        .set({ originalLanguage: "tampered" })
        .where(eq(schema.reviewerRequests.id, request.reviewerRequestId)),
    ).rejects.toThrow();
    await expect(
      service.revokeReviewerSession(setup.context, session.sessionId, {
        reason: "Review cycle complete.",
        humanConfirmed: false,
      }),
    ).rejects.toBeInstanceOf(RecognitionStateError);
    await expect(
      service.revokeReviewerSession(setup.context, session.sessionId, {
        reason: "Review cycle complete.",
        humanConfirmed: true,
      }),
    ).resolves.toMatchObject({ status: "revoked" });
    await expect(
      service.getReviewerWorkspace(reviewer, session.sessionId),
    ).rejects.toBeInstanceOf(RecognitionStateError);
  });
});

describe("recognition request binding", () => {
  test("isolates and minimizes the authenticated workspace", async () => {
    const alpha = await seedRecognition("m9-routes-workspace-alpha");
    const beta = await seedRecognition("m9-routes-workspace-beta");
    const owner = await issueSession(alpha, "m9-workspace-owner");
    const auditor = await issueSession(
      alpha,
      "m9-workspace-auditor",
      "read_only_auditor",
    );
    const betaOwner = await issueSession(beta, "m9-workspace-beta-owner");

    expect(
      (await prepareThroughRoute(alpha, owner.token, "alpha")).status,
    ).toBe(201);
    expect(
      (await prepareThroughRoute(beta, betaOwner.token, "beta")).status,
    ).toBe(201);
    routeState.storage = alpha.storage;

    const denied = await prepareThroughRoute(alpha, auditor.token, "auditor");
    expect(denied.status).toBe(403);

    const foreign = await prepareSubmission(
      request(
        "https://fortify.test/api/production/recognition/submissions",
        owner.token,
        jsonBody({
          ...prepareInput(beta),
          idempotencyKey: "prepare-foreign",
        }),
      ),
    );
    expect([404, 409]).toContain(foreign.status);

    const response = await getRecognitionWorkspace(
      request(
        "https://fortify.test/api/production/recognition/workspace",
        owner.token,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const workspace = await response.json();
    expect(workspace.bindings).toHaveLength(1);
    expect(workspace.bindings[0].submissionVersionId).toBe(
      alpha.submissionVersionId,
    );
    expect(
      workspace.bindings.map(
        (item: { submissionVersionId: string }) => item.submissionVersionId,
      ),
    ).not.toContain(beta.submissionVersionId);
    const keys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "tokenHash",
      "externalPrincipalId",
      "externalAccessGrantId",
      "deliveredBy",
      "recordedBy",
      "decidedBy",
      "reviewedBy",
      "storageObjectId",
      "respondedBy",
      "requestedBy",
      "preparedBy",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);
  });

  test("binds delivery, reviewer identity, correspondence, and revocation", async () => {
    const alpha = await seedRecognition("m9-routes-reviewer-alpha");
    const beta = await seedRecognition("m9-routes-reviewer-beta");
    const owner = await issueSession(alpha, "m9-reviewer-owner");
    await prepareAndDeliverThroughRoutes(alpha, owner.token, "reviewer");

    const foreignDelivery = await deliverSubmission(
      request(
        "https://fortify.test/api/production/recognition/deliveries",
        owner.token,
        jsonBody({
          idempotencyKey: "deliver-foreign",
          submissionVersionId: beta.submissionVersionId,
          destination: "foreign@example.test",
          humanConfirmed: true,
        }),
      ),
    );
    expect([404, 409]).toContain(foreignDelivery.status);

    const openedResponse = await openReviewerSession(
      request(
        "https://fortify.test/api/production/recognition/reviewer-sessions",
        owner.token,
        jsonBody({
          submissionVersionId: alpha.submissionVersionId,
          email: "reviewer@example.test",
          displayName: "Fictional reviewer",
          expiresAt: "2026-12-19T18:00:00.000Z",
          allowedActions: [
            "submission:read",
            "reviewer_request:create",
            "rating_treatment_event:create",
          ],
          downloadAllowed: false,
          humanConfirmed: true,
        }),
      ),
    );
    expect(openedResponse.status).toBe(201);
    const opened = (await openedResponse.json()) as {
      sessionId: string;
      token: string;
    };

    const memberDenied = await getReviewerWorkspace(
      request(
        `https://fortify.test/api/production/recognition/reviewer-sessions/${opened.sessionId}/workspace`,
        owner.token,
      ),
      routeParams({ sessionId: opened.sessionId }),
    );
    expect(memberDenied.status).toBe(409);

    const reviewerWorkspaceResponse = await getReviewerWorkspace(
      request(
        `https://fortify.test/api/production/recognition/reviewer-sessions/${opened.sessionId}/workspace`,
        opened.token,
        undefined,
        "bearer",
      ),
      routeParams({ sessionId: opened.sessionId }),
    );
    expect(reviewerWorkspaceResponse.status).toBe(200);
    const reviewerWorkspace = await reviewerWorkspaceResponse.json();
    expect(reviewerWorkspace).toMatchObject({
      session: { id: opened.sessionId, downloadAllowed: false },
      submission: { versionId: alpha.submissionVersionId },
      doctrine: { acceptanceNotImplied: true },
    });
    const reviewerKeys = collectKeys(reviewerWorkspace);
    for (const forbidden of [
      "organizationId",
      "tokenHash",
      "externalPrincipalId",
      "externalAccessGrantId",
      "createdAt",
      "updatedAt",
      "revision",
      "recordedBy",
      "requestedBy",
    ])
      expect(reviewerKeys.has(forbidden), forbidden).toBe(false);

    const requestedResponse = await requestClarification(
      request(
        "https://fortify.test/api/production/recognition/reviewer-requests",
        opened.token,
        jsonBody({
          reviewerSessionId: opened.sessionId,
          requestType: "clarification",
          originalLanguage: "Please identify the exact represented scope.",
          normalizedReason: "scope_clarification",
        }),
        "bearer",
      ),
    );
    expect(requestedResponse.status).toBe(201);
    const requested = (await requestedResponse.json()) as {
      reviewerRequestId: string;
    };

    const responded = await respondToReviewerRequest(
      request(
        `https://fortify.test/api/production/recognition/reviewer-requests/${requested.reviewerRequestId}/responses`,
        owner.token,
        jsonBody({
          originalLanguage:
            "The package covers only the shared buildings in the manifest.",
          evidenceVersionIds: [],
          humanConfirmed: true,
        }),
      ),
      routeParams({ requestId: requested.reviewerRequestId }),
    );
    expect(responded.status).toBe(201);

    const revoked = await revokeReviewerSession(
      request(
        `https://fortify.test/api/production/recognition/reviewer-sessions/${opened.sessionId}/revoke`,
        owner.token,
        jsonBody({ reason: "Review cycle complete.", humanConfirmed: true }),
      ),
      routeParams({ sessionId: opened.sessionId }),
    );
    expect(revoked.status).toBe(200);
    const afterRevocation = await getReviewerWorkspace(
      request(
        `https://fortify.test/api/production/recognition/reviewer-sessions/${opened.sessionId}/workspace`,
        opened.token,
        undefined,
        "bearer",
      ),
      routeParams({ sessionId: opened.sessionId }),
    );
    expect(afterRevocation.status).not.toBe(200);
  });

  test("binds separated response, closure, and maintenance decisions", async () => {
    const alpha = await seedRecognition("m9-routes-decisions-alpha");
    const beta = await seedRecognition("m9-routes-decisions-beta");
    const owner = await issueSession(alpha, "m9-decisions-owner");
    const auditor = await issueSession(
      alpha,
      "m9-decisions-auditor",
      "read_only_auditor",
    );
    await prepareAndDeliverThroughRoutes(alpha, owner.token, "decisions");

    const basis = {
      submissionVersionId: alpha.submissionVersionId,
      sourceAuthority: "Fictional market reviewer",
      sourceReference: "response-route-1",
      originalLanguage: "Exact fictional response language.",
      normalizedReason: "externally_recorded_fixture",
      humanConfirmed: true,
    };
    const cases: Array<{
      category: string;
      body: Record<string, unknown>;
      status: number;
    }> = [
      {
        category: "evidence",
        body: {
          ...basis,
          evidenceVersionId: "not-pinned",
          disposition: "accepted",
        },
        status: 409,
      },
      {
        category: "model",
        body: {
          ...basis,
          mappingId: "not-pinned",
          disposition: "mapping_rejected",
        },
        status: 409,
      },
      {
        category: "rating",
        body: { ...basis, disposition: "unknown" },
        status: 201,
      },
      {
        category: "underwriting",
        body: { ...basis, disposition: "quote_review_initiated" },
        status: 201,
      },
      {
        category: "placement",
        body: { ...basis, disposition: "no_quote" },
        status: 201,
      },
      {
        category: "funding",
        body: { ...basis, disposition: "programme_ineligible" },
        status: 201,
      },
    ];
    for (const item of cases) {
      const response = await recordRecognitionResponse(
        request(
          `https://fortify.test/api/production/recognition/responses/${item.category}`,
          owner.token,
          jsonBody(item.body),
        ),
        routeParams({ category: item.category }),
      );
      expect(response.status, item.category).toBe(item.status);
    }
    const unknown = await recordRecognitionResponse(
      request(
        "https://fortify.test/api/production/recognition/responses/unknown",
        owner.token,
        jsonBody(basis),
      ),
      routeParams({ category: "unknown" }),
    );
    expect(unknown.status).toBe(404);

    const closed = await closeRecognitionCase(
      request(
        "https://fortify.test/api/production/recognition/case-closures",
        owner.token,
        jsonBody({
          caseId: alpha.caseId,
          submissionVersionId: alpha.submissionVersionId,
          closureStatus: "closed_outcome_pending",
          unresolvedCaveats: ["Placement remains unknown."],
          note: "Close the evidence review cycle without filling outcomes.",
          humanConfirmed: true,
        }),
      ),
    );
    expect(closed.status).toBe(201);

    const deniedClosure = await closeRecognitionCase(
      request(
        "https://fortify.test/api/production/recognition/case-closures",
        auditor.token,
        jsonBody({
          caseId: alpha.caseId,
          submissionVersionId: alpha.submissionVersionId,
          closureStatus: "corrected",
          unresolvedCaveats: [],
          note: "Auditor must not close.",
          humanConfirmed: true,
        }),
      ),
    );
    expect(deniedClosure.status).toBe(403);

    const foreignClosure = await closeRecognitionCase(
      request(
        "https://fortify.test/api/production/recognition/case-closures",
        owner.token,
        jsonBody({
          caseId: beta.caseId,
          submissionVersionId: beta.submissionVersionId,
          closureStatus: "closed",
          unresolvedCaveats: [],
          note: "Foreign tenant must not close.",
          humanConfirmed: true,
        }),
      ),
    );
    expect([403, 404, 409]).toContain(foreignClosure.status);

    const unconfirmedMaintenance = await rollForwardMaintenance(
      request(
        "https://fortify.test/api/production/recognition/maintenance-roll-forwards",
        owner.token,
        jsonBody({
          sourceCaseId: alpha.caseId,
          targetCaseId: "later-case",
          maintenanceObligationId: "maintenance-obligation",
          status: "review_required",
          basis: "Human review required.",
          humanConfirmed: false,
        }),
      ),
    );
    expect(unconfirmedMaintenance.status).toBe(409);
  });
});

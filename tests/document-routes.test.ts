import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { IdentityService } from "@/lib/production/identity-service";
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
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return {
    ...original,
    getProductionDatabase: () => routeState.database,
  };
});

import { POST as reviewField } from "@/app/api/production/documents/fields/[extractedFieldId]/review/route";
import { POST as intakeDocument } from "@/app/api/production/documents/intake/route";
import { POST as retryDocumentJob } from "@/app/api/production/documents/jobs/[jobId]/retry/route";
import { GET as getDocumentWorkspace } from "@/app/api/production/documents/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;

type DocumentTenant = TenantFixture & {
  caseId: string;
  storageObjectId: string;
  intakeStorageObjectId: string;
  sourceDocumentId: string;
  jobId: string;
  extractedFieldId: string;
};

const at = "2026-08-04T08:00:00.000Z";

function requestWithSession(url: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", `fortify_session=${token}`);
  return new NextRequest(url, {
    method: init?.method,
    headers,
    body: init?.body,
  });
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

async function seedDocumentTenant(
  database: ProductionDatabaseLike,
  key: string,
  existingFixture?: TenantFixture,
): Promise<DocumentTenant> {
  const fixture = existingFixture ?? (await createTenantFixture(database, key));
  const owned = tenantRecord(fixture.context, at);
  const caseId = `case-${key}`;
  const storageObjectId = `storage-document-${key}`;
  const intakeStorageObjectId = `storage-intake-${key}`;
  const sourceDocumentId = `source-document-${key}`;
  const jobId = `document-job-${key}`;
  const extractionRunId = `document-run-${key}`;
  const sourcePassageId = `document-passage-${key}`;
  const extractedFieldId = `document-field-${key}`;

  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-key-${key}`,
    {
      id: caseId,
      policyId: fixture.policyId,
      title: `Renewal ${key}`,
      status: "open",
      caseType: "renewal",
      peril: "wildfire",
      jurisdiction: "California",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
      ownerSubject: fixture.context.actorSubject,
    },
  );
  await database.insert(schema.storageObjects).values([
    {
      id: storageObjectId,
      ...owned,
      provider: "test-private-storage",
      bucket: "secret-tenant-bucket",
      objectKey: `tenants/${fixture.organizationId}/documents/${key}-source.pdf`,
      originalFilename: `${key}-source.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 128,
      sha256: `${key.padEnd(64, "0").slice(0, 64)}`,
      encryptionMode: "aws:kms",
      encryptionKeyId: "secret-kms-key",
      state: "clean",
      scanStatus: "clean",
    },
    {
      id: intakeStorageObjectId,
      ...owned,
      provider: "test-private-storage",
      bucket: "secret-tenant-bucket",
      objectKey: `tenants/${fixture.organizationId}/documents/${key}-intake.pdf`,
      originalFilename: `${key}-intake.pdf`,
      mimeType: "application/pdf",
      sizeBytes: 256,
      sha256: `1${key.padEnd(63, "1").slice(0, 63)}`,
      encryptionMode: "AES256",
      state: "clean",
      scanStatus: "clean",
    },
  ]);
  await database.insert(schema.sourceDocuments).values({
    id: sourceDocumentId,
    ...owned,
    caseId,
    storageObjectId,
    versionNumber: 1,
    documentType: "carrier_notice",
    classificationConfidence: "0.9400",
    classifierKey: "fixture-classifier",
    classifierVersion: "1.0.0",
    filename: `${key}-source.pdf`,
    mimeType: "application/pdf",
    storageKey: `tenants/${fixture.organizationId}/documents/source.pdf`,
    sha256: `${key.padEnd(64, "0").slice(0, 64)}`,
    sourceSystem: "confidential-provider-system",
    receivedAt: at,
    processingStatus: "review_required",
    synthetic: false,
  });
  await database.insert(schema.documentProcessingJobs).values({
    id: jobId,
    ...owned,
    sourceDocumentId,
    pipelineVersion: "fortify-document-pipeline-v1",
    status: "dead_letter",
    attemptCount: 3,
    maxAttempts: 3,
    availableAt: at,
    leaseOwner: "secret-worker-lease",
    lastErrorCode: "fixture_terminal_error",
    lastErrorMessage: "A bounded fixture failure for the visible retry state.",
    deadLetteredAt: at,
  });
  await database.insert(schema.documentProcessingAttempts).values({
    id: `document-attempt-${key}`,
    ...owned,
    jobId,
    attemptNumber: 3,
    workerId: "secret-worker-identity",
    status: "failed_terminal",
    providerKey: "fixture-provider",
    providerVersion: "1.0.0",
    errorCode: "fixture_terminal_error",
    errorMessage: "Internal provider diagnostics must not cross the API.",
    startedAt: at,
    finishedAt: at,
  });
  await database.insert(schema.documentExtractionRuns).values({
    id: extractionRunId,
    ...owned,
    sourceDocumentId,
    jobId,
    providerKey: "fixture-provider",
    providerVersion: "1.0.0",
    extractorKey: "fixture-extractor",
    extractorVersion: "1.0.0",
    inputSha256: `${key.padEnd(64, "0").slice(0, 64)}`,
    modelDerived: false,
    pageCount: 1,
    warnings: [],
    status: "succeeded",
    startedAt: at,
    completedAt: at,
  });
  await database.insert(schema.sourcePassages).values({
    id: sourcePassageId,
    ...owned,
    sourceDocumentId,
    extractionRunId,
    pageNumber: 1,
    segment: "line-1",
    region: { x: 0.1, y: 0.2, width: 0.5, height: 0.05 },
    passageKind: "line",
    textContent: `Policy: ${key.toUpperCase()}-100`,
    extractorVersion: "fixture-provider@1.0.0",
    confidence: "0.9300",
    confirmationStatus: "unreviewed",
  });
  await database.insert(schema.extractedFields).values({
    id: extractedFieldId,
    ...owned,
    sourceDocumentId,
    extractionRunId,
    sourcePassageId,
    fieldKey: "policy",
    fieldLabel: "Policy",
    candidateOrdinal: 1,
    value: `${key.toUpperCase()}-100`,
    valueType: "text",
    confidence: "0.9300",
    modelDerived: false,
  });
  return {
    ...fixture,
    caseId,
    storageObjectId,
    intakeStorageObjectId,
    sourceDocumentId,
    jobId,
    extractedFieldId,
  };
}

describe("document request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let productionDatabase: ProductionDatabaseLike;

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
    vi.stubEnv("FORTIFY_STORAGE_BUCKET", "document-route-fixture");
    vi.stubEnv("FORTIFY_STORAGE_REGION", "us-west-2");
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
    productionDatabase = database as unknown as ProductionDatabaseLike;
    routeState.database = productionDatabase;
  }, 90_000);

  afterAll(async () => {
    routeState.database = undefined;
    await client.close();
    vi.unstubAllEnvs();
  });

  async function issueSession(
    fixture: TenantFixture,
    key: string,
    role: OrganizationRole,
  ) {
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: fixture.organizationId,
      subject: `document-route-${key}`,
      role,
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  async function issueAssignedSession(
    fixture: DocumentTenant,
    key: string,
    caseId: string,
  ) {
    const subject = `document-route-${key}`;
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: fixture.organizationId,
      subject,
      role: "broker",
    });
    await productionDatabase.insert(schema.caseAssignments).values({
      id: `case-assignment-${key}`,
      ...tenantRecord(fixture.context, at),
      caseId,
      membershipId: membership.membershipId,
      assignmentRole: "owner",
      accessPurpose: "Document workspace case assignment",
      permissions: ["*"],
      dataDomains: ["document_intelligence"],
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  test("returns a tenant-only minimized workspace and queues only tenant-owned clean objects", async () => {
    const alpha = await seedDocumentTenant(
      productionDatabase,
      "document-route-alpha",
    );
    const beta = await seedDocumentTenant(
      productionDatabase,
      "document-route-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "workspace-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "workspace-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getDocumentWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/documents/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      cases: Array<{ id: string }>;
      cleanObjects: Array<{ id: string }>;
      documents: Array<{ id: string }>;
      jobs: Array<{ id: string }>;
      candidates: Array<{ id: string }>;
    };
    expect(workspace.cases.map((item) => item.id)).toEqual([alpha.caseId]);
    expect(workspace.cleanObjects.map((item) => item.id).toSorted()).toEqual(
      [alpha.intakeStorageObjectId, alpha.storageObjectId].toSorted(),
    );
    expect(workspace.documents.map((item) => item.id)).toEqual([
      alpha.sourceDocumentId,
    ]);
    expect(workspace.jobs.map((item) => item.id)).toEqual([alpha.jobId]);
    expect(workspace.candidates.map((item) => item.id)).toEqual([
      alpha.extractedFieldId,
    ]);
    const responseKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "storageKey",
      "sourceSystem",
      "receivedAt",
      "synthetic",
      "bucket",
      "objectKey",
      "encryptionMode",
      "encryptionKeyId",
      "state",
      "scanStatus",
      "workerId",
      "errorMessage",
      "finishedAt",
      "inputSha256",
      "reviewerPrincipalType",
      "reviewId",
      "leaseOwner",
      "leaseExpiresAt",
      "deadLetteredAt",
    ])
      expect(responseKeys.has(forbidden), forbidden).toBe(false);

    const crossTenant = await intakeDocument(
      requestWithSession(
        "https://fortify.test/api/production/documents/intake",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storageObjectId: beta.intakeStorageObjectId,
            caseId: beta.caseId,
            idempotencyKey: "cross-tenant-document-intake",
          }),
        },
      ),
    );
    expect(crossTenant.status).toBe(400);

    const denied = await intakeDocument(
      requestWithSession(
        "https://fortify.test/api/production/documents/intake",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storageObjectId: alpha.intakeStorageObjectId,
            caseId: alpha.caseId,
            idempotencyKey: "read-only-document-intake",
          }),
        },
      ),
    );
    expect(denied.status).toBe(403);

    const queued = await intakeDocument(
      requestWithSession(
        "https://fortify.test/api/production/documents/intake",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storageObjectId: alpha.intakeStorageObjectId,
            caseId: alpha.caseId,
            idempotencyKey: "request-bound-document-intake",
          }),
        },
      ),
    );
    expect(queued.status).toBe(202);
    expect(queued.headers.get("cache-control")).toBe("no-store");
    const queuedBody = (await queued.json()) as Record<string, unknown>;
    expect(Object.keys(queuedBody).toSorted()).toEqual([
      "duplicate",
      "jobId",
      "sourceDocumentId",
    ]);
    expect(queuedBody).toMatchObject({ duplicate: false });
    const betaDocuments = await productionDatabase
      .select({ id: schema.sourceDocuments.id })
      .from(schema.sourceDocuments)
      .where(
        and(
          eq(schema.sourceDocuments.organizationId, beta.organizationId),
          eq(
            schema.sourceDocuments.storageObjectId,
            beta.intakeStorageObjectId,
          ),
        ),
      );
    expect(betaDocuments).toEqual([]);
  }, 30_000);

  test("limits document lineage to assigned cases and denies incomplete read authority", async () => {
    const alpha = await seedDocumentTenant(
      productionDatabase,
      "document-assignment-alpha",
    );
    const sibling = await seedDocumentTenant(
      productionDatabase,
      "document-assignment-sibling",
      alpha,
    );
    const assignedSession = await issueAssignedSession(
      alpha,
      "assigned-broker",
      alpha.caseId,
    );
    const assignedUploadId = "storage-document-assigned-upload";
    await productionDatabase.insert(schema.storageObjects).values({
      id: assignedUploadId,
      ...tenantRecord(
        {
          ...alpha.context,
          actorSubject: "test-oidc:document-route-assigned-broker",
        },
        at,
      ),
      provider: "test-private-storage",
      bucket: "secret-tenant-bucket",
      objectKey: `tenants/${alpha.organizationId}/documents/assigned-upload.pdf`,
      originalFilename: "assigned-upload.pdf",
      mimeType: "application/pdf",
      sizeBytes: 512,
      sha256: "a".repeat(64),
      encryptionMode: "aws:kms",
      encryptionKeyId: "secret-kms-key",
      state: "clean",
      scanStatus: "clean",
    });

    const assignedResponse = await getDocumentWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/documents/workspace",
        assignedSession.token,
      ),
    );
    expect(assignedResponse.status).toBe(200);
    const assigned = (await assignedResponse.json()) as {
      cases: Array<{ id: string }>;
      cleanObjects: Array<{ id: string }>;
      documents: Array<{ id: string }>;
      jobs: Array<{ id: string }>;
      attempts: Array<{ jobId: string }>;
      runs: Array<{ sourceDocumentId: string }>;
      passages: Array<{ sourceDocumentId: string }>;
      candidates: Array<{ sourceDocumentId: string }>;
    };
    expect(assigned.cases.map((item) => item.id)).toEqual([alpha.caseId]);
    expect(assigned.cleanObjects.map((item) => item.id).toSorted()).toEqual(
      [alpha.storageObjectId, assignedUploadId].toSorted(),
    );
    expect(assigned.documents.map((item) => item.id)).toEqual([
      alpha.sourceDocumentId,
    ]);
    expect(assigned.jobs.map((item) => item.id)).toEqual([alpha.jobId]);
    expect(assigned.attempts.map((item) => item.jobId)).toEqual([alpha.jobId]);
    expect(assigned.runs.map((item) => item.sourceDocumentId)).toEqual([
      alpha.sourceDocumentId,
    ]);
    expect(assigned.passages.map((item) => item.sourceDocumentId)).toEqual([
      alpha.sourceDocumentId,
    ]);
    expect(assigned.candidates.map((item) => item.sourceDocumentId)).toEqual([
      alpha.sourceDocumentId,
    ]);
    expect(JSON.stringify(assigned)).not.toContain(sibling.caseId);
    expect(JSON.stringify(assigned)).not.toContain(sibling.sourceDocumentId);
    expect(JSON.stringify(assigned)).not.toContain(alpha.intakeStorageObjectId);

    const narrowCredential = await new IdentityService(
      productionDatabase,
    ).createServiceAccount(alpha.context, {
      name: "Narrow document reader",
      scopes: ["source_document:read"],
    });
    const denied = await getDocumentWorkspace(
      new NextRequest(
        "https://fortify.test/api/production/documents/workspace",
        {
          headers: {
            authorization: `Bearer ${narrowCredential.token}`,
          },
        },
      ),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: "The active principal is not authorized for this resource.",
    });
  }, 30_000);

  test("rejects cross-tenant and read-only review/retry while returning minimized receipts", async () => {
    const alpha = await seedDocumentTenant(
      productionDatabase,
      "document-action-alpha",
    );
    const beta = await seedDocumentTenant(
      productionDatabase,
      "document-action-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "action-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "action-auditor",
      "read_only_auditor",
    );

    const crossTenantReview = await reviewField(
      requestWithSession(
        `https://fortify.test/api/production/documents/fields/${beta.extractedFieldId}/review`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "confirmed" }),
        },
      ),
      { params: Promise.resolve({ extractedFieldId: beta.extractedFieldId }) },
    );
    expect(crossTenantReview.status).toBe(404);

    const deniedReview = await reviewField(
      requestWithSession(
        `https://fortify.test/api/production/documents/fields/${alpha.extractedFieldId}/review`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "confirmed" }),
        },
      ),
      { params: Promise.resolve({ extractedFieldId: alpha.extractedFieldId }) },
    );
    expect(deniedReview.status).toBe(403);

    const reviewed = await reviewField(
      requestWithSession(
        `https://fortify.test/api/production/documents/fields/${alpha.extractedFieldId}/review`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "confirmed",
            note: "Compared with the exact source passage.",
          }),
        },
      ),
      { params: Promise.resolve({ extractedFieldId: alpha.extractedFieldId }) },
    );
    expect(reviewed.status).toBe(200);
    expect(reviewed.headers.get("cache-control")).toBe("no-store");
    expect(Object.keys((await reviewed.json()) as object).toSorted()).toEqual([
      "action",
      "factId",
      "reviewId",
      "reviewedValue",
      "versionNumber",
    ]);

    const crossTenantRetry = await retryDocumentJob(
      requestWithSession(
        `https://fortify.test/api/production/documents/jobs/${beta.jobId}/retry`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Cross-tenant retry must fail." }),
        },
      ),
      { params: Promise.resolve({ jobId: beta.jobId }) },
    );
    expect(crossTenantRetry.status).toBe(404);

    const deniedRetry = await retryDocumentJob(
      requestWithSession(
        `https://fortify.test/api/production/documents/jobs/${alpha.jobId}/retry`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Read-only retry must fail." }),
        },
      ),
      { params: Promise.resolve({ jobId: alpha.jobId }) },
    );
    expect(deniedRetry.status).toBe(403);

    const retried = await retryDocumentJob(
      requestWithSession(
        `https://fortify.test/api/production/documents/jobs/${alpha.jobId}/retry`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reason: "Owner reviewed the bounded terminal failure.",
          }),
        },
      ),
      { params: Promise.resolve({ jobId: alpha.jobId }) },
    );
    expect(retried.status).toBe(200);
    expect(retried.headers.get("cache-control")).toBe("no-store");
    expect(await retried.json()).toEqual({
      jobId: alpha.jobId,
      status: "queued",
      maxAttempts: 4,
      availableAt: expect.any(String),
    });
    const betaJob = await productionDatabase
      .select({
        status: schema.documentProcessingJobs.status,
        maxAttempts: schema.documentProcessingJobs.maxAttempts,
      })
      .from(schema.documentProcessingJobs)
      .where(eq(schema.documentProcessingJobs.id, beta.jobId));
    expect(betaJob).toEqual([{ status: "dead_letter", maxAttempts: 3 }]);
  }, 30_000);
});

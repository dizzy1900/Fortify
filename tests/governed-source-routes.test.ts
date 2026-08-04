import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { IdentityService } from "@/lib/production/identity-service";
import type {
  ProductionDatabaseLike,
  TenantContext,
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

import { POST as createSourceVersion } from "@/app/api/production/sources/[sourceId]/versions/route";
import { POST as createSource } from "@/app/api/production/sources/route";
import { POST as publishSourceVersion } from "@/app/api/production/sources/versions/[versionId]/publish/route";
import { POST as reviewSourceVersion } from "@/app/api/production/sources/versions/[versionId]/review/route";
import { GET as getSourceWorkspace } from "@/app/api/production/sources/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type SourceFixture = TenantFixture & {
  sourceId: string;
  sourceVersionId: string;
};

const currentTime = new Date("2026-08-04T12:00:00.000Z");

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

function asActor(context: TenantContext, actorSubject: string): TenantContext {
  return {
    ...context,
    actorSubject,
    role: "organization_owner",
  };
}

function sourceInput(key: string) {
  return {
    canonicalKey: `ca-request-bound-${key}`,
    sourceClass: "regulator_guidance" as const,
    issuingAuthority: `California authority ${key}`,
    title: `Request-bound source ${key}`,
    jurisdiction: "California",
    officialUrl: `https://example.test/sources/${key}`,
    authorityTier: "primary" as const,
    reviewOwnerSubject: `source-owner-${key}`,
  };
}

function versionInput(key: string) {
  return {
    versionLabel: "2026.1",
    publicationDate: "2026-08-01",
    effectiveFrom: "2026-08-01",
    retrievalDate: "2026-08-04",
    sourceHash: createHash("sha256").update(key).digest("hex"),
    snapshotState: "metadata_only_restricted" as const,
    rightsStatus: "restricted" as const,
    redistributionAllowed: false,
    useRestrictions: "Metadata-only fixture; redistribution is not authorized.",
    structuredSummary: {
      scope: "Request-bound source authority test fixture.",
    },
    verifyCurrentStatus: "verified_current" as const,
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored" as const,
    humanConfirmed: true,
    changeSummary: "Initial request-bound source version.",
  };
}

async function seedSource(
  database: ProductionDatabaseLike,
  key: string,
  actorSubject: string,
): Promise<SourceFixture> {
  const fixture = await createTenantFixture(database, key);
  const context = asActor(fixture.context, actorSubject);
  const service = new GovernedSourceService(database, () => currentTime);
  const source = await service.createSource(context, sourceInput(key));
  const version = await service.createVersion(context, {
    sourceId: source.sourceId,
    ...versionInput(key),
  });
  return {
    ...fixture,
    sourceId: source.sourceId,
    sourceVersionId: version.sourceVersionId,
  };
}

describe("governed source request binding", () => {
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
    subject: string,
    role: OrganizationRole,
  ) {
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: fixture.organizationId,
      subject,
      role,
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  test("returns only the authenticated tenant and minimizes create receipts", async () => {
    const alpha = await seedSource(
      productionDatabase,
      "source-workspace-alpha",
      "source-workspace-alpha-author",
    );
    const beta = await seedSource(
      productionDatabase,
      "source-workspace-beta",
      "source-workspace-beta-author",
    );
    const ownerSession = await issueSession(
      alpha,
      "source-workspace-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "source-workspace-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getSourceWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/sources/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      sources: Array<{ id: string }>;
      versions: Array<{ id: string }>;
      reviews: unknown[];
      publications: unknown[];
      dependencies: unknown[];
      alerts: unknown[];
    };
    expect(workspace.sources.map((source) => source.id)).toEqual([
      alpha.sourceId,
    ]);
    expect(workspace.versions.map((version) => version.id)).toEqual([
      alpha.sourceVersionId,
    ]);
    expect(workspace.reviews).toEqual([]);
    expect(workspace.publications).toEqual([]);
    expect(workspace.dependencies).toEqual([]);
    expect(workspace.alerts).toEqual([]);
    const workspaceKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "storageObjectId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "pinnedBy",
    ])
      expect(workspaceKeys.has(forbidden), forbidden).toBe(false);

    const deniedSource = await createSource(
      requestWithSession(
        "https://fortify.test/api/production/sources",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sourceInput("auditor-denied")),
        },
      ),
    );
    expect(deniedSource.status).toBe(403);

    const sourceResponse = await createSource(
      requestWithSession(
        "https://fortify.test/api/production/sources",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sourceInput("route-created")),
        },
      ),
    );
    expect(sourceResponse.status).toBe(201);
    expect(sourceResponse.headers.get("cache-control")).toBe("no-store");
    const sourceReceipt = (await sourceResponse.json()) as {
      sourceId: string;
      canonicalKey: string;
      operative: boolean;
    };
    expect(Object.keys(sourceReceipt).toSorted()).toEqual([
      "canonicalKey",
      "operative",
      "sourceId",
    ]);
    expect(sourceReceipt.operative).toBe(false);

    const crossTenantVersion = await createSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/${beta.sourceId}/versions`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(versionInput("cross-tenant-version")),
        },
      ),
      { params: Promise.resolve({ sourceId: beta.sourceId }) },
    );
    expect(crossTenantVersion.status).toBe(404);

    const versionResponse = await createSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/${sourceReceipt.sourceId}/versions`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(versionInput("route-created-version")),
        },
      ),
      { params: Promise.resolve({ sourceId: sourceReceipt.sourceId }) },
    );
    expect(versionResponse.status).toBe(201);
    expect(versionResponse.headers.get("cache-control")).toBe("no-store");
    const versionReceipt = (await versionResponse.json()) as Record<
      string,
      unknown
    >;
    expect(Object.keys(versionReceipt).toSorted()).toEqual([
      "operative",
      "sourceVersionId",
      "versionNumber",
    ]);
    expect(versionReceipt).toMatchObject({
      operative: false,
      versionNumber: 1,
    });

    const betaSources = await productionDatabase
      .select({ id: schema.governedSources.id })
      .from(schema.governedSources)
      .where(eq(schema.governedSources.organizationId, beta.organizationId));
    expect(betaSources).toEqual([{ id: beta.sourceId }]);
  }, 45_000);

  test("rejects cross-tenant and read-only decisions and enforces three-person publication", async () => {
    const authorSubject = "source-decision-author";
    const reviewerSubject = "source-decision-reviewer";
    const publisherSubject = "source-decision-publisher";
    const alpha = await seedSource(
      productionDatabase,
      "source-decision-alpha",
      `test-oidc:${authorSubject}`,
    );
    const beta = await seedSource(
      productionDatabase,
      "source-decision-beta",
      "source-decision-beta-author",
    );
    const authorSession = await issueSession(
      alpha,
      authorSubject,
      "organization_owner",
    );
    const reviewerSession = await issueSession(
      alpha,
      reviewerSubject,
      "organization_owner",
    );
    const publisherSession = await issueSession(
      alpha,
      publisherSubject,
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "source-decision-auditor",
      "read_only_auditor",
    );
    const reviewBody = JSON.stringify({
      decision: "approved",
      note: "Exact source, dates, authority, and rights independently reviewed.",
      sourceCompared: true,
      rightsConfirmed: true,
    });

    const crossTenantReview = await reviewSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${beta.sourceVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.sourceVersionId }) },
    );
    expect(crossTenantReview.status).toBe(404);

    const authorReview = await reviewSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/review`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(authorReview.status).toBe(409);

    const auditorReview = await reviewSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/review`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(auditorReview.status).toBe(403);

    const reviewResponse = await reviewSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.headers.get("cache-control")).toBe("no-store");
    const reviewReceipt = (await reviewResponse.json()) as Record<
      string,
      unknown
    >;
    expect(Object.keys(reviewReceipt).toSorted()).toEqual([
      "decision",
      "reviewId",
      "reviewedAt",
    ]);

    const publicationBody = JSON.stringify({
      decision: "published",
      note: "Published only after distinct human review.",
    });
    const reviewerPublication = await publishSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/publish`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(reviewerPublication.status).toBe(409);

    const authorPublication = await publishSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/publish`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(authorPublication.status).toBe(409);

    const crossTenantPublication = await publishSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${beta.sourceVersionId}/publish`,
        publisherSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.sourceVersionId }) },
    );
    expect(crossTenantPublication.status).toBe(404);

    const publicationResponse = await publishSourceVersion(
      requestWithSession(
        `https://fortify.test/api/production/sources/versions/${alpha.sourceVersionId}/publish`,
        publisherSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      { params: Promise.resolve({ versionId: alpha.sourceVersionId }) },
    );
    expect(publicationResponse.status).toBe(200);
    expect(publicationResponse.headers.get("cache-control")).toBe("no-store");
    const publicationReceipt = (await publicationResponse.json()) as Record<
      string,
      unknown
    >;
    expect(Object.keys(publicationReceipt).toSorted()).toEqual([
      "alertId",
      "decision",
      "impact",
      "publicationId",
      "publishedAt",
    ]);
    expect(publicationReceipt).toMatchObject({
      decision: "published",
      alertId: null,
      impact: null,
    });

    const betaPublications = await productionDatabase
      .select({ id: schema.governedSourcePublications.id })
      .from(schema.governedSourcePublications)
      .where(
        eq(
          schema.governedSourcePublications.organizationId,
          beta.organizationId,
        ),
      );
    expect(betaPublications).toEqual([]);
  }, 45_000);
});

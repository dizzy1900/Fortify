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
import { MarketPlaybookService } from "@/lib/production/market-playbook-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
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

import { POST as evaluatePlaybookCase } from "@/app/api/production/playbooks/cases/[caseId]/evaluate/route";
import { POST as linkPlaybookCase } from "@/app/api/production/playbooks/cases/[caseId]/link/route";
import { POST as reviewPlaybookVersion } from "@/app/api/production/playbooks/versions/[versionId]/review/route";
import { POST as createPlaybookVersion } from "@/app/api/production/playbooks/versions/route";
import { GET as getPlaybookWorkspace } from "@/app/api/production/playbooks/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type PlaybookFixture = TenantFixture & {
  caseId: string;
  governedSourceVersionId: string;
  requirementVersionId: string;
  playbookId: string;
  playbookVersionId: string;
};

const currentTime = new Date("2026-08-04T12:00:00.000Z");
const currentTimestamp = currentTime.toISOString();

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

function asActor(
  context: TenantContext,
  actorSubject: string,
  role: OrganizationRole = "organization_owner",
): TenantContext {
  return { ...context, actorSubject, role };
}

function playbookVersionInput(
  fixture: Pick<
    PlaybookFixture,
    "marketId" | "governedSourceVersionId" | "requirementVersionId"
  >,
  key: string,
  jurisdiction = "California",
) {
  return {
    name: `Request-bound playbook ${key}`,
    description: "Deterministic request-bound playbook fixture.",
    marketId: fixture.marketId,
    jurisdiction,
    peril: "wildfire",
    propertyClass: "condominium",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2027-12-31",
    governedSourceVersionId: fixture.governedSourceVersionId,
    changeSummary: `Request-bound playbook version ${key}.`,
    requirements: [
      {
        requirementVersionId: fixture.requirementVersionId,
        importance: "required" as const,
        blocking: true,
        acceptedEvidenceTypes: ["inspection_report"],
        freshnessDays: 180,
        requiredScopeType: "property",
        acceptedSourceTypes: ["inspector"],
        requiredReviewStatus: "human_confirmed",
        conditions: [],
      },
    ],
  };
}

async function seedPlaybook(
  database: ProductionDatabaseLike,
  key: string,
): Promise<PlaybookFixture> {
  const fixture = await createTenantFixture(database, key);
  const author = asActor(fixture.context, `playbook-seed-author-${key}`);
  const caseId = `case-playbook-route-${key}`;
  await fixture.repository.createRenewalCase(author, `case-request-${key}`, {
    id: caseId,
    policyId: fixture.policyId,
    title: `Renewal ${key}`,
    status: "open",
    caseType: "renewal",
    peril: "wildfire",
    jurisdiction: "Colorado",
    propertyClass: "condominium",
    renewalDate: "2027-01-01",
  });

  const sourceService = new GovernedSourceService(database, () => currentTime);
  const source = await sourceService.createSource(author, {
    canonicalKey: `request-bound-playbook-source-${key}`,
    sourceClass: "insurer_mga_material",
    issuingAuthority: "Fictional destination authority",
    title: `Request-bound destination guide ${key}`,
    jurisdiction: "Colorado",
    officialUrl: `https://example.test/playbooks/${key}`,
    authorityTier: "customer_supplied",
    reviewOwnerSubject: `source-owner-${key}`,
  });
  const sourceVersion = await sourceService.createVersion(author, {
    sourceId: source.sourceId,
    versionLabel: "2026.1",
    retrievalDate: "2026-08-04",
    sourceHash: createHash("sha256").update(key).digest("hex"),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Fictional metadata fixture; no redistribution.",
    structuredSummary: { scope: "Request-bound playbook route fixture." },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial request-bound fixture source.",
  });
  await sourceService.reviewVersion(
    asActor(author, `source-reviewer-${key}`, "practice_leader"),
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "approved",
      note: "Exact fixture source and rights boundary reviewed.",
      sourceCompared: true,
      rightsConfirmed: true,
    },
  );
  await sourceService.publishVersion(
    asActor(author, `source-publisher-${key}`, "practice_leader"),
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "published",
      note: "Published only for deterministic route tests.",
    },
  );

  const owned = tenantRecord(author, currentTimestamp);
  const requirementSetId = `requirement-set-playbook-route-${key}`;
  const requirementId = `requirement-playbook-route-${key}`;
  const requirementVersionId = `requirement-version-playbook-route-${key}`;
  await database.insert(schema.requirementSets).values({
    id: requirementSetId,
    ...owned,
    marketId: fixture.marketId,
    name: `Request-bound requirements ${key}`,
    peril: "wildfire",
    jurisdiction: "Colorado",
    propertyClass: "condominium",
    sourceName: "Fictional destination configuration",
    sourceUrl: `https://example.test/requirements/${key}`,
    verifyCurrent: true,
  });
  await database.insert(schema.requirements).values({
    id: requirementId,
    ...owned,
    requirementSetId,
    code: `inspection_${key}`,
    title: `Inspection ${key}`,
    scopeType: "property",
    importance: "required",
    blocking: true,
  });
  await database.insert(schema.requirementVersions).values({
    id: requirementVersionId,
    ...owned,
    requirementId,
    version: "2026.1",
    effectiveFrom: "2026-01-01",
    summary: "Request-bound inspection requirement fixture.",
    sourceUrl: `https://example.test/requirements/${key}`,
    contentHash: createHash("sha256")
      .update(`requirement-${key}`)
      .digest("hex"),
  });

  const service = new MarketPlaybookService(database, () => currentTime);
  const created = await service.createVersion(
    author,
    playbookVersionInput(
      {
        marketId: fixture.marketId,
        governedSourceVersionId: sourceVersion.sourceVersionId,
        requirementVersionId,
      },
      `seed-${key}`,
      "Colorado",
    ),
  );
  await service.reviewVersion(
    asActor(author, `playbook-reviewer-${key}`, "practice_leader"),
    {
      versionId: created.versionId,
      decision: "approved",
      note: "Destination scope and source independently reviewed.",
    },
  );
  return {
    ...fixture,
    caseId,
    governedSourceVersionId: sourceVersion.sourceVersionId,
    requirementVersionId,
    playbookId: created.playbookId,
    playbookVersionId: created.versionId,
  };
}

describe("market playbook request binding", () => {
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

  test("returns only the authenticated tenant and minimizes version receipts", async () => {
    const alpha = await seedPlaybook(productionDatabase, "workspace-alpha");
    const beta = await seedPlaybook(productionDatabase, "workspace-beta");
    const ownerSession = await issueSession(
      alpha,
      "playbook-route-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "playbook-route-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getPlaybookWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/playbooks/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      playbooks: Array<{ id: string }>;
      versions: Array<{ id: string }>;
      cases: Array<{ id: string }>;
    };
    expect(workspace.playbooks.map((playbook) => playbook.id)).toEqual([
      alpha.playbookId,
    ]);
    expect(workspace.versions.map((version) => version.id)).toEqual([
      alpha.playbookVersionId,
    ]);
    expect(workspace.cases.map((renewalCase) => renewalCase.id)).toEqual([
      alpha.caseId,
    ]);
    const workspaceKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "linkedBy",
      "destinationProgramId",
      "pinnedBy",
    ])
      expect(workspaceKeys.has(forbidden), forbidden).toBe(false);

    const deniedCreate = await createPlaybookVersion(
      requestWithSession(
        "https://fortify.test/api/production/playbooks/versions",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(playbookVersionInput(alpha, "auditor-denied")),
        },
      ),
    );
    expect(deniedCreate.status).toBe(403);

    const crossTenantCreate = await createPlaybookVersion(
      requestWithSession(
        "https://fortify.test/api/production/playbooks/versions",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(playbookVersionInput(beta, "cross-tenant")),
        },
      ),
    );
    expect(crossTenantCreate.status).toBe(404);

    const createdResponse = await createPlaybookVersion(
      requestWithSession(
        "https://fortify.test/api/production/playbooks/versions",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(playbookVersionInput(alpha, "route-created")),
        },
      ),
    );
    expect(createdResponse.status).toBe(201);
    expect(createdResponse.headers.get("cache-control")).toBe("no-store");
    const created = (await createdResponse.json()) as Record<string, unknown>;
    expect(Object.keys(created).toSorted()).toEqual([
      "contentHash",
      "playbookId",
      "versionId",
      "versionNumber",
    ]);

    const betaPlaybooks = await productionDatabase
      .select({ id: schema.marketPlaybooks.id })
      .from(schema.marketPlaybooks)
      .where(eq(schema.marketPlaybooks.organizationId, beta.organizationId));
    expect(betaPlaybooks).toEqual([{ id: beta.playbookId }]);
  }, 45_000);

  test("rejects cross-tenant and read-only case actions and requires independent review", async () => {
    const alpha = await seedPlaybook(productionDatabase, "decision-alpha");
    const beta = await seedPlaybook(productionDatabase, "decision-beta");
    const authorSubject = "playbook-decision-author";
    const reviewerSubject = "playbook-decision-reviewer";
    const authorSession = await issueSession(
      alpha,
      authorSubject,
      "organization_owner",
    );
    const reviewerSession = await issueSession(
      alpha,
      reviewerSubject,
      "practice_leader",
    );
    const auditorSession = await issueSession(
      alpha,
      "playbook-decision-auditor",
      "read_only_auditor",
    );

    const createdResponse = await createPlaybookVersion(
      requestWithSession(
        "https://fortify.test/api/production/playbooks/versions",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(playbookVersionInput(alpha, "decision-draft")),
        },
      ),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { versionId: string };
    const reviewBody = JSON.stringify({
      decision: "approved",
      note: "Source, scope, conditions, and blockers independently reviewed.",
    });

    const crossTenantReview = await reviewPlaybookVersion(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/versions/${beta.playbookVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.playbookVersionId }) },
    );
    expect(crossTenantReview.status).toBe(404);

    const selfReview = await reviewPlaybookVersion(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/versions/${created.versionId}/review`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: created.versionId }) },
    );
    expect(selfReview.status).toBe(409);

    const auditorReview = await reviewPlaybookVersion(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/versions/${created.versionId}/review`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: created.versionId }) },
    );
    expect(auditorReview.status).toBe(403);

    const reviewedResponse = await reviewPlaybookVersion(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/versions/${created.versionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: created.versionId }) },
    );
    expect(reviewedResponse.status).toBe(200);
    expect(reviewedResponse.headers.get("cache-control")).toBe("no-store");
    expect(
      Object.keys(
        (await reviewedResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["decision", "reviewId", "reviewedAt"]);

    const destinationBody = JSON.stringify({ marketId: alpha.marketId });
    const crossTenantEvaluation = await evaluatePlaybookCase(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/cases/${beta.caseId}/evaluate`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: destinationBody,
        },
      ),
      { params: Promise.resolve({ caseId: beta.caseId }) },
    );
    expect(crossTenantEvaluation.status).toBe(404);

    const evaluationResponse = await evaluatePlaybookCase(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/cases/${alpha.caseId}/evaluate`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: destinationBody,
        },
      ),
      { params: Promise.resolve({ caseId: alpha.caseId }) },
    );
    expect(evaluationResponse.status).toBe(200);
    expect(evaluationResponse.headers.get("cache-control")).toBe("no-store");
    const evaluation = (await evaluationResponse.json()) as Record<
      string,
      unknown
    >;
    expect(Object.keys(evaluation).toSorted()).toEqual([
      "blockers",
      "calculation",
      "caveats",
      "destination",
      "label",
      "pinned",
      "playbookVersion",
      "requirements",
      "status",
    ]);
    expect(collectKeys(evaluation).has("organizationId")).toBe(false);

    const deniedLink = await linkPlaybookCase(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/cases/${alpha.caseId}/link`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: destinationBody,
        },
      ),
      { params: Promise.resolve({ caseId: alpha.caseId }) },
    );
    expect(deniedLink.status).toBe(403);

    const crossTenantLink = await linkPlaybookCase(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/cases/${beta.caseId}/link`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: destinationBody,
        },
      ),
      { params: Promise.resolve({ caseId: beta.caseId }) },
    );
    expect(crossTenantLink.status).toBe(404);

    const linkResponse = await linkPlaybookCase(
      requestWithSession(
        `https://fortify.test/api/production/playbooks/cases/${alpha.caseId}/link`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: destinationBody,
        },
      ),
      { params: Promise.resolve({ caseId: alpha.caseId }) },
    );
    expect(linkResponse.status).toBe(201);
    expect(linkResponse.headers.get("cache-control")).toBe("no-store");
    expect(
      Object.keys(
        (await linkResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["linkId", "playbookVersionId", "supersedesLinkId"]);

    const betaLinks = await productionDatabase
      .select({ id: schema.casePlaybookLinks.id })
      .from(schema.casePlaybookLinks)
      .where(eq(schema.casePlaybookLinks.organizationId, beta.organizationId));
    expect(betaLinks).toEqual([]);
  }, 45_000);
});

import { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { IdentityService } from "@/lib/production/identity-service";
import {
  ResiliencePlanningService,
  type CreateCapitalPlanInput,
  type CreateInterventionVersionInput,
  type CreateTargetProfileVersionInput,
} from "@/lib/production/resilience-planning-service";
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

import { POST as createCapitalPlan } from "@/app/api/production/resilience-planning/capital-plans/route";
import { POST as reviewInterventionVersion } from "@/app/api/production/resilience-planning/interventions/versions/[versionId]/review/route";
import { POST as createInterventionVersion } from "@/app/api/production/resilience-planning/interventions/versions/route";
import { POST as publishProfileVersion } from "@/app/api/production/resilience-planning/profiles/versions/[versionId]/publish/route";
import { POST as reviewProfileVersion } from "@/app/api/production/resilience-planning/profiles/versions/[versionId]/review/route";
import { POST as createProfileVersion } from "@/app/api/production/resilience-planning/profiles/versions/route";
import { GET as getPlanningWorkspace } from "@/app/api/production/resilience-planning/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type PlanningFixture = TenantFixture & {
  sourceVersionId: string;
  profileId: string;
  profileVersionId: string;
  interventionId: string;
  interventionVersionId: string;
  capitalPlanId: string;
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

function asActor(
  context: TenantContext,
  actorSubject: string,
  role: OrganizationRole = "organization_owner",
): TenantContext {
  return { ...context, actorSubject, role };
}

function profileInput(
  sourceVersionId: string,
  key: string,
): CreateTargetProfileVersionInput {
  return {
    canonicalKey: `request-bound-profile-${key}`,
    name: `Request-bound California profile ${key}`,
    description: "A deterministic evidence-readiness target profile.",
    jurisdiction: "California",
    peril: "wildfire",
    propertyClass: "condominium",
    effectiveFrom: "2026-08-04",
    changeSummary: `Initial request-bound profile ${key}.`,
    limitations:
      "Not a designation, risk score, engineering opinion, or insurer commitment.",
    sourceVersionIds: [sourceVersionId],
    criteria: [
      {
        code: `MIN-${key}`,
        title: "Current property record",
        targetLevel: "minimum",
        evidenceLevel: "documented",
        requirementText: "A current property-scoped record is available.",
        verificationMethod: "Human review of the exact dated record.",
      },
      {
        code: `PREF-${key}`,
        title: "Independent review",
        targetLevel: "preferred",
        evidenceLevel: "independent_verification",
        requirementText: "An independent reviewer checks the scoped evidence.",
        verificationMethod: "Signed review bound to exact evidence.",
      },
    ],
    applicability: [
      {
        field: "jurisdiction",
        operator: "equals",
        expectedValues: ["California"],
      },
      {
        field: "propertyClass",
        operator: "one_of",
        expectedValues: ["condominium", "townhome"],
      },
      {
        field: "perils",
        operator: "includes",
        expectedValues: ["wildfire"],
      },
    ],
  };
}

function interventionInput(key: string): CreateInterventionVersionInput {
  return {
    canonicalKey: `request-bound-intervention-${key}`,
    name: `Evidence recovery ${key}`,
    category: "evidence_recovery",
    description: "Recover exact property records for human review.",
    technicalSpecification:
      "Reconcile permits, invoices, product data, and the building schedule.",
    evidenceLevel: "documented",
    typicalCostLowCents: 250_000,
    typicalCostHighCents: 600_000,
    typicalDurationDays: 30,
    dependencies: ["Archive access"],
    maintenanceRequirements: ["Annual record-currency review"],
    benefitStatement: "May close a documentation gap.",
    benefitBoundary:
      "Documentation does not establish physical condition or insurer acceptance.",
  };
}

async function capitalPlanInput(
  database: ProductionDatabaseLike,
  fixture: Pick<
    PlanningFixture,
    "propertyId" | "profileVersionId" | "interventionVersionId"
  >,
  key: string,
): Promise<CreateCapitalPlanInput> {
  const criteria = await database
    .select({ id: schema.targetProfileCriteria.id })
    .from(schema.targetProfileCriteria)
    .where(
      eq(
        schema.targetProfileCriteria.profileVersionId,
        fixture.profileVersionId,
      ),
    );
  return {
    propertyId: fixture.propertyId,
    profileVersionId: fixture.profileVersionId,
    name: `Request-bound capital plan ${key}`,
    propertyFacts: {
      jurisdiction: "California",
      propertyClass: "condominium",
      perils: ["wildfire"],
    },
    gaps: criteria.map((criterion, index) => ({
      criterionId: criterion.id,
      state: index === 0 ? ("gap" as const) : ("not_applicable" as const),
      observedCondition: `Explicit request-bound observation ${index + 1}.`,
    })),
    scenarios: [
      {
        name: "Evidence foundation",
        project: {
          name: "Recover records",
          description: "Recover and reconcile the exact property records.",
          interventionVersionIds: [fixture.interventionVersionId],
        },
        totalCostLowCents: 250_000,
        totalCostHighCents: 600_000,
        durationDays: 30,
        dependencies: ["Archive access"],
        maintenanceRequirements: ["Annual record-currency review"],
        fundingEligibilityState: "unknown",
        modeledBenefitState: "unavailable",
        insurerTreatmentState: "no_commitment",
        rationale:
          "Addresses an explicit documentation gap without inventing financial return.",
        assumptions: ["Archive access is granted"],
      },
    ],
  };
}

async function seedPlanning(
  database: ProductionDatabaseLike,
  key: string,
): Promise<PlanningFixture> {
  const fixture = await createTenantFixture(database, key);
  const author = asActor(fixture.context, `planning-seed-author-${key}`);
  const sourceService = new GovernedSourceService(database, () => currentTime);
  const source = await sourceService.createSource(author, {
    canonicalKey: `request-bound-planning-source-${key}`,
    sourceClass: "regulator_guidance",
    issuingAuthority: "California authority fixture",
    title: `Request-bound planning source ${key}`,
    jurisdiction: "California",
    officialUrl: `https://example.test/planning/${key}`,
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
    structuredSummary: { scope: "Request-bound planning route fixture." },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial request-bound planning source.",
  });
  await sourceService.reviewVersion(
    asActor(author, `source-reviewer-${key}`, "practice_leader"),
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "approved",
      note: "Exact source metadata and rights boundary reviewed.",
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

  const service = new ResiliencePlanningService(database, () => currentTime);
  const profile = await service.createProfileVersion(
    author,
    profileInput(sourceVersion.sourceVersionId, `seed-${key}`),
  );
  await service.reviewProfileVersion(
    asActor(author, `profile-reviewer-${key}`, "practice_leader"),
    {
      profileVersionId: profile.profileVersionId,
      decision: "approved",
      note: "Criteria, applicability, evidence levels, and pins reviewed.",
      sourcePinsChecked: true,
    },
  );
  await service.publishProfileVersion(
    asActor(author, `profile-publisher-${key}`, "practice_leader"),
    {
      profileVersionId: profile.profileVersionId,
      decision: "published",
      note: "Published as an evidence-readiness target only.",
    },
  );
  const intervention = await service.createInterventionVersion(
    author,
    interventionInput(`seed-${key}`),
  );
  await service.reviewInterventionVersion(
    asActor(author, `intervention-reviewer-${key}`, "practice_leader"),
    {
      interventionVersionId: intervention.interventionVersionId,
      decision: "approved",
      note: "Specification, evidence basis, range, and boundary reviewed.",
    },
  );
  const partial = {
    ...fixture,
    sourceVersionId: sourceVersion.sourceVersionId,
    profileId: profile.profileId,
    profileVersionId: profile.profileVersionId,
    interventionId: intervention.interventionId,
    interventionVersionId: intervention.interventionVersionId,
  };
  const plan = await service.createCapitalPlan(
    author,
    await capitalPlanInput(database, partial, `seed-${key}`),
  );
  return { ...partial, capitalPlanId: plan.capitalPlanId };
}

describe("resilience planning request binding", () => {
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

  test("returns only the authenticated tenant and minimizes profile receipts", async () => {
    const alpha = await seedPlanning(
      productionDatabase,
      "planning-workspace-alpha",
    );
    const beta = await seedPlanning(
      productionDatabase,
      "planning-workspace-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "planning-workspace-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "planning-workspace-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getPlanningWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      profiles: Array<{ id: string }>;
      profileVersions: Array<{ id: string }>;
      interventions: Array<{ id: string }>;
      scenarios: Array<{ id: string }>;
    };
    expect(workspace.profiles.map((profile) => profile.id)).toEqual([
      alpha.profileId,
    ]);
    expect(workspace.profileVersions.map((version) => version.id)).toEqual([
      alpha.profileVersionId,
    ]);
    expect(
      workspace.interventions.map((intervention) => intervention.id),
    ).toEqual([alpha.interventionId]);
    expect(workspace.scenarios).toHaveLength(1);
    const workspaceKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "authorSubject",
      "reviewerSubject",
      "publisherSubject",
      "assessedBy",
      "propertyId",
      "capitalPlanId",
      "projectLinks",
      "scenarioProjects",
      "benefitStatement",
    ])
      expect(workspaceKeys.has(forbidden), forbidden).toBe(false);

    const deniedCreate = await createProfileVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/profiles/versions",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            profileInput(alpha.sourceVersionId, "auditor-denied"),
          ),
        },
      ),
    );
    expect(deniedCreate.status).toBe(403);

    const crossTenantCreate = await createProfileVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/profiles/versions",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            profileInput(beta.sourceVersionId, "cross-tenant-source"),
          ),
        },
      ),
    );
    expect(crossTenantCreate.status).toBe(409);

    const createdResponse = await createProfileVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/profiles/versions",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            profileInput(alpha.sourceVersionId, "route-created"),
          ),
        },
      ),
    );
    expect(createdResponse.status).toBe(201);
    expect(createdResponse.headers.get("cache-control")).toBe("no-store");
    expect(
      Object.keys(
        (await createdResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["operative", "profileId", "profileVersionId", "versionNumber"]);

    const betaProfiles = await productionDatabase
      .select({ id: schema.targetProfiles.id })
      .from(schema.targetProfiles)
      .where(eq(schema.targetProfiles.organizationId, beta.organizationId));
    expect(betaProfiles).toEqual([{ id: beta.profileId }]);
  }, 45_000);

  test("enforces independent profile and intervention governance through real routes", async () => {
    const alpha = await seedPlanning(
      productionDatabase,
      "planning-governance-alpha",
    );
    const beta = await seedPlanning(
      productionDatabase,
      "planning-governance-beta",
    );
    const authorSession = await issueSession(
      alpha,
      "planning-governance-author",
      "organization_owner",
    );
    const reviewerSession = await issueSession(
      alpha,
      "planning-governance-reviewer",
      "practice_leader",
    );
    const publisherSession = await issueSession(
      alpha,
      "planning-governance-publisher",
      "practice_leader",
    );
    const auditorSession = await issueSession(
      alpha,
      "planning-governance-auditor",
      "read_only_auditor",
    );

    const createdProfileResponse = await createProfileVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/profiles/versions",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            profileInput(alpha.sourceVersionId, "governance-draft"),
          ),
        },
      ),
    );
    expect(createdProfileResponse.status).toBe(201);
    const createdProfile = (await createdProfileResponse.json()) as {
      profileVersionId: string;
    };
    const reviewBody = JSON.stringify({
      decision: "approved",
      note: "Criteria, applicability, evidence levels, and pins reviewed.",
      sourcePinsChecked: true,
    });

    const crossTenantReview = await reviewProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${beta.profileVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.profileVersionId }) },
    );
    expect(crossTenantReview.status).toBe(404);

    const selfReview = await reviewProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${createdProfile.profileVersionId}/review`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdProfile.profileVersionId,
        }),
      },
    );
    expect(selfReview.status).toBe(409);

    const deniedReview = await reviewProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${createdProfile.profileVersionId}/review`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdProfile.profileVersionId,
        }),
      },
    );
    expect(deniedReview.status).toBe(403);

    const reviewedResponse = await reviewProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${createdProfile.profileVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reviewBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdProfile.profileVersionId,
        }),
      },
    );
    expect(reviewedResponse.status).toBe(201);
    expect(
      Object.keys(
        (await reviewedResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["decision", "reviewId", "reviewedAt"]);

    const publicationBody = JSON.stringify({
      decision: "published",
      note: "Published as an evidence-readiness target only.",
    });
    const sameReviewerPublish = await publishProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${createdProfile.profileVersionId}/publish`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdProfile.profileVersionId,
        }),
      },
    );
    expect(sameReviewerPublish.status).toBe(409);

    const crossTenantPublish = await publishProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${beta.profileVersionId}/publish`,
        publisherSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.profileVersionId }) },
    );
    expect(crossTenantPublish.status).toBe(404);

    const publishedResponse = await publishProfileVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/profiles/versions/${createdProfile.profileVersionId}/publish`,
        publisherSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: publicationBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdProfile.profileVersionId,
        }),
      },
    );
    expect(publishedResponse.status).toBe(201);
    expect(
      Object.keys(
        (await publishedResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["decision", "publicationId", "publishedAt", "recognitionState"]);

    const deniedIntervention = await createInterventionVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/interventions/versions",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(interventionInput("auditor-denied")),
        },
      ),
    );
    expect(deniedIntervention.status).toBe(403);

    const invalidIntervention = await createInterventionVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/interventions/versions",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...interventionInput("invalid-range"),
            typicalCostLowCents: 700_000,
            typicalCostHighCents: 600_000,
          }),
        },
      ),
    );
    expect(invalidIntervention.status).toBe(400);

    const createdInterventionResponse = await createInterventionVersion(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/interventions/versions",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(interventionInput("route-created")),
        },
      ),
    );
    expect(createdInterventionResponse.status).toBe(201);
    const createdIntervention = (await createdInterventionResponse.json()) as {
      interventionVersionId: string;
    };
    const interventionReviewBody = JSON.stringify({
      decision: "approved",
      note: "Specification, evidence basis, range, and boundary reviewed.",
    });
    const selfInterventionReview = await reviewInterventionVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/interventions/versions/${createdIntervention.interventionVersionId}/review`,
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: interventionReviewBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdIntervention.interventionVersionId,
        }),
      },
    );
    expect(selfInterventionReview.status).toBe(409);

    const crossTenantInterventionReview = await reviewInterventionVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/interventions/versions/${beta.interventionVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: interventionReviewBody,
        },
      ),
      { params: Promise.resolve({ versionId: beta.interventionVersionId }) },
    );
    expect(crossTenantInterventionReview.status).toBe(404);

    const reviewedInterventionResponse = await reviewInterventionVersion(
      requestWithSession(
        `https://fortify.test/api/production/resilience-planning/interventions/versions/${createdIntervention.interventionVersionId}/review`,
        reviewerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: interventionReviewBody,
        },
      ),
      {
        params: Promise.resolve({
          versionId: createdIntervention.interventionVersionId,
        }),
      },
    );
    expect(reviewedInterventionResponse.status).toBe(201);
    expect(
      Object.keys(
        (await reviewedInterventionResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual(["decision", "reviewId", "reviewedAt"]);

    const planningFixture = {
      ...alpha,
      profileVersionId: createdProfile.profileVersionId,
      interventionVersionId: createdIntervention.interventionVersionId,
    };
    const planBody = await capitalPlanInput(
      productionDatabase,
      planningFixture,
      "route-created",
    );
    const deniedPlan = await createCapitalPlan(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/capital-plans",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(planBody),
        },
      ),
    );
    expect(deniedPlan.status).toBe(403);

    const crossTenantPlan = await createCapitalPlan(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/capital-plans",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...planBody, propertyId: beta.propertyId }),
        },
      ),
    );
    expect(crossTenantPlan.status).toBe(404);

    const createdPlanResponse = await createCapitalPlan(
      requestWithSession(
        "https://fortify.test/api/production/resilience-planning/capital-plans",
        authorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(planBody),
        },
      ),
    );
    expect(createdPlanResponse.status).toBe(201);
    expect(createdPlanResponse.headers.get("cache-control")).toBe("no-store");
    expect(
      Object.keys(
        (await createdPlanResponse.json()) as Record<string, unknown>,
      ).toSorted(),
    ).toEqual([
      "applicabilityState",
      "baselineAssessmentId",
      "capitalPlanId",
      "planningState",
    ]);

    const betaPlans = await productionDatabase
      .select({ id: schema.capitalPlans.id })
      .from(schema.capitalPlans)
      .where(eq(schema.capitalPlans.organizationId, beta.organizationId));
    expect(betaPlans).toEqual([{ id: beta.capitalPlanId }]);
  }, 45_000);
});

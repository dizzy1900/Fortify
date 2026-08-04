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
import {
  FundingProjectService,
  type CreateFundingProgrammeVersionInput,
} from "@/lib/production/funding-project-service";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { IdentityService } from "@/lib/production/identity-service";
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

import { POST as prepareApplication } from "@/app/api/production/funding/applications/route";
import { POST as createCapitalStack } from "@/app/api/production/funding/capital-stacks/route";
import { POST as recordCommitmentEvent } from "@/app/api/production/funding/commitments/[commitmentId]/events/route";
import { POST as createCommitment } from "@/app/api/production/funding/commitments/route";
import { POST as exportDisbursement } from "@/app/api/production/funding/disbursement-exports/route";
import { POST as assessEligibility } from "@/app/api/production/funding/eligibility/route";
import { POST as recordMilestoneEvent } from "@/app/api/production/funding/milestones/[milestoneId]/events/route";
import { POST as approvePayment } from "@/app/api/production/funding/payment-approvals/route";
import { POST as publishProgrammeVersion } from "@/app/api/production/funding/programmes/versions/[versionId]/publish/route";
import { POST as reviewProgrammeVersion } from "@/app/api/production/funding/programmes/versions/[versionId]/review/route";
import { POST as createProgrammeVersion } from "@/app/api/production/funding/programmes/versions/route";
import { GET as getProjectWorkspace } from "@/app/api/production/funding/projects/[projectId]/workspace/route";
import { POST as revokeProjectAssignment } from "@/app/api/production/funding/projects/assignments/[assignmentId]/revoke/route";
import { POST as createProjectExecution } from "@/app/api/production/funding/projects/execution/route";
import { GET as getFundingWorkspace } from "@/app/api/production/funding/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type FundingFixture = TenantFixture & {
  projectId: string;
  sourceVersionId: string;
  programmeId: string;
  programmeVersionId: string;
};

const at = "2026-08-04T12:00:00.000Z";
const eligibleFacts = {
  jurisdiction: "California",
  propertyClass: "condominium",
  unitCount: 84,
};

function asActor(
  context: TenantContext,
  actorSubject: string,
  role: OrganizationRole = "organization_owner",
): TenantContext {
  return { ...context, actorSubject, role };
}

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

function programmeInput(
  sourceVersionId: string,
  key: string,
): CreateFundingProgrammeVersionInput {
  return {
    canonicalKey: `request-bound-funding-${key}`,
    name: `Request-bound California programme ${key}`,
    sponsorName: "Fictional California programme sponsor",
    programmeType: "mixed",
    description: "Synthetic request-bound programme fixture.",
    governedSourceVersionId: sourceVersionId,
    jurisdiction: "California",
    hazard: "wildfire",
    propertyClasses: ["condominium", "townhome"],
    applicationOpensOn: "2026-07-01",
    applicationClosesOn: "2027-03-31",
    maximumAwardCents: 2_400_000,
    maximumCostShareBps: 5_000,
    evidenceRequirements: ["Human-confirmed baseline"],
    paymentConditions: ["Approved milestone evidence"],
    maintenanceObligations: ["Annual evidence refresh"],
    limitations:
      "Candidate eligibility does not guarantee award, payment, insurance, or recognition.",
    rules: [
      {
        code: "GEO-01",
        field: "jurisdiction",
        operator: "equals",
        expectedValues: ["California"],
      },
      {
        code: "CLASS-02",
        field: "propertyClass",
        operator: "one_of",
        expectedValues: ["condominium", "townhome"],
      },
      {
        code: "SIZE-03",
        field: "unitCount",
        operator: "at_least",
        expectedValues: ["8"],
      },
    ],
  };
}

async function seedFunding(
  database: ProductionDatabaseLike,
  key: string,
): Promise<FundingFixture> {
  const fixture = await createTenantFixture(database, key);
  const author = asActor(fixture.context, `funding-author-${key}`);
  const projectId = `request-bound-project-${key}`;
  await database.insert(schema.resilienceProjects).values({
    id: projectId,
    ...tenantRecord(author, at),
    propertyId: fixture.propertyId,
    name: `Request-bound project ${key}`,
    description: "Synthetic funding request-boundary fixture.",
    status: "planned",
  });
  const sources = new GovernedSourceService(database, () => new Date(at));
  const source = await sources.createSource(author, {
    canonicalKey: `request-bound-funding-source-${key}`,
    sourceClass: "funding_programme",
    issuingAuthority: "Fictional California programme sponsor",
    title: `Request-bound funding source ${key}`,
    jurisdiction: "California",
    officialUrl: `https://example.test/funding/${key}`,
    authorityTier: "customer_supplied",
    reviewOwnerSubject: `source-owner-${key}`,
  });
  const sourceVersion = await sources.createVersion(author, {
    sourceId: source.sourceId,
    versionLabel: "2026.1",
    retrievalDate: "2026-08-04",
    sourceHash: createHash("sha256").update(key).digest("hex"),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Fictional metadata fixture; no redistribution.",
    structuredSummary: { scope: "Request-bound funding route fixture." },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial request-bound funding source.",
  });
  await sources.reviewVersion(
    asActor(author, `source-reviewer-${key}`, "practice_leader"),
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "approved",
      note: "Exact source metadata and rights boundary reviewed.",
      sourceCompared: true,
      rightsConfirmed: true,
    },
  );
  await sources.publishVersion(
    asActor(author, `source-publisher-${key}`, "practice_leader"),
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "published",
      note: "Published only for deterministic route tests.",
    },
  );
  const funding = new FundingProjectService(database, () => new Date(at));
  const programme = await funding.createProgrammeVersion(
    author,
    programmeInput(sourceVersion.sourceVersionId, `seed-${key}`),
  );
  await funding.reviewProgrammeVersion(
    asActor(author, `programme-reviewer-${key}`, "practice_leader"),
    {
      programmeVersionId: programme.programmeVersionId,
      decision: "approved",
      sourceAndRulesChecked: true,
      note: "Exact source, rules, and limitations reviewed.",
    },
  );
  await funding.publishProgrammeVersion(
    asActor(author, `programme-publisher-${key}`, "practice_leader"),
    {
      programmeVersionId: programme.programmeVersionId,
      decision: "published",
      note: "Published as a bounded administrative fixture.",
    },
  );
  return {
    ...fixture,
    projectId,
    sourceVersionId: sourceVersion.sourceVersionId,
    ...programme,
  };
}

describe("funding and project execution request binding", () => {
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

  test("isolates tenant funding workspaces and enforces independent programme governance", async () => {
    const alpha = await seedFunding(productionDatabase, "funding-routes-alpha");
    const beta = await seedFunding(productionDatabase, "funding-routes-beta");
    const owner = await issueSession(
      alpha,
      "funding-routes-owner",
      "organization_owner",
    );
    const reviewer = await issueSession(
      alpha,
      "funding-routes-reviewer",
      "practice_leader",
    );
    const publisher = await issueSession(
      alpha,
      "funding-routes-publisher",
      "practice_leader",
    );
    const auditor = await issueSession(
      alpha,
      "funding-routes-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getFundingWorkspace(
      request(
        "https://fortify.test/api/production/funding/workspace",
        owner.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      programmes: Array<{ id: string }>;
      programmeVersions: Array<{ id: string }>;
    };
    expect(workspace.programmes.map((item) => item.id)).toEqual([
      alpha.programmeId,
    ]);
    expect(workspace.programmeVersions.map((item) => item.id)).toEqual([
      alpha.programmeVersionId,
    ]);
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
      "instructionPayload",
      "humanConfirmed",
      "inputFacts",
      "inputHash",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);

    const deniedCreate = await createProgrammeVersion(
      request(
        "https://fortify.test/api/production/funding/programmes/versions",
        auditor.token,
        jsonBody(programmeInput(alpha.sourceVersionId, "auditor-denied")),
      ),
    );
    expect(deniedCreate.status).toBe(403);

    const crossTenantCreate = await createProgrammeVersion(
      request(
        "https://fortify.test/api/production/funding/programmes/versions",
        owner.token,
        jsonBody(programmeInput(beta.sourceVersionId, "cross-tenant-source")),
      ),
    );
    expect(crossTenantCreate.status).toBe(409);

    const createdResponse = await createProgrammeVersion(
      request(
        "https://fortify.test/api/production/funding/programmes/versions",
        owner.token,
        jsonBody(programmeInput(alpha.sourceVersionId, "route-created")),
      ),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as {
      programmeId: string;
      programmeVersionId: string;
    };
    const reviewInput = {
      decision: "approved",
      sourceAndRulesChecked: true,
      note: "Exact source, rules, and limitations reviewed.",
    };
    const selfReview = await reviewProgrammeVersion(
      request(
        `https://fortify.test/api/production/funding/programmes/versions/${created.programmeVersionId}/review`,
        owner.token,
        jsonBody(reviewInput),
      ),
      { params: Promise.resolve({ versionId: created.programmeVersionId }) },
    );
    expect(selfReview.status).toBe(409);
    const crossTenantReview = await reviewProgrammeVersion(
      request(
        `https://fortify.test/api/production/funding/programmes/versions/${beta.programmeVersionId}/review`,
        reviewer.token,
        jsonBody(reviewInput),
      ),
      { params: Promise.resolve({ versionId: beta.programmeVersionId }) },
    );
    expect(crossTenantReview.status).toBe(404);
    const reviewed = await reviewProgrammeVersion(
      request(
        `https://fortify.test/api/production/funding/programmes/versions/${created.programmeVersionId}/review`,
        reviewer.token,
        jsonBody(reviewInput),
      ),
      { params: Promise.resolve({ versionId: created.programmeVersionId }) },
    );
    expect(reviewed.status).toBe(201);

    const publishInput = {
      decision: "published",
      note: "Published as a bounded administrative fixture.",
    };
    const reviewerPublish = await publishProgrammeVersion(
      request(
        `https://fortify.test/api/production/funding/programmes/versions/${created.programmeVersionId}/publish`,
        reviewer.token,
        jsonBody(publishInput),
      ),
      { params: Promise.resolve({ versionId: created.programmeVersionId }) },
    );
    expect(reviewerPublish.status).toBe(409);
    const published = await publishProgrammeVersion(
      request(
        `https://fortify.test/api/production/funding/programmes/versions/${created.programmeVersionId}/publish`,
        publisher.token,
        jsonBody(publishInput),
      ),
      { params: Promise.resolve({ versionId: created.programmeVersionId }) },
    );
    expect(published.status).toBe(201);

    const crossTenantEligibility = await assessEligibility(
      request(
        "https://fortify.test/api/production/funding/eligibility",
        owner.token,
        jsonBody({
          projectId: beta.projectId,
          programmeVersionId: alpha.programmeVersionId,
          facts: eligibleFacts,
        }),
      ),
    );
    expect(crossTenantEligibility.status).toBe(404);
    const eligibilityResponse = await assessEligibility(
      request(
        "https://fortify.test/api/production/funding/eligibility",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          programmeVersionId: alpha.programmeVersionId,
          facts: eligibleFacts,
        }),
      ),
    );
    expect(eligibilityResponse.status).toBe(201);
    const eligibility = (await eligibilityResponse.json()) as {
      assessmentId: string;
    };
    const applicationResponse = await prepareApplication(
      request(
        "https://fortify.test/api/production/funding/applications",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          programmeVersionId: alpha.programmeVersionId,
          eligibilityAssessmentId: eligibility.assessmentId,
          requestedAmountCents: 1_800_000,
          humanConfirmed: true,
        }),
      ),
    );
    expect(applicationResponse.status).toBe(201);
    expect(Object.keys(await applicationResponse.json()).toSorted()).toEqual([
      "applicationId",
      "state",
      "submittedExternally",
    ]);

    const betaApplications = await productionDatabase
      .select({ id: schema.fundingApplications.id })
      .from(schema.fundingApplications)
      .where(
        eq(schema.fundingApplications.organizationId, beta.organizationId),
      );
    expect(betaApplications).toEqual([]);
  }, 60_000);

  test("binds capital, milestone, collaborator, approval, and export routes to one tenant", async () => {
    const alpha = await seedFunding(
      productionDatabase,
      "execution-routes-alpha",
    );
    const beta = await seedFunding(productionDatabase, "execution-routes-beta");
    const owner = await issueSession(
      alpha,
      "execution-routes-owner",
      "organization_owner",
    );
    const reviewer = await issueSession(
      alpha,
      "execution-routes-reviewer",
      "practice_leader",
    );
    const exporter = await issueSession(
      alpha,
      "execution-routes-exporter",
      "organization_owner",
    );

    const eligibilityResponse = await assessEligibility(
      request(
        "https://fortify.test/api/production/funding/eligibility",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          programmeVersionId: alpha.programmeVersionId,
          facts: eligibleFacts,
        }),
      ),
    );
    expect(eligibilityResponse.status).toBe(201);

    const crossTenantStack = await createCapitalStack(
      request(
        "https://fortify.test/api/production/funding/capital-stacks",
        owner.token,
        jsonBody({
          projectId: beta.projectId,
          name: "Cross-tenant stack",
          projectCostCents: 4_000_000,
          contributions: [
            {
              contributionType: "owner",
              contributorName: "Owner",
              sourceReference: "owner-cross",
              amountCents: 1_000_000,
              purpose: "Owner share",
            },
            {
              contributionType: "financing",
              contributorName: "Lender",
              sourceReference: "lender-cross",
              amountCents: 500_000,
              purpose: "Financing",
            },
          ],
        }),
      ),
    );
    expect(crossTenantStack.status).toBe(404);

    const stackResponse = await createCapitalStack(
      request(
        "https://fortify.test/api/production/funding/capital-stacks",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          name: "Request-bound execution stack",
          projectCostCents: 4_000_000,
          contributions: [
            {
              programmeVersionId: alpha.programmeVersionId,
              contributionType: "grant",
              contributorName: "Fictional sponsor",
              sourceReference: "programme-route-v1",
              amountCents: 1_800_000,
              purpose: "Installation",
            },
            {
              contributionType: "owner",
              contributorName: "Community owner",
              sourceReference: "board-route-v1",
              amountCents: 1_200_000,
              purpose: "Owner share",
            },
          ],
        }),
      ),
    );
    expect(stackResponse.status).toBe(201);
    const stack = (await stackResponse.json()) as {
      contributionIds: string[];
    };

    const commitmentResponse = await createCommitment(
      request(
        "https://fortify.test/api/production/funding/commitments",
        owner.token,
        jsonBody({
          contributionId: stack.contributionIds[0],
          committedAmountCents: 1_800_000,
          terms: "Fixture terms subject to milestone review.",
        }),
      ),
    );
    expect(commitmentResponse.status).toBe(201);
    const commitment = (await commitmentResponse.json()) as {
      commitmentId: string;
    };
    const selfApproval = await recordCommitmentEvent(
      request(
        `https://fortify.test/api/production/funding/commitments/${commitment.commitmentId}/events`,
        owner.token,
        jsonBody({
          eventType: "approved",
          effectiveAmountCents: 1_800_000,
          rationale: "Self-approval must fail.",
        }),
      ),
      { params: Promise.resolve({ commitmentId: commitment.commitmentId }) },
    );
    expect(selfApproval.status).toBe(409);
    const commitmentApproval = await recordCommitmentEvent(
      request(
        `https://fortify.test/api/production/funding/commitments/${commitment.commitmentId}/events`,
        reviewer.token,
        jsonBody({
          eventType: "approved",
          effectiveAmountCents: 1_800_000,
          rationale: "Separate human fixture approval.",
        }),
      ),
      { params: Promise.resolve({ commitmentId: commitment.commitmentId }) },
    );
    expect(commitmentApproval.status).toBe(201);

    const externalPrincipalId = `external-${alpha.projectId}`;
    await productionDatabase.insert(schema.externalPrincipals).values({
      id: externalPrincipalId,
      ...tenantRecord(alpha.context, at),
      principalType: "external_collaborator",
      email: "contractor@example.test",
      displayName: "Fixture contractor",
      status: "active",
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    const executionResponse = await createProjectExecution(
      request(
        "https://fortify.test/api/production/funding/projects/execution",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          milestones: [
            {
              code: "INSTALL",
              name: "Installation evidence reviewed",
              evidenceRequirement: "Scoped completion evidence",
              paymentEligible: true,
              plannedPaymentCents: 1_250_000,
            },
          ],
          collaborators: [
            {
              externalPrincipalId,
              collaboratorRole: "contractor",
              purpose: "Submit exact completion evidence only",
              scopes: [
                "resilience_project:read",
                "project_milestone:read",
                "project_milestone_event:create",
              ],
              expiresAt: "2026-12-31T23:59:59.000Z",
            },
          ],
          benefits: [
            {
              stakeholderType: "property_owner",
              stakeholderName: "Community owner",
              expectedBenefitCategory: "documented project completion",
              expectedCostCents: 1_200_000,
              fundingContributionCents: 1_200_000,
              evidenceLevel: "documented",
              source: "Board resolution fixture",
              timeframe: "Project period",
              uncertainty: "Final contractor cost remains unverified.",
              commitmentState: "approved",
            },
          ],
        }),
      ),
    );
    expect(executionResponse.status).toBe(201);
    const execution = (await executionResponse.json()) as {
      milestoneIds: string[];
      collaboratorAssignments: Array<{ id: string; token: string }>;
    };
    expect(execution.collaboratorAssignments[0].token).toMatch(/^fproject_/);

    const projectWorkspaceResponse = await getProjectWorkspace(
      request(
        `https://fortify.test/api/production/funding/projects/${alpha.projectId}/workspace`,
        execution.collaboratorAssignments[0].token,
        undefined,
        "bearer",
      ),
      { params: Promise.resolve({ projectId: alpha.projectId }) },
    );
    expect(projectWorkspaceResponse.status).toBe(200);
    const projectWorkspace = (await projectWorkspaceResponse.json()) as {
      capitalStacks: unknown[];
      benefits: unknown[];
      access: { capitalStackAvailable: boolean };
    };
    expect(projectWorkspace).toMatchObject({
      capitalStacks: [],
      benefits: [],
      access: { capitalStackAvailable: false },
    });
    const projectKeys = collectKeys(projectWorkspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "tokenHash",
    ])
      expect(projectKeys.has(forbidden), forbidden).toBe(false);

    const submitted = await recordMilestoneEvent(
      request(
        `https://fortify.test/api/production/funding/milestones/${execution.milestoneIds[0]}/events`,
        execution.collaboratorAssignments[0].token,
        jsonBody({
          eventType: "evidence_submitted",
          note: "Scoped completion evidence submitted.",
        }),
        "bearer",
      ),
      { params: Promise.resolve({ milestoneId: execution.milestoneIds[0] }) },
    );
    expect(submitted.status).toBe(201);
    const milestoneApproval = await recordMilestoneEvent(
      request(
        `https://fortify.test/api/production/funding/milestones/${execution.milestoneIds[0]}/events`,
        reviewer.token,
        jsonBody({
          eventType: "approved",
          note: "Separate human reviewed the submitted evidence.",
        }),
      ),
      { params: Promise.resolve({ milestoneId: execution.milestoneIds[0] }) },
    );
    expect(milestoneApproval.status).toBe(201);

    const paymentResponse = await approvePayment(
      request(
        "https://fortify.test/api/production/funding/payment-approvals",
        reviewer.token,
        jsonBody({
          milestoneId: execution.milestoneIds[0],
          contributionId: stack.contributionIds[0],
          amountCents: 1_250_000,
          decision: "approved",
          note: "Approved instruction amount; no funds moved.",
        }),
      ),
    );
    expect(paymentResponse.status).toBe(201);
    const payment = (await paymentResponse.json()) as {
      paymentApprovalId: string;
    };
    const sameHumanExport = await exportDisbursement(
      request(
        "https://fortify.test/api/production/funding/disbursement-exports",
        reviewer.token,
        jsonBody({
          paymentApprovalId: payment.paymentApprovalId,
          humanConfirmed: true,
        }),
      ),
    );
    expect(sameHumanExport.status).toBe(409);
    const exported = await exportDisbursement(
      request(
        "https://fortify.test/api/production/funding/disbursement-exports",
        exporter.token,
        jsonBody({
          paymentApprovalId: payment.paymentApprovalId,
          humanConfirmed: true,
        }),
      ),
    );
    expect(exported.status).toBe(201);
    expect(await exported.json()).toMatchObject({
      executionState: "not_executed_export_only",
      movesFunds: false,
    });

    const crossTenantRevoke = await revokeProjectAssignment(
      request(
        `https://fortify.test/api/production/funding/projects/assignments/${execution.collaboratorAssignments[0].id}/revoke`,
        (await issueSession(beta, "execution-beta-owner", "organization_owner"))
          .token,
        jsonBody({}),
      ),
      {
        params: Promise.resolve({
          assignmentId: execution.collaboratorAssignments[0].id,
        }),
      },
    );
    expect(crossTenantRevoke.status).toBe(404);
    const revoked = await revokeProjectAssignment(
      request(
        `https://fortify.test/api/production/funding/projects/assignments/${execution.collaboratorAssignments[0].id}/revoke`,
        owner.token,
        jsonBody({}),
      ),
      {
        params: Promise.resolve({
          assignmentId: execution.collaboratorAssignments[0].id,
        }),
      },
    );
    expect(revoked.status).toBe(200);
    const revokedWorkspace = await getProjectWorkspace(
      request(
        `https://fortify.test/api/production/funding/projects/${alpha.projectId}/workspace`,
        execution.collaboratorAssignments[0].token,
        undefined,
        "bearer",
      ),
      { params: Promise.resolve({ projectId: alpha.projectId }) },
    );
    expect(revokedWorkspace.status).toBe(401);

    const betaMilestones = await productionDatabase
      .select({ id: schema.projectMilestones.id })
      .from(schema.projectMilestones)
      .where(eq(schema.projectMilestones.organizationId, beta.organizationId));
    expect(betaMilestones).toEqual([]);
  }, 60_000);
});

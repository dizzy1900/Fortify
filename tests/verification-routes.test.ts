import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { IdentityService } from "@/lib/production/identity-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import { VerificationService } from "@/lib/production/verification-service";
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

import { GET as getAssignmentWorkspace } from "@/app/api/production/verification/assignments/[assignmentId]/workspace/route";
import { POST as createAssignment } from "@/app/api/production/verification/assignments/route";
import { POST as recordCertificateEvent } from "@/app/api/production/verification/certificates/[certificateId]/events/route";
import { POST as issueCertificate } from "@/app/api/production/verification/certificates/route";
import { POST as recordConditionEvent } from "@/app/api/production/verification/condition-events/route";
import { POST as declareConflict } from "@/app/api/production/verification/conflicts/route";
import { POST as recordCorrectiveAction } from "@/app/api/production/verification/corrective-actions/route";
import { POST as reviewCredential } from "@/app/api/production/verification/credentials/[credentialId]/review/route";
import { POST as openException } from "@/app/api/production/verification/exceptions/route";
import { POST as reviewFinding } from "@/app/api/production/verification/findings/[findingId]/review/route";
import { POST as recordFinding } from "@/app/api/production/verification/findings/route";
import { POST as recordMaintenanceEvent } from "@/app/api/production/verification/maintenance/events/route";
import { POST as createMaintenanceObligation } from "@/app/api/production/verification/maintenance/obligations/route";
import { POST as recordMethod } from "@/app/api/production/verification/methods/route";
import { POST as registerVerifier } from "@/app/api/production/verification/verifiers/route";
import { GET as getVerificationWorkspace } from "@/app/api/production/verification/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type VerificationFixture = TenantFixture & {
  projectId: string;
  profileVersionId: string;
  criterionId: string;
  interventionVersionId: string;
  projectInterventionId: string;
  evidenceVersionId: string;
  externalPrincipalId: string;
};

const at = "2026-08-04T12:00:00.000Z";
const assignmentScopes = [
  "resilience_project:read",
  "project_intervention:read",
  "target_profile_version:read",
  "target_profile_criterion:read",
  "evidence_item:read",
  "evidence_version:read",
  "verification_assignment:read",
  "verification_conflict_declaration:read",
  "verification_conflict_declaration:create",
  "verification_method:read",
  "verification_method:create",
  "verification_finding:read",
  "verification_finding:create",
  "verification_finding_evidence_link:read",
  "verification_finding_evidence_link:create",
  "verification_exception:read",
  "verification_exception:create",
  "verification_corrective_action:read",
  "verification_corrective_action:create",
  "verification_certificate:read",
  "verification_certificate_event:read",
  "maintenance_obligation:read",
  "maintenance_obligation_event:read",
  "maintenance_obligation_event:create",
  "property_condition_event:read",
  "property_condition_event:create",
];

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

async function seedVerification(
  database: ProductionDatabaseLike,
  key: string,
): Promise<VerificationFixture> {
  const fixture = await createTenantFixture(database, key);
  const owned = tenantRecord(fixture.context, at);
  const projectId = `verification-project-${key}`;
  const profileId = `verification-profile-${key}`;
  const profileVersionId = `${profileId}-v1`;
  const criterionId = `${profileId}-criterion`;
  const interventionId = `verification-intervention-${key}`;
  const interventionVersionId = `${interventionId}-v1`;
  const projectInterventionId = `${projectId}-intervention`;
  const evidenceItemId = `verification-evidence-${key}`;
  const evidenceVersionId = `${evidenceItemId}-v1`;
  const externalPrincipalId = `verification-principal-${key}`;
  await database.insert(schema.targetProfiles).values({
    id: profileId,
    ...owned,
    canonicalKey: profileId,
    name: "Fixture evidence-readiness profile",
    description: "Synthetic test profile.",
    jurisdiction: "California",
    peril: "wildfire",
    propertyClass: "condominium",
  });
  await database.insert(schema.targetProfileVersions).values({
    id: profileVersionId,
    ...owned,
    profileId,
    versionNumber: 1,
    effectiveFrom: "2026-08-01",
    status: "published",
    authorSubject: fixture.context.actorSubject,
    changeSummary: "Fixture",
    limitations: "Not a designation or insurer commitment.",
    recognitionState: "unavailable_no_commitment_registry",
  });
  await database.insert(schema.targetProfileCriteria).values({
    id: criterionId,
    ...owned,
    profileVersionId,
    code: "INSTALL-01",
    title: "Installed condition",
    targetLevel: "minimum",
    evidenceLevel: "independent_verification",
    requirementText: "Confirm the documented installation condition.",
    verificationMethod: "Site visit plus photo review.",
    position: 1,
  });
  await database.insert(schema.targetProfileReviews).values({
    id: `${profileVersionId}-review`,
    ...owned,
    profileVersionId,
    decision: "approved",
    reviewerSubject: "profile-reviewer",
    note: "Fixture criteria and source pins reviewed.",
    sourcePinsChecked: true,
    reviewedAt: at,
  });
  await database.insert(schema.targetProfilePublications).values({
    id: `${profileVersionId}-publication`,
    ...owned,
    profileVersionId,
    decision: "published",
    publisherSubject: "profile-publisher",
    note: "Fixture publication.",
    publishedAt: at,
  });
  await database.insert(schema.interventions).values({
    id: interventionId,
    ...owned,
    canonicalKey: interventionId,
    name: "Fixture intervention",
    category: "physical_work",
    description: "Synthetic intervention.",
  });
  await database.insert(schema.interventionVersions).values({
    id: interventionVersionId,
    ...owned,
    interventionId,
    versionNumber: 1,
    status: "published",
    technicalSpecification: "Document exact installation condition.",
    evidenceLevel: "independent_verification",
    typicalCostLowCents: 100_000,
    typicalCostHighCents: 200_000,
    typicalDurationDays: 14,
    dependencies: [],
    maintenanceRequirements: ["Annual evidence refresh"],
    benefitStatement: "May improve evidence readiness.",
    benefitBoundary:
      "No risk reduction, insurance, or pricing outcome is asserted.",
    authorSubject: fixture.context.actorSubject,
    reviewerSubject: "intervention-reviewer",
    reviewedAt: at,
  });
  await database.insert(schema.interventionVersionReviews).values({
    id: `${interventionVersionId}-review`,
    ...owned,
    interventionVersionId,
    decision: "approved",
    reviewerSubject: "intervention-reviewer",
    note: "Exact specification and evidence boundary reviewed.",
    reviewedAt: at,
  });
  await database.insert(schema.resilienceProjects).values({
    id: projectId,
    ...owned,
    propertyId: fixture.propertyId,
    name: "Fixture verification project",
    description: "Synthetic project for verification route controls.",
    status: "complete",
  });
  await database.insert(schema.projectInterventions).values({
    id: projectInterventionId,
    ...owned,
    projectId,
    interventionVersionId,
    rationale: "Exact installed intervention under review.",
  });
  await database.insert(schema.evidenceItems).values({
    id: evidenceItemId,
    ...owned,
    propertyId: fixture.propertyId,
    evidenceType: "installation_photo",
  });
  await database.insert(schema.evidenceVersions).values({
    id: evidenceVersionId,
    ...owned,
    evidenceItemId,
    versionNumber: 1,
    filename: "fixture-installation.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    sha256: key.padEnd(64, "a").slice(0, 64),
    storageKey: `tenant/${key}/fixture.jpg`,
    sourceType: "site_capture",
    sourceOrganization: "Fixture contractor",
    captureDate: "2026-07-31",
    receivedAt: at,
    scopeType: "property",
    scopeReference: fixture.propertyId,
    reviewStatus: "confirmed",
    reviewedBy: "evidence-reviewer",
    reviewedAt: at,
  });
  await database.insert(schema.externalPrincipals).values({
    id: externalPrincipalId,
    ...owned,
    principalType: "external_reviewer",
    email: `verifier-${key}@example.test`,
    displayName: `Verifier ${key}`,
    status: "active",
    expiresAt: "2027-12-31T23:59:59.000Z",
  });
  return {
    ...fixture,
    projectId,
    profileVersionId,
    criterionId,
    interventionVersionId,
    projectInterventionId,
    evidenceVersionId,
    externalPrincipalId,
  };
}

function verifierInput(fixture: VerificationFixture, key: string) {
  return {
    organizationName: `Fixture Verification ${key}`,
    organizationType: "engineering" as const,
    limitations:
      "Synthetic credential fixture only; Fortify is not the substantive verifier.",
    verifierName: `Verifier ${key}`,
    verifierEmail: `verifier-${key}@example.test`,
    externalPrincipalId: fixture.externalPrincipalId,
    credentialType: "fictional inspection credential",
    issuer: "Fictional credential issuer",
    credentialReference: `FC-${key}`,
    jurisdiction: "California",
    scope: ["document review", "site observation"],
    issuedOn: "2026-01-01",
    expiresOn: "2027-08-31",
    sourceVersion: "fixture-registry-2026.1",
    sourceUrl: "https://example.test/credentials",
  };
}

describe("verification request binding", () => {
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

  async function registerAndAssign(fixture: VerificationFixture, key: string) {
    const owner = await issueSession(
      fixture,
      `verification-owner-${key}`,
      "organization_owner",
    );
    const reviewer = await issueSession(
      fixture,
      `verification-reviewer-${key}`,
      "practice_leader",
    );
    const registeredResponse = await registerVerifier(
      request(
        "https://fortify.test/api/production/verification/verifiers",
        owner.token,
        jsonBody(verifierInput(fixture, key)),
      ),
    );
    expect(registeredResponse.status).toBe(201);
    const registered = (await registeredResponse.json()) as {
      verifierId: string;
      credentialId: string;
    };
    const reviewed = await reviewCredential(
      request(
        `https://fortify.test/api/production/verification/credentials/${registered.credentialId}/review`,
        reviewer.token,
        jsonBody({
          decision: "approved",
          sourceChecked: true,
          note: "Exact registry version and credential expiry reviewed.",
        }),
      ),
      { params: Promise.resolve({ credentialId: registered.credentialId }) },
    );
    expect(reviewed.status).toBe(201);
    const assignedResponse = await createAssignment(
      request(
        "https://fortify.test/api/production/verification/assignments",
        owner.token,
        jsonBody({
          projectId: fixture.projectId,
          profileVersionId: fixture.profileVersionId,
          verifierId: registered.verifierId,
          credentialId: registered.credentialId,
          purpose: "Verify exact installed intervention evidence.",
          scope: assignmentScopes,
          dueOn: "2026-09-01",
          expiresAt: "2027-08-30T00:00:00.000Z",
        }),
      ),
    );
    expect(assignedResponse.status).toBe(201);
    const assignment = (await assignedResponse.json()) as {
      assignmentId: string;
      token: string;
    };
    expect(assignment.token).toMatch(/^fverify_/);
    return { owner, reviewer, registered, ...assignment };
  }

  test("isolates tenant workspaces and enforces verifier credential independence", async () => {
    const alpha = await seedVerification(
      productionDatabase,
      "verification-routes-alpha",
    );
    const beta = await seedVerification(
      productionDatabase,
      "verification-routes-beta",
    );
    const owner = await issueSession(
      alpha,
      "verification-routes-alpha-owner",
      "organization_owner",
    );
    const reviewer = await issueSession(
      alpha,
      "verification-routes-alpha-reviewer",
      "practice_leader",
    );
    const auditor = await issueSession(
      alpha,
      "verification-routes-alpha-auditor",
      "read_only_auditor",
    );
    const workspaceResponse = await getVerificationWorkspace(
      request(
        "https://fortify.test/api/production/verification/workspace",
        owner.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    expect(await workspaceResponse.json()).toMatchObject({
      organizations: [],
      assignments: [],
    });
    const denied = await registerVerifier(
      request(
        "https://fortify.test/api/production/verification/verifiers",
        auditor.token,
        jsonBody(verifierInput(alpha, "auditor-denied")),
      ),
    );
    expect(denied.status).toBe(403);
    const crossTenantPrincipal = await registerVerifier(
      request(
        "https://fortify.test/api/production/verification/verifiers",
        owner.token,
        jsonBody({
          ...verifierInput(alpha, "cross-tenant"),
          externalPrincipalId: beta.externalPrincipalId,
        }),
      ),
    );
    expect(crossTenantPrincipal.status).toBe(404);
    const registeredResponse = await registerVerifier(
      request(
        "https://fortify.test/api/production/verification/verifiers",
        owner.token,
        jsonBody(verifierInput(alpha, "alpha-created")),
      ),
    );
    expect(registeredResponse.status).toBe(201);
    const registered = (await registeredResponse.json()) as {
      verifierId: string;
      credentialId: string;
    };
    const reviewInput = {
      decision: "approved",
      sourceChecked: true,
      note: "Exact credential source and expiry reviewed.",
    };
    const selfReview = await reviewCredential(
      request(
        `https://fortify.test/api/production/verification/credentials/${registered.credentialId}/review`,
        owner.token,
        jsonBody(reviewInput),
      ),
      { params: Promise.resolve({ credentialId: registered.credentialId }) },
    );
    expect(selfReview.status).toBe(409);
    const betaService = new VerificationService(productionDatabase);
    const betaRegistered = await betaService.registerVerifier(
      beta.context,
      verifierInput(beta, "beta-seeded"),
    );
    const crossTenantReview = await reviewCredential(
      request(
        `https://fortify.test/api/production/verification/credentials/${betaRegistered.credentialId}/review`,
        reviewer.token,
        jsonBody(reviewInput),
      ),
      {
        params: Promise.resolve({ credentialId: betaRegistered.credentialId }),
      },
    );
    expect(crossTenantReview.status).toBe(404);
    const reviewed = await reviewCredential(
      request(
        `https://fortify.test/api/production/verification/credentials/${registered.credentialId}/review`,
        reviewer.token,
        jsonBody(reviewInput),
      ),
      { params: Promise.resolve({ credentialId: registered.credentialId }) },
    );
    expect(reviewed.status).toBe(201);
    const crossTenantAssignment = await createAssignment(
      request(
        "https://fortify.test/api/production/verification/assignments",
        owner.token,
        jsonBody({
          projectId: beta.projectId,
          profileVersionId: beta.profileVersionId,
          verifierId: registered.verifierId,
          credentialId: registered.credentialId,
          purpose: "Must remain tenant-bound.",
          scope: assignmentScopes,
          expiresAt: "2027-08-30T00:00:00.000Z",
        }),
      ),
    );
    expect(crossTenantAssignment.status).toBe(409);
    const assignedResponse = await createAssignment(
      request(
        "https://fortify.test/api/production/verification/assignments",
        owner.token,
        jsonBody({
          projectId: alpha.projectId,
          profileVersionId: alpha.profileVersionId,
          verifierId: registered.verifierId,
          credentialId: registered.credentialId,
          purpose: "Verify exact installed intervention evidence.",
          scope: assignmentScopes,
          expiresAt: "2027-08-30T00:00:00.000Z",
        }),
      ),
    );
    expect(assignedResponse.status).toBe(201);
    const workspaceAfter = await getVerificationWorkspace(
      request(
        "https://fortify.test/api/production/verification/workspace",
        owner.token,
      ),
    );
    const workspace = await workspaceAfter.json();
    expect(workspace.assignments).toHaveLength(1);
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
      "humanConfirmed",
      "authorSubject",
      "sourceUrl",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);
  });

  test("executes the assignment, finding, certificate, and maintenance lifecycle through request handlers", async () => {
    const fixture = await seedVerification(
      productionDatabase,
      "verification-routes-lifecycle",
    );
    const access = await registerAndAssign(fixture, "lifecycle");
    const issuer = await issueSession(
      fixture,
      "verification-certificate-issuer-lifecycle",
      "practice_leader",
    );
    const governor = await issueSession(
      fixture,
      "verification-certificate-governor-lifecycle",
      "practice_leader",
    );
    const initialWorkspace = await getAssignmentWorkspace(
      request(
        `https://fortify.test/api/production/verification/assignments/${access.assignmentId}/workspace`,
        access.token,
        undefined,
        "bearer",
      ),
      { params: Promise.resolve({ assignmentId: access.assignmentId }) },
    );
    expect(initialWorkspace.status).toBe(200);
    const conflict = await declareConflict(
      request(
        "https://fortify.test/api/production/verification/conflicts",
        access.token,
        jsonBody({
          assignmentId: access.assignmentId,
          conflictState: "no_conflict_declared",
          declaration:
            "No financial, ownership, employment, or advisory conflict is known.",
          disclosedRelationships: [],
        }),
        "bearer",
      ),
    );
    expect(conflict.status).toBe(201);
    const methodResponse = await recordMethod(
      request(
        "https://fortify.test/api/production/verification/methods",
        access.token,
        jsonBody({
          assignmentId: access.assignmentId,
          methodType: "site_visit",
          methodVersion: "site-observation-v1",
          performedAt: at,
          latitude: "38.581572",
          longitude: "-121.494400",
          measurementJson: { photoCount: 12 },
          limitations: "Visible conditions only.",
        }),
        "bearer",
      ),
    );
    expect(methodResponse.status).toBe(201);
    const method = (await methodResponse.json()) as { methodId: string };
    const findingResponse = await recordFinding(
      request(
        "https://fortify.test/api/production/verification/findings",
        access.token,
        jsonBody({
          assignmentId: access.assignmentId,
          methodId: method.methodId,
          projectInterventionId: fixture.projectInterventionId,
          criterionId: fixture.criterionId,
          conclusion: "conforming",
          evidenceLevel: "verified_installation",
          statement:
            "Visible fixture conditions conform within the stated scope.",
          limitations:
            "No concealed-condition, performance, or insurance conclusion.",
          evidence: [
            {
              evidenceVersionId: fixture.evidenceVersionId,
              relationship: "supports",
            },
          ],
        }),
        "bearer",
      ),
    );
    expect(findingResponse.status).toBe(201);
    const finding = (await findingResponse.json()) as { findingId: string };
    const verifierSelfReview = await reviewFinding(
      request(
        `https://fortify.test/api/production/verification/findings/${finding.findingId}/review`,
        access.token,
        jsonBody({
          decision: "approved",
          evidenceAndMethodChecked: true,
          note: "External verifier cannot approve their own finding.",
        }),
        "bearer",
      ),
      { params: Promise.resolve({ findingId: finding.findingId }) },
    );
    expect(verifierSelfReview.status).toBe(403);
    const findingReview = await reviewFinding(
      request(
        `https://fortify.test/api/production/verification/findings/${finding.findingId}/review`,
        access.reviewer.token,
        jsonBody({
          decision: "approved",
          evidenceAndMethodChecked: true,
          note: "Exact method, evidence, and criterion reviewed.",
        }),
      ),
      { params: Promise.resolve({ findingId: finding.findingId }) },
    );
    expect(findingReview.status).toBe(201);
    const exceptionResponse = await openException(
      request(
        "https://fortify.test/api/production/verification/exceptions",
        access.token,
        jsonBody({
          assignmentId: access.assignmentId,
          findingId: finding.findingId,
          exceptionType: "photo_gap",
          description: "One enclosure needed a supplemental view.",
          severity: "medium",
        }),
        "bearer",
      ),
    );
    expect(exceptionResponse.status).toBe(201);
    const exception = (await exceptionResponse.json()) as {
      exceptionId: string;
    };
    const requiredAction = await recordCorrectiveAction(
      request(
        "https://fortify.test/api/production/verification/corrective-actions",
        access.token,
        jsonBody({
          exceptionId: exception.exceptionId,
          actionType: "supplemental_observation",
          description: "Capture the missing enclosure view.",
          state: "required",
          responsibleSubject: "fixture-manager",
          dueOn: "2026-09-15",
        }),
        "bearer",
      ),
    );
    expect(requiredAction.status).toBe(201);
    const required = (await requiredAction.json()) as {
      correctiveActionId: string;
    };
    const acceptedAction = await recordCorrectiveAction(
      request(
        "https://fortify.test/api/production/verification/corrective-actions",
        access.owner.token,
        jsonBody({
          exceptionId: exception.exceptionId,
          actionType: "supplemental_observation",
          description:
            "Supplemental evidence accepted for the exact exception.",
          state: "accepted",
          responsibleSubject: "fixture-manager",
          evidenceVersionId: fixture.evidenceVersionId,
          supersedesActionId: required.correctiveActionId,
        }),
      ),
    );
    expect(acceptedAction.status).toBe(201);
    const reviewerIssue = await issueCertificate(
      request(
        "https://fortify.test/api/production/verification/certificates",
        access.reviewer.token,
        jsonBody({
          assignmentId: access.assignmentId,
          certificateNumber: "ROUTE-VERIFY-001",
          expiresAt: "2027-08-31T00:00:00.000Z",
          humanConfirmed: true,
          limitations: "Evidence-readiness record only.",
        }),
      ),
    );
    expect(reviewerIssue.status).toBe(409);
    const certificateResponse = await issueCertificate(
      request(
        "https://fortify.test/api/production/verification/certificates",
        issuer.token,
        jsonBody({
          assignmentId: access.assignmentId,
          certificateNumber: "ROUTE-VERIFY-001",
          expiresAt: "2027-08-31T00:00:00.000Z",
          humanConfirmed: true,
          limitations:
            "Fortify records provenance and is not the substantive verifier.",
        }),
      ),
    );
    expect(certificateResponse.status).toBe(201);
    const certificate = (await certificateResponse.json()) as {
      certificateId: string;
    };
    const obligationResponse = await createMaintenanceObligation(
      request(
        "https://fortify.test/api/production/verification/maintenance/obligations",
        access.owner.token,
        jsonBody({
          certificateId: certificate.certificateId,
          interventionVersionId: fixture.interventionVersionId,
          title: "Annual evidence refresh",
          requirement: "Re-observe the version-pinned condition.",
          recurrenceRule: "FREQ=YEARLY",
          evidenceRequirement: "Current dated photographs.",
          nextDueAt: "2027-07-15T00:00:00.000Z",
        }),
      ),
    );
    expect(obligationResponse.status).toBe(201);
    const obligation = (await obligationResponse.json()) as {
      obligationId: string;
    };
    const maintenanceEvent = await recordMaintenanceEvent(
      request(
        "https://fortify.test/api/production/verification/maintenance/events",
        access.token,
        jsonBody({
          obligationId: obligation.obligationId,
          eventType: "evidence_refreshed",
          evidenceVersionId: fixture.evidenceVersionId,
          note: "Exact evidence version refreshed.",
        }),
        "bearer",
      ),
    );
    expect(maintenanceEvent.status).toBe(201);
    const crossTenantCondition = await seedVerification(
      productionDatabase,
      "verification-routes-foreign-condition",
    );
    const deniedCondition = await recordConditionEvent(
      request(
        "https://fortify.test/api/production/verification/condition-events",
        access.token,
        jsonBody({
          propertyId: crossTenantCondition.propertyId,
          projectId: fixture.projectId,
          certificateId: certificate.certificateId,
          eventType: "scheduled_refresh_observation",
          conditionState: "observed_conforming",
          evidenceVersionId: fixture.evidenceVersionId,
          observedAt: at,
          note: "Must remain property and tenant bound.",
        }),
        "bearer",
      ),
    );
    expect(deniedCondition.status).toBe(409);
    const condition = await recordConditionEvent(
      request(
        "https://fortify.test/api/production/verification/condition-events",
        access.token,
        jsonBody({
          propertyId: fixture.propertyId,
          projectId: fixture.projectId,
          certificateId: certificate.certificateId,
          eventType: "scheduled_refresh_observation",
          conditionState: "observed_conforming",
          evidenceVersionId: fixture.evidenceVersionId,
          observedAt: at,
          note: "Visible fixture condition observed within the bounded scope.",
        }),
        "bearer",
      ),
    );
    expect(condition.status).toBe(201);
    const certificateEvent = await recordCertificateEvent(
      request(
        `https://fortify.test/api/production/verification/certificates/${certificate.certificateId}/events`,
        governor.token,
        jsonBody({
          eventType: "revoked",
          rationale: "Synthetic revocation preserves issued history.",
        }),
      ),
      { params: Promise.resolve({ certificateId: certificate.certificateId }) },
    );
    expect(certificateEvent.status).toBe(201);
    const workspaceResponse = await getAssignmentWorkspace(
      request(
        `https://fortify.test/api/production/verification/assignments/${access.assignmentId}/workspace`,
        access.token,
        undefined,
        "bearer",
      ),
      { params: Promise.resolve({ assignmentId: access.assignmentId }) },
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = await workspaceResponse.json();
    expect(workspace).toMatchObject({
      doctrine: {
        fortifyIsSubstantiveVerifier: false,
        missingEvidencePasses: false,
      },
    });
    expect(
      workspace.certificateEvents.map(
        (event: { eventType: string }) => event.eventType,
      ),
    ).toEqual(["issued", "revoked"]);
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
      "humanConfirmed",
      "sourceUrl",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);
  });
});

import { PGlite } from "@electric-sql/pglite";
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
  ModelRecognitionService,
  ModelRecognitionStateError,
} from "@/lib/production/model-recognition-service";
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
  return { ...original, getProductionDatabase: () => routeState.database };
});

import { POST as publishCommitment } from "@/app/api/production/model-recognition/commitments/versions/[versionId]/publish/route";
import { POST as reviewCommitment } from "@/app/api/production/model-recognition/commitments/versions/[versionId]/review/route";
import { POST as createCommitment } from "@/app/api/production/model-recognition/commitments/versions/route";
import { POST as recordMappingEvent } from "@/app/api/production/model-recognition/mappings/[mappingId]/events/route";
import { POST as reviewMapping } from "@/app/api/production/model-recognition/mappings/[mappingId]/review/route";
import { POST as createMapping } from "@/app/api/production/model-recognition/mappings/route";
import { POST as publishModelVersion } from "@/app/api/production/model-recognition/models/versions/[versionId]/publish/route";
import { POST as reviewModelVersion } from "@/app/api/production/model-recognition/models/versions/[versionId]/review/route";
import { POST as createModelVersion } from "@/app/api/production/model-recognition/models/versions/route";
import { POST as createRecognitionOrganization } from "@/app/api/production/model-recognition/organizations/route";
import { POST as createModelOutput } from "@/app/api/production/model-recognition/outputs/route";
import { GET as getModelRecognitionWorkspace } from "@/app/api/production/model-recognition/workspace/route";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const at = "2026-12-12T17:00:00.000Z";
const actor = (
  context: TenantContext,
  actorSubject: string,
): TenantContext => ({ ...context, actorSubject });

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
  await client.close();
  vi.unstubAllEnvs();
});

async function seedM8Prerequisites(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const owned = tenantRecord(fixture.context, at);
  const sourceId = `m8-source-${key}`,
    sourceVersionId = `${sourceId}-v1`;
  await database.insert(schema.governedSources).values({
    id: sourceId,
    ...owned,
    canonicalKey: sourceId,
    sourceClass: "external_model_documentation",
    issuingAuthority: "Fictional external authority",
    title: "Exact model and commitment source",
    jurisdiction: "Colorado",
    officialUrl: `https://example.test/${key}/source`,
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
    sourceHash: key.padEnd(64, "8").slice(0, 64),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Internal mapping and commitment review only.",
    structuredSummary: {
      boundary: "No redistribution or outcome inference.",
    },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2027-02-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    authorSubject: fixture.context.actorSubject,
    changeSummary: "Initial exact fixture source.",
  });
  await database.insert(schema.governedSourceReviews).values({
    id: `${sourceVersionId}-review`,
    ...owned,
    sourceVersionId,
    decision: "approved",
    reviewerSubject: "source-reviewer",
    note: "Exact source and restricted rights reviewed.",
    sourceCompared: true,
    rightsConfirmed: true,
    reviewedAt: at,
  });
  await database.insert(schema.governedSourcePublications).values({
    id: `${sourceVersionId}-publication`,
    ...owned,
    sourceVersionId,
    decision: "published",
    publisherSubject: "source-publisher",
    note: "Published as a bounded source reference.",
    publishedAt: at,
  });

  const profileId = `m8-profile-${key}`,
    profileVersionId = `${profileId}-v1`,
    criterionId = `${profileId}-criterion`;
  await database.insert(schema.targetProfiles).values({
    id: profileId,
    ...owned,
    canonicalKey: profileId,
    name: "Colorado evidence-readiness profile",
    description: "Synthetic test profile.",
    jurisdiction: "Colorado",
    peril: "wildfire",
    propertyClass: "community_association",
  });
  await database.insert(schema.targetProfileVersions).values({
    id: profileVersionId,
    ...owned,
    profileId,
    versionNumber: 1,
    effectiveFrom: "2026-11-01",
    status: "published",
    authorSubject: fixture.context.actorSubject,
    changeSummary: "Initial fixture.",
    limitations: "No designation, risk score, or market commitment.",
    recognitionState: "unavailable_no_commitment_registry",
  });
  await database.insert(schema.targetProfileCriteria).values({
    id: criterionId,
    ...owned,
    profileVersionId,
    code: "ROOF-01",
    title: "Documented roof covering",
    targetLevel: "minimum",
    evidenceLevel: "independent_verification",
    requirementText: "Document visible installed roof covering.",
    verificationMethod: "Independent site observation with exact photographs.",
    position: 1,
  });
  await database.insert(schema.targetProfileReviews).values({
    id: `${profileVersionId}-review`,
    ...owned,
    profileVersionId,
    decision: "approved",
    reviewerSubject: "profile-reviewer",
    note: "Profile scope reviewed.",
    sourcePinsChecked: true,
    reviewedAt: at,
  });
  await database.insert(schema.targetProfilePublications).values({
    id: `${profileVersionId}-publication`,
    ...owned,
    profileVersionId,
    decision: "published",
    publisherSubject: "profile-publisher",
    note: "Published fixture profile.",
    publishedAt: at,
  });

  const interventionId = `m8-intervention-${key}`,
    interventionVersionId = `${interventionId}-v1`,
    projectId = `m8-project-${key}`,
    projectInterventionId = `${projectId}-intervention`;
  await database.insert(schema.interventions).values({
    id: interventionId,
    ...owned,
    canonicalKey: interventionId,
    name: "Roof evidence intervention",
    category: "physical_work",
    description: "Synthetic roof-covering intervention.",
  });
  await database.insert(schema.interventionVersions).values({
    id: interventionVersionId,
    ...owned,
    interventionId,
    versionNumber: 1,
    status: "published",
    technicalSpecification: "Install and document the version-pinned covering.",
    evidenceLevel: "independent_verification",
    typicalCostLowCents: 100_000,
    typicalCostHighCents: 200_000,
    typicalDurationDays: 10,
    dependencies: [],
    maintenanceRequirements: ["Annual evidence refresh"],
    benefitStatement: "May improve evidence readiness.",
    benefitBoundary: "No risk, insurance, or pricing result is asserted.",
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
    note: "Specification and boundary reviewed.",
    reviewedAt: at,
  });
  await database.insert(schema.resilienceProjects).values({
    id: projectId,
    ...owned,
    propertyId: fixture.propertyId,
    name: "M8 mapping project",
    description: "Synthetic completed intervention.",
    status: "complete",
  });
  await database.insert(schema.projectInterventions).values({
    id: projectInterventionId,
    ...owned,
    projectId,
    interventionVersionId,
    rationale: "Map only after independent evidence approval.",
  });

  const evidenceItemId = `m8-evidence-${key}`,
    evidenceVersionId = `${evidenceItemId}-v1`;
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
    filename: "roof.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 4096,
    sha256: key.padEnd(64, "e").slice(0, 64),
    storageKey: `tenant/${key}/roof.jpg`,
    sourceType: "site_capture",
    sourceOrganization: "Fictional independent verifier",
    captureDate: "2026-12-01",
    receivedAt: at,
    scopeType: "property",
    scopeReference: fixture.propertyId,
    reviewStatus: "confirmed",
    reviewedBy: "evidence-reviewer",
    reviewedAt: at,
  });

  const verificationOrganizationId = `m8-verification-org-${key}`,
    verifierId = `m8-verifier-${key}`,
    credentialId = `m8-credential-${key}`,
    assignmentId = `m8-assignment-${key}`,
    methodId = `m8-method-${key}`,
    findingId = `m8-finding-${key}`;
  await database.insert(schema.verificationOrganizations).values({
    id: verificationOrganizationId,
    ...owned,
    legalName: `Fictional verifier ${key}`,
    organizationType: "engineering",
    status: "active",
    limitations: "Synthetic verifier record.",
  });
  await database.insert(schema.verifiers).values({
    id: verifierId,
    ...owned,
    verificationOrganizationId,
    displayName: "Fixture verifier",
    email: `verifier-${key}@example.test`,
    status: "active",
  });
  await database.insert(schema.verifierCredentials).values({
    id: credentialId,
    ...owned,
    verifierId,
    versionNumber: 1,
    credentialType: "fictional property reviewer",
    issuer: "Fictional registry",
    credentialReference: `C-${key}`,
    jurisdiction: "Colorado",
    scope: ["site observation"],
    issuedOn: "2026-01-01",
    expiresOn: "2027-12-31",
    sourceVersion: "fixture-2026.1",
    verifyCurrentStatus: "verified_current",
    authorSubject: "credential-author",
  });
  await database.insert(schema.verifierCredentialReviews).values({
    id: `${credentialId}-review`,
    ...owned,
    credentialId,
    decision: "approved",
    reviewerSubject: "credential-reviewer",
    sourceChecked: true,
    note: "Credential source and expiry checked.",
    reviewedAt: at,
  });
  await database.insert(schema.verificationAssignments).values({
    id: assignmentId,
    ...owned,
    projectId,
    profileVersionId,
    verifierId,
    credentialId,
    purpose: "Verify exact roof evidence.",
    scope: ["verification_finding:create"],
    tokenHash: key.padEnd(64, "t").slice(0, 64),
    assignedBy: "programme-admin",
    assignedAt: at,
    expiresAt: "2027-12-31T00:00:00.000Z",
  });
  await database.insert(schema.verificationConflictDeclarations).values({
    id: `${assignmentId}-conflict`,
    ...owned,
    assignmentId,
    declaration: "No conflict declared.",
    conflictState: "no_conflict_declared",
    disclosedRelationships: [],
    signedBy: "fixture-verifier",
    signedAt: at,
  });
  await database.insert(schema.verificationMethods).values({
    id: methodId,
    ...owned,
    assignmentId,
    methodType: "site_visit",
    methodVersion: "site-v1",
    performedBy: "fixture-verifier",
    performedAt: at,
    measurementJson: { photoCount: 1 },
    limitations: "Visible conditions only.",
  });
  await database.insert(schema.verificationFindings).values({
    id: findingId,
    ...owned,
    assignmentId,
    methodId,
    projectInterventionId,
    criterionId,
    conclusion: "conforming",
    evidenceLevel: "verified_installation",
    statement: "Visible roof covering conforms within the observation scope.",
    limitations: "No concealed-condition or future-loss conclusion.",
    verifierSubject: "fixture-verifier",
    concludedAt: at,
    signatureHash: key.padEnd(64, "f").slice(0, 64),
  });
  await database.insert(schema.verificationFindingEvidenceLinks).values({
    id: `${findingId}-evidence`,
    ...owned,
    findingId,
    evidenceVersionId,
    relationship: "supports",
  });
  await database.insert(schema.verificationFindingReviews).values({
    id: `${findingId}-review`,
    ...owned,
    findingId,
    decision: "approved",
    reviewerSubject: "finding-reviewer",
    evidenceAndMethodChecked: true,
    note: "Exact method and evidence reviewed.",
    reviewedAt: at,
  });

  const service = new ModelRecognitionService(db(), () => new Date(at));
  const registered = await service.createModelVersion(fixture.context, {
    provider: {
      canonicalKey: `provider-${key}`,
      name: "Fictional model provider",
      providerType: "insurer_model",
      limitations: "No actual carrier affiliation or authority.",
    },
    model: {
      canonicalKey: `model-${key}`,
      name: "Fictional evidence intake",
      peril: "wildfire evidence intake",
      description: "External input schema only.",
    },
    versionLabel: "2026.4",
    geography: ["Colorado"],
    propertyClasses: ["community association"],
    effectiveFrom: "2026-11-01",
    sourceVersionId,
    methodologySummary:
      "Provider-authored evidence intake fields; Fortify does not run the model.",
    usageRights: "Internal evidence mapping only.",
    redistributionRestrictions: "Do not redistribute.",
    limitations: "No risk score, pricing, renewal, or acceptance inference.",
    inputs: [
      {
        inputKey: "roof_covering_class",
        label: "Roof covering classification",
        dataType: "enum",
        allowedValues: ["unclassified", "Class A documented"],
        definition: "Provider-defined visible covering category.",
        supportStatus: "supported",
        transformationBoundary: "Exact approved finding and evidence only.",
        requiredByModel: true,
      },
      {
        inputKey: "response_minutes",
        label: "Fire response minutes",
        dataType: "number",
        unit: "minutes",
        definition: "Provider response-time field.",
        supportStatus: "unsupported",
        transformationBoundary:
          "No authoritative Fortify source or transformation.",
      },
    ],
    outputs: [
      {
        outputKey: "review_disposition",
        label: "Review disposition",
        dataType: "string",
        definition: "Externally supplied provider response.",
        limitations: "Not generated or endorsed by Fortify.",
      },
    ],
  });
  await service.reviewModelVersion(actor(fixture.context, "model-reviewer"), {
    modelVersionId: registered.modelVersionId,
    decision: "approved",
    sourceRightsAndDefinitionsChecked: true,
    note: "Exact source, rights, definitions, and limitations checked.",
  });
  await service.publishModelVersion(actor(fixture.context, "model-publisher"), {
    modelVersionId: registered.modelVersionId,
    decision: "published",
    humanConfirmed: true,
    note: "Publish bounded external model reference.",
  });
  const inputs = await database
    .select()
    .from(schema.modelInputDefinitions)
    .where(
      eq(
        schema.modelInputDefinitions.modelVersionId,
        registered.modelVersionId,
      ),
    );
  const outputs = await database
    .select()
    .from(schema.modelOutputDefinitions)
    .where(
      eq(
        schema.modelOutputDefinitions.modelVersionId,
        registered.modelVersionId,
      ),
    );
  return {
    fixture,
    service,
    sourceVersionId,
    profileVersionId,
    projectInterventionId,
    evidenceVersionId,
    findingId,
    modelVersionId: registered.modelVersionId,
    supportedInputId: inputs.find((item) => item.supportStatus === "supported")!
      .id,
    unsupportedInputId: inputs.find(
      (item) => item.supportStatus === "unsupported",
    )!.id,
    outputDefinitionId: outputs[0].id,
  };
}

const proposal = (
  setup: Awaited<ReturnType<typeof seedM8Prerequisites>>,
  inputDefinitionId = setup.supportedInputId,
) =>
  setup.service.proposeMapping(setup.fixture.context, {
    propertyId: setup.fixture.propertyId,
    projectInterventionId: setup.projectInterventionId,
    verificationFindingId: setup.findingId,
    modelVersionId: setup.modelVersionId,
    inputDefinitionId,
    preInterventionValue: { value: "unclassified" },
    proposedPostInterventionValue: { value: "Class A documented" },
    transformationMethod: "Approved finding to provider category",
    methodologyVersion: "recipe-1.2",
    confidence: "high",
    source: "approved finding and exact evidence",
    limitations: "Visible documented covering only.",
    expiresAt: "2027-12-31T00:00:00.000Z",
    evidenceVersionIds: [setup.evidenceVersionId],
  });

function request(url: string, credential: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", `fortify_session=${credential}`);
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
  setup: Awaited<ReturnType<typeof seedM8Prerequisites>>,
  subject: string,
  role: OrganizationRole = "organization_owner",
) {
  const membership = await createActiveMembership(db(), {
    organizationId: setup.fixture.organizationId,
    subject,
    role,
  });
  return new IdentityService(db()).issueSession({
    profile: membership.profile,
    activeOrganizationId: setup.fixture.organizationId,
    ttlSeconds: 3_600,
  });
}

function mappingInput(setup: Awaited<ReturnType<typeof seedM8Prerequisites>>) {
  return {
    propertyId: setup.fixture.propertyId,
    projectInterventionId: setup.projectInterventionId,
    verificationFindingId: setup.findingId,
    modelVersionId: setup.modelVersionId,
    inputDefinitionId: setup.supportedInputId,
    preInterventionValue: { value: "unclassified" },
    proposedPostInterventionValue: { value: "Class A documented" },
    transformationMethod: "Approved finding to provider category",
    methodologyVersion: "route-recipe-1.0",
    confidence: "high",
    source: "approved finding and exact evidence",
    limitations: "Visible documented covering only.",
    expiresAt: "2027-12-31T00:00:00.000Z",
    evidenceVersionIds: [setup.evidenceVersionId],
  };
}

function modelInput(
  setup: Awaited<ReturnType<typeof seedM8Prerequisites>>,
  key: string,
) {
  return {
    provider: {
      canonicalKey: `route-provider-${key}`,
      name: `Route provider ${key}`,
      providerType: "insurer_model",
      limitations: "Fictional route fixture without authority.",
    },
    model: {
      canonicalKey: `route-model-${key}`,
      name: `Route model ${key}`,
      peril: "wildfire evidence intake",
      description: "External definition fixture only.",
    },
    versionLabel: "2026.route",
    geography: ["Colorado"],
    propertyClasses: ["community association"],
    effectiveFrom: "2026-11-01",
    sourceVersionId: setup.sourceVersionId,
    methodologySummary:
      "Provider-authored definitions; Fortify does not run the model.",
    usageRights: "Internal fixture mapping only.",
    redistributionRestrictions: "Do not redistribute.",
    limitations: "No risk, pricing, renewal, or acceptance inference.",
    inputs: [
      {
        inputKey: "roof_covering_class",
        label: "Roof covering classification",
        dataType: "enum",
        allowedValues: ["unclassified", "Class A documented"],
        definition: "Provider-defined evidence field.",
        supportStatus: "supported",
        transformationBoundary: "Exact approved evidence only.",
        requiredByModel: true,
      },
    ],
    outputs: [
      {
        outputKey: "review_disposition",
        label: "Review disposition",
        dataType: "string",
        definition: "Externally supplied response.",
        limitations: "Not generated or endorsed by Fortify.",
      },
    ],
  };
}

describe("external model mapping and market commitment governance", () => {
  test("requires source rights and three distinct humans before an external model can be used", async () => {
    const setup = await seedM8Prerequisites("m8-model");
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.modelVersions[0]).toMatchObject({
      status: "active",
      sourceVersionId: setup.sourceVersionId,
    });
    expect(workspace.doctrine).toMatchObject({
      fortifyGeneratesRiskScores: false,
      externalAcceptanceRequiresHumanEvidence: true,
    });
    await expect(
      setup.service.recordModelOutput(setup.fixture.context, {
        propertyId: setup.fixture.propertyId,
        modelVersionId: setup.modelVersionId,
        outputDefinitionId: setup.outputDefinitionId,
        evidenceVersionId: setup.evidenceVersionId,
        recordedValue: { disposition: "reviewed" },
        asOfDate: "2026-12-12",
        sourceAuthority: "Fictional provider",
        sourceReference: "response-1",
        assumptions: [],
        limitations: "External fictional result.",
        humanConfirmed: false,
      }),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const output = await setup.service.recordModelOutput(
      setup.fixture.context,
      {
        propertyId: setup.fixture.propertyId,
        modelVersionId: setup.modelVersionId,
        outputDefinitionId: setup.outputDefinitionId,
        evidenceVersionId: setup.evidenceVersionId,
        recordedValue: { disposition: "reviewed" },
        asOfDate: "2026-12-12",
        sourceAuthority: "Fictional provider",
        sourceReference: "response-1",
        assumptions: [],
        limitations: "External fictional result.",
        humanConfirmed: true,
      },
    );
    expect(output.outputRecordId).toBeTruthy();
  });

  test("preserves pre, proposed, and externally modified accepted values as separate records", async () => {
    const setup = await seedM8Prerequisites("m8-mapping");
    const mapping = await proposal(setup);
    await expect(
      setup.service.reviewMapping(setup.fixture.context, {
        mappingId: mapping.mappingId,
        decision: "approved_for_submission",
        modelDocumentationChecked: true,
        verificationChecked: true,
        note: "Self-review must fail.",
      }),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.reviewMapping(
      actor(setup.fixture.context, "mapping-reviewer"),
      {
        mappingId: mapping.mappingId,
        decision: "approved_for_submission",
        modelDocumentationChecked: true,
        verificationChecked: true,
        note: "Exact definitions, evidence, and recipe reviewed.",
      },
    );
    const submitted = await setup.service.recordMappingEvent(
      actor(setup.fixture.context, "submission-recorder"),
      {
        mappingId: mapping.mappingId,
        eventType: "submitted",
        reason: "Exact proposal submitted for fictional review.",
        sourceAuthority: "Fortify case operator",
        sourceReference: "submission-1",
        humanConfirmed: true,
      },
    );
    await expect(
      setup.service.recordMappingEvent(
        actor(setup.fixture.context, "response-recorder"),
        {
          mappingId: mapping.mappingId,
          eventType: "accepted_with_modification",
          acceptedValue: { value: "Class A — qualified" },
          reason: "Must require human confirmation.",
          sourceAuthority: "Fictional provider",
          sourceReference: "response-2",
          humanConfirmed: false,
          supersedesEventId: submitted.eventId,
        },
      ),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.recordMappingEvent(
      actor(setup.fixture.context, "response-recorder"),
      {
        mappingId: mapping.mappingId,
        eventType: "accepted_with_modification",
        acceptedValue: { value: "Class A — qualified" },
        reason: "Provider narrowed the accepted property-level qualifier.",
        sourceAuthority: "Fictional provider",
        sourceReference: "response-2",
        humanConfirmed: true,
        supersedesEventId: submitted.eventId,
      },
    );
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.mappings[0]).toMatchObject({
      preInterventionValue: { value: "unclassified" },
      proposedPostInterventionValue: { value: "Class A documented" },
      acceptedValue: { value: "Class A — qualified" },
      currentState: "accepted_with_modification",
    });
    await expect(
      database
        .update(schema.modelInputMappings)
        .set({ proposedPostInterventionValue: { value: "tampered" } })
        .where(eq(schema.modelInputMappings.id, mapping.mappingId)),
    ).rejects.toThrow();
  });

  test("keeps unsupported mappings explicit and blocks submission approval", async () => {
    const setup = await seedM8Prerequisites("m8-unsupported");
    const mapping = await proposal(setup, setup.unsupportedInputId);
    await expect(
      setup.service.reviewMapping(
        actor(setup.fixture.context, "mapping-reviewer"),
        {
          mappingId: mapping.mappingId,
          decision: "approved_for_submission",
          modelDocumentationChecked: true,
          verificationChecked: true,
          note: "Unsupported input must fail closed.",
        },
      ),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.reviewMapping(
      actor(setup.fixture.context, "mapping-reviewer"),
      {
        mappingId: mapping.mappingId,
        decision: "unsupported",
        modelDocumentationChecked: true,
        verificationChecked: true,
        note: "No authoritative source or transformation exists.",
      },
    );
    const event = await setup.service.recordMappingEvent(
      actor(setup.fixture.context, "mapping-governor"),
      {
        mappingId: mapping.mappingId,
        eventType: "unsupported",
        reason: "Unsupported definition retained explicitly.",
        sourceAuthority: "Fortify governed register",
        sourceReference: "input-definition",
        humanConfirmed: true,
      },
    );
    expect(event.state).toBe("unsupported");
  });

  test("publishes a review-only commitment without converting it into insurance authority", async () => {
    const setup = await seedM8Prerequisites("m8-commitment");
    const organization = await setup.service.registerRecognitionOrganization(
      setup.fixture.context,
      {
        canonicalKey: "fictional-mutual",
        legalName: "Fictional High Plains Mutual",
        organizationType: "insurer",
        limitations:
          "No actual affiliation, appetite, capacity, pricing, or acceptance.",
      },
    );
    await expect(
      setup.service.createCommitmentVersion(setup.fixture.context, {
        committingOrganizationId: organization.recognitionOrganizationId,
        canonicalKey: "review-sla-invalid",
        name: "Invalid review SLA",
        commitmentType: "response_service_level",
        profileVersionId: setup.profileVersionId,
        modelVersionId: setup.modelVersionId,
        geography: ["Colorado"],
        propertyClasses: ["community association"],
        evidenceRequired: ["Approved finding"],
        exclusions: ["No insurance promise"],
        responseOrFinancialAction: "Review the evidence package.",
        authorityScope: "underwriting_action",
        effectiveFrom: "2026-12-01",
        sourceVersionId: setup.sourceVersionId,
        limitations: "Must fail.",
      }),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const commitment = await setup.service.createCommitmentVersion(
      setup.fixture.context,
      {
        committingOrganizationId: organization.recognitionOrganizationId,
        canonicalKey: "review-sla",
        name: "Evidence review service level",
        commitmentType: "response_service_level",
        profileVersionId: setup.profileVersionId,
        modelVersionId: setup.modelVersionId,
        geography: ["Colorado"],
        propertyClasses: ["community association"],
        evidenceRequired: [
          "Approved independent finding",
          "Exact model-input mapping",
        ],
        exclusions: [
          "No quote, bind, renewal, price, capacity, or acceptance promise",
        ],
        responseOrFinancialAction:
          "Review a complete fictional evidence package within 15 business days.",
        authorityScope: "review_only",
        effectiveFrom: "2026-12-01",
        effectiveTo: "2027-12-01",
        sourceVersionId: setup.sourceVersionId,
        limitations: "Will review does not mean will insure.",
      },
    );
    await setup.service.reviewCommitmentVersion(
      actor(setup.fixture.context, "commitment-reviewer"),
      {
        commitmentVersionId: commitment.commitmentVersionId,
        decision: "approved",
        sourceAndScopeChecked: true,
        note: "Source, scope, exclusions, and review-only authority checked.",
      },
    );
    await expect(
      setup.service.publishCommitmentVersion(
        actor(setup.fixture.context, "commitment-reviewer"),
        {
          commitmentVersionId: commitment.commitmentVersionId,
          decision: "published",
          humanConfirmed: true,
          note: "Same reviewer must fail.",
        },
      ),
    ).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const published = await setup.service.publishCommitmentVersion(
      actor(setup.fixture.context, "commitment-publisher"),
      {
        commitmentVersionId: commitment.commitmentVersionId,
        decision: "published",
        humanConfirmed: true,
        note: "Publish exact review-only commitment.",
      },
    );
    expect(published.status).toBe("published");
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.commitmentVersions[0]).toMatchObject({
      authorityScope: "review_only",
      status: "published",
      exclusions: [
        "No quote, bind, renewal, price, capacity, or acceptance promise",
      ],
    });
    expect(workspace.doctrine.reviewCommitmentEqualsInsurance).toBe(false);
  });

  test("rejects cross-tenant model-input references at the database boundary", async () => {
    const alpha = await seedM8Prerequisites("m8-alpha"),
      beta = await seedM8Prerequisites("m8-beta");
    await expect(
      database.insert(schema.modelInputMappings).values({
        id: "cross-tenant-mapping",
        ...tenantRecord(beta.fixture.context, at),
        propertyId: beta.fixture.propertyId,
        projectInterventionId: beta.projectInterventionId,
        verificationFindingId: beta.findingId,
        modelVersionId: alpha.modelVersionId,
        inputDefinitionId: alpha.supportedInputId,
        preInterventionValue: { value: "old" },
        proposedPostInterventionValue: { value: "new" },
        transformationMethod: "Must fail",
        methodologyVersion: "invalid",
        confidence: "not_assessed",
        source: "cross tenant",
        limitations: "Must not persist.",
        authorSubject: beta.fixture.context.actorSubject,
        proposedAt: at,
      }),
    ).rejects.toThrow();
  });
});

describe("model-recognition request binding", () => {
  test("isolates and minimizes the authenticated workspace", async () => {
    const alpha = await seedM8Prerequisites("model-routes-workspace-alpha");
    const beta = await seedM8Prerequisites("model-routes-workspace-beta");
    const owner = await issueSession(alpha, "model-routes-workspace-owner");
    const auditor = await issueSession(
      alpha,
      "model-routes-workspace-auditor",
      "read_only_auditor",
    );

    const response = await getModelRecognitionWorkspace(
      request(
        "https://fortify.test/api/production/model-recognition/workspace",
        owner.token,
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const workspace = await response.json();
    expect(workspace.modelVersions).toHaveLength(1);
    expect(workspace.modelVersions[0].id).toBe(alpha.modelVersionId);
    expect(
      workspace.modelVersions.map((item: { id: string }) => item.id),
    ).not.toContain(beta.modelVersionId);
    const keys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "authorSubject",
      "recordedValue",
      "evidenceVersionId",
      "propertyId",
      "note",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);

    const denied = await createRecognitionOrganization(
      request(
        "https://fortify.test/api/production/model-recognition/organizations",
        auditor.token,
        jsonBody({
          canonicalKey: "auditor-denied",
          legalName: "Auditor denied organization",
          organizationType: "insurer",
          limitations: "Must not persist.",
        }),
      ),
    );
    expect(denied.status).toBe(403);
  });

  test("binds model version, review, publication, and output authority", async () => {
    const alpha = await seedM8Prerequisites("model-routes-model-alpha");
    const beta = await seedM8Prerequisites("model-routes-model-beta");
    const author = await issueSession(alpha, "model-routes-model-author");
    const reviewer = await issueSession(alpha, "model-routes-model-reviewer");
    const publisher = await issueSession(alpha, "model-routes-model-publisher");

    const crossTenant = await createModelVersion(
      request(
        "https://fortify.test/api/production/model-recognition/models/versions",
        author.token,
        jsonBody({
          ...modelInput(alpha, "cross-tenant-source"),
          sourceVersionId: beta.sourceVersionId,
        }),
      ),
    );
    expect(crossTenant.status).toBe(409);

    const createdResponse = await createModelVersion(
      request(
        "https://fortify.test/api/production/model-recognition/models/versions",
        author.token,
        jsonBody(modelInput(alpha, "authorized")),
      ),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as {
      modelVersionId: string;
    };

    const selfReview = await reviewModelVersion(
      request(
        `https://fortify.test/api/production/model-recognition/models/versions/${created.modelVersionId}/review`,
        author.token,
        jsonBody({
          decision: "approved",
          sourceRightsAndDefinitionsChecked: true,
          note: "Self review must fail.",
        }),
      ),
      routeParams({ versionId: created.modelVersionId }),
    );
    expect(selfReview.status).toBe(409);
    const reviewed = await reviewModelVersion(
      request(
        `https://fortify.test/api/production/model-recognition/models/versions/${created.modelVersionId}/review`,
        reviewer.token,
        jsonBody({
          decision: "approved",
          sourceRightsAndDefinitionsChecked: true,
          note: "Exact source, rights, definitions, and limits checked.",
        }),
      ),
      routeParams({ versionId: created.modelVersionId }),
    );
    expect(reviewed.status).toBe(201);
    const deniedPublication = await publishModelVersion(
      request(
        `https://fortify.test/api/production/model-recognition/models/versions/${created.modelVersionId}/publish`,
        reviewer.token,
        jsonBody({
          decision: "published",
          humanConfirmed: true,
          note: "Reviewer cannot publish.",
        }),
      ),
      routeParams({ versionId: created.modelVersionId }),
    );
    expect(deniedPublication.status).toBe(409);
    const published = await publishModelVersion(
      request(
        `https://fortify.test/api/production/model-recognition/models/versions/${created.modelVersionId}/publish`,
        publisher.token,
        jsonBody({
          decision: "published",
          humanConfirmed: true,
          note: "Publish the bounded external definition.",
        }),
      ),
      routeParams({ versionId: created.modelVersionId }),
    );
    expect(published.status).toBe(201);

    const foreignOutput = await createModelOutput(
      request(
        "https://fortify.test/api/production/model-recognition/outputs",
        author.token,
        jsonBody({
          propertyId: beta.fixture.propertyId,
          modelVersionId: beta.modelVersionId,
          outputDefinitionId: beta.outputDefinitionId,
          evidenceVersionId: beta.evidenceVersionId,
          recordedValue: { disposition: "must-not-cross" },
          asOfDate: "2026-12-12",
          sourceAuthority: "Foreign fictional provider",
          sourceReference: "foreign-response",
          assumptions: [],
          limitations: "Must fail.",
          humanConfirmed: true,
        }),
      ),
    );
    expect(foreignOutput.status).toBe(409);
    const output = await createModelOutput(
      request(
        "https://fortify.test/api/production/model-recognition/outputs",
        author.token,
        jsonBody({
          propertyId: alpha.fixture.propertyId,
          modelVersionId: alpha.modelVersionId,
          outputDefinitionId: alpha.outputDefinitionId,
          evidenceVersionId: alpha.evidenceVersionId,
          recordedValue: { disposition: "externally reviewed" },
          asOfDate: "2026-12-12",
          sourceAuthority: "Fictional provider",
          sourceReference: "authorized-response",
          assumptions: [],
          limitations: "External fixture result only.",
          humanConfirmed: true,
        }),
      ),
    );
    expect(output.status).toBe(201);
  });

  test("binds mapping proposal, independent review, and append-only events", async () => {
    const alpha = await seedM8Prerequisites("model-routes-mapping-alpha");
    const beta = await seedM8Prerequisites("model-routes-mapping-beta");
    const author = await issueSession(alpha, "model-routes-mapping-author");
    const reviewer = await issueSession(alpha, "model-routes-mapping-reviewer");
    const recorder = await issueSession(alpha, "model-routes-mapping-recorder");

    const foreign = await createMapping(
      request(
        "https://fortify.test/api/production/model-recognition/mappings",
        author.token,
        jsonBody(mappingInput(beta)),
      ),
    );
    expect(foreign.status).toBe(409);
    const createdResponse = await createMapping(
      request(
        "https://fortify.test/api/production/model-recognition/mappings",
        author.token,
        jsonBody(mappingInput(alpha)),
      ),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as { mappingId: string };

    const selfReview = await reviewMapping(
      request(
        `https://fortify.test/api/production/model-recognition/mappings/${created.mappingId}/review`,
        author.token,
        jsonBody({
          decision: "approved_for_submission",
          modelDocumentationChecked: true,
          verificationChecked: true,
          note: "Self review must fail.",
        }),
      ),
      routeParams({ mappingId: created.mappingId }),
    );
    expect(selfReview.status).toBe(409);
    const reviewed = await reviewMapping(
      request(
        `https://fortify.test/api/production/model-recognition/mappings/${created.mappingId}/review`,
        reviewer.token,
        jsonBody({
          decision: "approved_for_submission",
          modelDocumentationChecked: true,
          verificationChecked: true,
          note: "Exact model documentation and verification checked.",
        }),
      ),
      routeParams({ mappingId: created.mappingId }),
    );
    expect(reviewed.status).toBe(201);
    const unconfirmed = await recordMappingEvent(
      request(
        `https://fortify.test/api/production/model-recognition/mappings/${created.mappingId}/events`,
        recorder.token,
        jsonBody({
          eventType: "submitted",
          reason: "Unconfirmed submission must fail.",
          sourceAuthority: "Fortify case operator",
          sourceReference: "submission-unconfirmed",
          humanConfirmed: false,
        }),
      ),
      routeParams({ mappingId: created.mappingId }),
    );
    expect(unconfirmed.status).toBe(409);
    const submitted = await recordMappingEvent(
      request(
        `https://fortify.test/api/production/model-recognition/mappings/${created.mappingId}/events`,
        recorder.token,
        jsonBody({
          eventType: "submitted",
          reason: "Exact proposal submitted for fictional review.",
          sourceAuthority: "Fortify case operator",
          sourceReference: "submission-authorized",
          humanConfirmed: true,
        }),
      ),
      routeParams({ mappingId: created.mappingId }),
    );
    expect(submitted.status).toBe(201);
  });

  test("binds recognition organizations and three-person commitment publication", async () => {
    const alpha = await seedM8Prerequisites("model-routes-commitment-alpha");
    const beta = await seedM8Prerequisites("model-routes-commitment-beta");
    const author = await issueSession(alpha, "model-routes-commitment-author");
    const reviewer = await issueSession(
      alpha,
      "model-routes-commitment-reviewer",
    );
    const publisher = await issueSession(
      alpha,
      "model-routes-commitment-publisher",
    );
    const betaOwner = await issueSession(
      beta,
      "model-routes-commitment-beta-owner",
    );

    const alphaOrganizationResponse = await createRecognitionOrganization(
      request(
        "https://fortify.test/api/production/model-recognition/organizations",
        author.token,
        jsonBody({
          canonicalKey: "alpha-fictional-mutual",
          legalName: "Alpha Fictional Mutual",
          organizationType: "insurer",
          limitations:
            "No actual affiliation, pricing, capacity, or acceptance.",
        }),
      ),
    );
    expect(alphaOrganizationResponse.status).toBe(201);
    const alphaOrganization = (await alphaOrganizationResponse.json()) as {
      recognitionOrganizationId: string;
    };
    const betaOrganizationResponse = await createRecognitionOrganization(
      request(
        "https://fortify.test/api/production/model-recognition/organizations",
        betaOwner.token,
        jsonBody({
          canonicalKey: "beta-fictional-mutual",
          legalName: "Beta Fictional Mutual",
          organizationType: "insurer",
          limitations: "Foreign tenant fixture.",
        }),
      ),
    );
    const betaOrganization = (await betaOrganizationResponse.json()) as {
      recognitionOrganizationId: string;
    };
    const commitmentInput = {
      committingOrganizationId: alphaOrganization.recognitionOrganizationId,
      canonicalKey: "route-review-sla",
      name: "Evidence review service level",
      commitmentType: "response_service_level",
      profileVersionId: alpha.profileVersionId,
      modelVersionId: alpha.modelVersionId,
      geography: ["Colorado"],
      propertyClasses: ["community association"],
      evidenceRequired: [
        "Approved independent finding",
        "Exact model-input mapping",
      ],
      exclusions: [
        "No quote, bind, renewal, price, capacity, or acceptance promise",
      ],
      responseOrFinancialAction:
        "Review a complete fictional evidence package.",
      authorityScope: "review_only",
      effectiveFrom: "2026-12-01",
      effectiveTo: "2027-12-01",
      sourceVersionId: alpha.sourceVersionId,
      limitations: "Will review does not mean will insure.",
    };
    const foreign = await createCommitment(
      request(
        "https://fortify.test/api/production/model-recognition/commitments/versions",
        author.token,
        jsonBody({
          ...commitmentInput,
          committingOrganizationId: betaOrganization.recognitionOrganizationId,
        }),
      ),
    );
    expect(foreign.status).toBe(409);
    const createdResponse = await createCommitment(
      request(
        "https://fortify.test/api/production/model-recognition/commitments/versions",
        author.token,
        jsonBody(commitmentInput),
      ),
    );
    expect(createdResponse.status).toBe(201);
    const created = (await createdResponse.json()) as {
      commitmentVersionId: string;
    };

    const selfReview = await reviewCommitment(
      request(
        `https://fortify.test/api/production/model-recognition/commitments/versions/${created.commitmentVersionId}/review`,
        author.token,
        jsonBody({
          decision: "approved",
          sourceAndScopeChecked: true,
          note: "Self review must fail.",
        }),
      ),
      routeParams({ versionId: created.commitmentVersionId }),
    );
    expect(selfReview.status).toBe(409);
    const reviewed = await reviewCommitment(
      request(
        `https://fortify.test/api/production/model-recognition/commitments/versions/${created.commitmentVersionId}/review`,
        reviewer.token,
        jsonBody({
          decision: "approved",
          sourceAndScopeChecked: true,
          note: "Exact source, scope, exclusions, and authority checked.",
        }),
      ),
      routeParams({ versionId: created.commitmentVersionId }),
    );
    expect(reviewed.status).toBe(201);
    const deniedPublication = await publishCommitment(
      request(
        `https://fortify.test/api/production/model-recognition/commitments/versions/${created.commitmentVersionId}/publish`,
        reviewer.token,
        jsonBody({
          decision: "published",
          humanConfirmed: true,
          note: "Reviewer cannot publish.",
        }),
      ),
      routeParams({ versionId: created.commitmentVersionId }),
    );
    expect(deniedPublication.status).toBe(409);
    const published = await publishCommitment(
      request(
        `https://fortify.test/api/production/model-recognition/commitments/versions/${created.commitmentVersionId}/publish`,
        publisher.token,
        jsonBody({
          decision: "published",
          humanConfirmed: true,
          note: "Publish exact review-only commitment.",
        }),
      ),
      routeParams({ versionId: created.commitmentVersionId }),
    );
    expect(published.status).toBe(201);
  });
});

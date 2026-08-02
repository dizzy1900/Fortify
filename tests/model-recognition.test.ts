import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { ModelRecognitionService, ModelRecognitionStateError } from "@/lib/production/model-recognition-service";
import { tenantRecord, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const at = "2026-12-12T17:00:00.000Z";
const actor = (context: TenantContext, actorSubject: string): TenantContext => ({ ...context, actorSubject });

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: path.resolve(process.cwd(), "drizzle-production") });
});
afterAll(async () => client.close());

async function seedM8Prerequisites(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const owned = tenantRecord(fixture.context, at);
  const sourceId = `m8-source-${key}`, sourceVersionId = `${sourceId}-v1`;
  await database.insert(schema.governedSources).values({ id: sourceId, ...owned, canonicalKey: sourceId, sourceClass: "external_model_documentation", issuingAuthority: "Fictional external authority", title: "Exact model and commitment source", jurisdiction: "Colorado", officialUrl: `https://example.test/${key}/source`, authorityTier: "customer_supplied", reviewOwnerSubject: "source-owner" });
  await database.insert(schema.governedSourceVersions).values({ id: sourceVersionId, ...owned, sourceId, versionNumber: 1, versionLabel: "2026.1", publicationDate: "2026-11-01", effectiveFrom: "2026-11-01", retrievalDate: "2026-12-01", sourceHash: key.padEnd(64, "8").slice(0, 64), snapshotState: "metadata_only_restricted", rightsStatus: "restricted", redistributionAllowed: false, useRestrictions: "Internal mapping and commitment review only.", structuredSummary: { boundary: "No redistribution or outcome inference." }, verifyCurrentStatus: "verified_current", nextReviewDate: "2027-02-01", extractionMethod: "human_authored", humanConfirmed: true, authorSubject: fixture.context.actorSubject, changeSummary: "Initial exact fixture source." });
  await database.insert(schema.governedSourceReviews).values({ id: `${sourceVersionId}-review`, ...owned, sourceVersionId, decision: "approved", reviewerSubject: "source-reviewer", note: "Exact source and restricted rights reviewed.", sourceCompared: true, rightsConfirmed: true, reviewedAt: at });
  await database.insert(schema.governedSourcePublications).values({ id: `${sourceVersionId}-publication`, ...owned, sourceVersionId, decision: "published", publisherSubject: "source-publisher", note: "Published as a bounded source reference.", publishedAt: at });

  const profileId = `m8-profile-${key}`, profileVersionId = `${profileId}-v1`, criterionId = `${profileId}-criterion`;
  await database.insert(schema.targetProfiles).values({ id: profileId, ...owned, canonicalKey: profileId, name: "Colorado evidence-readiness profile", description: "Synthetic test profile.", jurisdiction: "Colorado", peril: "wildfire", propertyClass: "community_association" });
  await database.insert(schema.targetProfileVersions).values({ id: profileVersionId, ...owned, profileId, versionNumber: 1, effectiveFrom: "2026-11-01", status: "published", authorSubject: fixture.context.actorSubject, changeSummary: "Initial fixture.", limitations: "No designation, risk score, or market commitment.", recognitionState: "unavailable_no_commitment_registry" });
  await database.insert(schema.targetProfileCriteria).values({ id: criterionId, ...owned, profileVersionId, code: "ROOF-01", title: "Documented roof covering", targetLevel: "minimum", evidenceLevel: "independent_verification", requirementText: "Document visible installed roof covering.", verificationMethod: "Independent site observation with exact photographs.", position: 1 });
  await database.insert(schema.targetProfileReviews).values({ id: `${profileVersionId}-review`, ...owned, profileVersionId, decision: "approved", reviewerSubject: "profile-reviewer", note: "Profile scope reviewed.", sourcePinsChecked: true, reviewedAt: at });
  await database.insert(schema.targetProfilePublications).values({ id: `${profileVersionId}-publication`, ...owned, profileVersionId, decision: "published", publisherSubject: "profile-publisher", note: "Published fixture profile.", publishedAt: at });

  const interventionId = `m8-intervention-${key}`, interventionVersionId = `${interventionId}-v1`, projectId = `m8-project-${key}`, projectInterventionId = `${projectId}-intervention`;
  await database.insert(schema.interventions).values({ id: interventionId, ...owned, canonicalKey: interventionId, name: "Roof evidence intervention", category: "physical_work", description: "Synthetic roof-covering intervention." });
  await database.insert(schema.interventionVersions).values({ id: interventionVersionId, ...owned, interventionId, versionNumber: 1, status: "published", technicalSpecification: "Install and document the version-pinned covering.", evidenceLevel: "independent_verification", typicalCostLowCents: 100_000, typicalCostHighCents: 200_000, typicalDurationDays: 10, dependencies: [], maintenanceRequirements: ["Annual evidence refresh"], benefitStatement: "May improve evidence readiness.", benefitBoundary: "No risk, insurance, or pricing result is asserted.", authorSubject: fixture.context.actorSubject, reviewerSubject: "intervention-reviewer", reviewedAt: at });
  await database.insert(schema.interventionVersionReviews).values({ id: `${interventionVersionId}-review`, ...owned, interventionVersionId, decision: "approved", reviewerSubject: "intervention-reviewer", note: "Specification and boundary reviewed.", reviewedAt: at });
  await database.insert(schema.resilienceProjects).values({ id: projectId, ...owned, propertyId: fixture.propertyId, name: "M8 mapping project", description: "Synthetic completed intervention.", status: "complete" });
  await database.insert(schema.projectInterventions).values({ id: projectInterventionId, ...owned, projectId, interventionVersionId, rationale: "Map only after independent evidence approval." });

  const evidenceItemId = `m8-evidence-${key}`, evidenceVersionId = `${evidenceItemId}-v1`;
  await database.insert(schema.evidenceItems).values({ id: evidenceItemId, ...owned, propertyId: fixture.propertyId, evidenceType: "installation_photo" });
  await database.insert(schema.evidenceVersions).values({ id: evidenceVersionId, ...owned, evidenceItemId, versionNumber: 1, filename: "roof.jpg", mimeType: "image/jpeg", sizeBytes: 4096, sha256: key.padEnd(64, "e").slice(0, 64), storageKey: `tenant/${key}/roof.jpg`, sourceType: "site_capture", sourceOrganization: "Fictional independent verifier", captureDate: "2026-12-01", receivedAt: at, scopeType: "property", scopeReference: fixture.propertyId, reviewStatus: "confirmed", reviewedBy: "evidence-reviewer", reviewedAt: at });

  const verificationOrganizationId = `m8-verification-org-${key}`, verifierId = `m8-verifier-${key}`, credentialId = `m8-credential-${key}`, assignmentId = `m8-assignment-${key}`, methodId = `m8-method-${key}`, findingId = `m8-finding-${key}`;
  await database.insert(schema.verificationOrganizations).values({ id: verificationOrganizationId, ...owned, legalName: `Fictional verifier ${key}`, organizationType: "engineering", status: "active", limitations: "Synthetic verifier record." });
  await database.insert(schema.verifiers).values({ id: verifierId, ...owned, verificationOrganizationId, displayName: "Fixture verifier", email: `verifier-${key}@example.test`, status: "active" });
  await database.insert(schema.verifierCredentials).values({ id: credentialId, ...owned, verifierId, versionNumber: 1, credentialType: "fictional property reviewer", issuer: "Fictional registry", credentialReference: `C-${key}`, jurisdiction: "Colorado", scope: ["site observation"], issuedOn: "2026-01-01", expiresOn: "2027-12-31", sourceVersion: "fixture-2026.1", verifyCurrentStatus: "verified_current", authorSubject: "credential-author" });
  await database.insert(schema.verifierCredentialReviews).values({ id: `${credentialId}-review`, ...owned, credentialId, decision: "approved", reviewerSubject: "credential-reviewer", sourceChecked: true, note: "Credential source and expiry checked.", reviewedAt: at });
  await database.insert(schema.verificationAssignments).values({ id: assignmentId, ...owned, projectId, profileVersionId, verifierId, credentialId, purpose: "Verify exact roof evidence.", scope: ["verification_finding:create"], tokenHash: key.padEnd(64, "t").slice(0, 64), assignedBy: "programme-admin", assignedAt: at, expiresAt: "2027-12-31T00:00:00.000Z" });
  await database.insert(schema.verificationConflictDeclarations).values({ id: `${assignmentId}-conflict`, ...owned, assignmentId, declaration: "No conflict declared.", conflictState: "no_conflict_declared", disclosedRelationships: [], signedBy: "fixture-verifier", signedAt: at });
  await database.insert(schema.verificationMethods).values({ id: methodId, ...owned, assignmentId, methodType: "site_visit", methodVersion: "site-v1", performedBy: "fixture-verifier", performedAt: at, measurementJson: { photoCount: 1 }, limitations: "Visible conditions only." });
  await database.insert(schema.verificationFindings).values({ id: findingId, ...owned, assignmentId, methodId, projectInterventionId, criterionId, conclusion: "conforming", evidenceLevel: "verified_installation", statement: "Visible roof covering conforms within the observation scope.", limitations: "No concealed-condition or future-loss conclusion.", verifierSubject: "fixture-verifier", concludedAt: at, signatureHash: key.padEnd(64, "f").slice(0, 64) });
  await database.insert(schema.verificationFindingEvidenceLinks).values({ id: `${findingId}-evidence`, ...owned, findingId, evidenceVersionId, relationship: "supports" });
  await database.insert(schema.verificationFindingReviews).values({ id: `${findingId}-review`, ...owned, findingId, decision: "approved", reviewerSubject: "finding-reviewer", evidenceAndMethodChecked: true, note: "Exact method and evidence reviewed.", reviewedAt: at });

  const service = new ModelRecognitionService(db(), () => new Date(at));
  const registered = await service.createModelVersion(fixture.context, {
    provider: { canonicalKey: `provider-${key}`, name: "Fictional model provider", providerType: "insurer_model", limitations: "No actual carrier affiliation or authority." },
    model: { canonicalKey: `model-${key}`, name: "Fictional evidence intake", peril: "wildfire evidence intake", description: "External input schema only." },
    versionLabel: "2026.4", geography: ["Colorado"], propertyClasses: ["community association"], effectiveFrom: "2026-11-01", sourceVersionId,
    methodologySummary: "Provider-authored evidence intake fields; Fortify does not run the model.", usageRights: "Internal evidence mapping only.", redistributionRestrictions: "Do not redistribute.", limitations: "No risk score, pricing, renewal, or acceptance inference.",
    inputs: [
      { inputKey: "roof_covering_class", label: "Roof covering classification", dataType: "enum", allowedValues: ["unclassified", "Class A documented"], definition: "Provider-defined visible covering category.", supportStatus: "supported", transformationBoundary: "Exact approved finding and evidence only.", requiredByModel: true },
      { inputKey: "response_minutes", label: "Fire response minutes", dataType: "number", unit: "minutes", definition: "Provider response-time field.", supportStatus: "unsupported", transformationBoundary: "No authoritative Fortify source or transformation." },
    ],
    outputs: [{ outputKey: "review_disposition", label: "Review disposition", dataType: "string", definition: "Externally supplied provider response.", limitations: "Not generated or endorsed by Fortify." }],
  });
  await service.reviewModelVersion(actor(fixture.context, "model-reviewer"), { modelVersionId: registered.modelVersionId, decision: "approved", sourceRightsAndDefinitionsChecked: true, note: "Exact source, rights, definitions, and limitations checked." });
  await service.publishModelVersion(actor(fixture.context, "model-publisher"), { modelVersionId: registered.modelVersionId, decision: "published", humanConfirmed: true, note: "Publish bounded external model reference." });
  const inputs = await database.select().from(schema.modelInputDefinitions).where(eq(schema.modelInputDefinitions.modelVersionId, registered.modelVersionId));
  const outputs = await database.select().from(schema.modelOutputDefinitions).where(eq(schema.modelOutputDefinitions.modelVersionId, registered.modelVersionId));
  return { fixture, service, sourceVersionId, profileVersionId, projectInterventionId, evidenceVersionId, findingId, modelVersionId: registered.modelVersionId, supportedInputId: inputs.find((item) => item.supportStatus === "supported")!.id, unsupportedInputId: inputs.find((item) => item.supportStatus === "unsupported")!.id, outputDefinitionId: outputs[0].id };
}

const proposal = (setup: Awaited<ReturnType<typeof seedM8Prerequisites>>, inputDefinitionId = setup.supportedInputId) => setup.service.proposeMapping(setup.fixture.context, { propertyId: setup.fixture.propertyId, projectInterventionId: setup.projectInterventionId, verificationFindingId: setup.findingId, modelVersionId: setup.modelVersionId, inputDefinitionId, preInterventionValue: { value: "unclassified" }, proposedPostInterventionValue: { value: "Class A documented" }, transformationMethod: "Approved finding to provider category", methodologyVersion: "recipe-1.2", confidence: "high", source: "approved finding and exact evidence", limitations: "Visible documented covering only.", expiresAt: "2027-12-31T00:00:00.000Z", evidenceVersionIds: [setup.evidenceVersionId] });

describe("external model mapping and market commitment governance", () => {
  test("requires source rights and three distinct humans before an external model can be used", async () => {
    const setup = await seedM8Prerequisites("m8-model");
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.modelVersions[0]).toMatchObject({ status: "active", sourceVersionId: setup.sourceVersionId });
    expect(workspace.doctrine).toMatchObject({ fortifyGeneratesRiskScores: false, externalAcceptanceRequiresHumanEvidence: true });
    await expect(setup.service.recordModelOutput(setup.fixture.context, { propertyId: setup.fixture.propertyId, modelVersionId: setup.modelVersionId, outputDefinitionId: setup.outputDefinitionId, evidenceVersionId: setup.evidenceVersionId, recordedValue: { disposition: "reviewed" }, asOfDate: "2026-12-12", sourceAuthority: "Fictional provider", sourceReference: "response-1", assumptions: [], limitations: "External fictional result.", humanConfirmed: false })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const output = await setup.service.recordModelOutput(setup.fixture.context, { propertyId: setup.fixture.propertyId, modelVersionId: setup.modelVersionId, outputDefinitionId: setup.outputDefinitionId, evidenceVersionId: setup.evidenceVersionId, recordedValue: { disposition: "reviewed" }, asOfDate: "2026-12-12", sourceAuthority: "Fictional provider", sourceReference: "response-1", assumptions: [], limitations: "External fictional result.", humanConfirmed: true });
    expect(output.outputRecordId).toBeTruthy();
  });

  test("preserves pre, proposed, and externally modified accepted values as separate records", async () => {
    const setup = await seedM8Prerequisites("m8-mapping");
    const mapping = await proposal(setup);
    await expect(setup.service.reviewMapping(setup.fixture.context, { mappingId: mapping.mappingId, decision: "approved_for_submission", modelDocumentationChecked: true, verificationChecked: true, note: "Self-review must fail." })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.reviewMapping(actor(setup.fixture.context, "mapping-reviewer"), { mappingId: mapping.mappingId, decision: "approved_for_submission", modelDocumentationChecked: true, verificationChecked: true, note: "Exact definitions, evidence, and recipe reviewed." });
    const submitted = await setup.service.recordMappingEvent(actor(setup.fixture.context, "submission-recorder"), { mappingId: mapping.mappingId, eventType: "submitted", reason: "Exact proposal submitted for fictional review.", sourceAuthority: "Fortify case operator", sourceReference: "submission-1", humanConfirmed: true });
    await expect(setup.service.recordMappingEvent(actor(setup.fixture.context, "response-recorder"), { mappingId: mapping.mappingId, eventType: "accepted_with_modification", acceptedValue: { value: "Class A — qualified" }, reason: "Must require human confirmation.", sourceAuthority: "Fictional provider", sourceReference: "response-2", humanConfirmed: false, supersedesEventId: submitted.eventId })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.recordMappingEvent(actor(setup.fixture.context, "response-recorder"), { mappingId: mapping.mappingId, eventType: "accepted_with_modification", acceptedValue: { value: "Class A — qualified" }, reason: "Provider narrowed the accepted property-level qualifier.", sourceAuthority: "Fictional provider", sourceReference: "response-2", humanConfirmed: true, supersedesEventId: submitted.eventId });
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.mappings[0]).toMatchObject({ preInterventionValue: { value: "unclassified" }, proposedPostInterventionValue: { value: "Class A documented" }, acceptedValue: { value: "Class A — qualified" }, currentState: "accepted_with_modification" });
    await expect(database.update(schema.modelInputMappings).set({ proposedPostInterventionValue: { value: "tampered" } }).where(eq(schema.modelInputMappings.id, mapping.mappingId))).rejects.toThrow();
  });

  test("keeps unsupported mappings explicit and blocks submission approval", async () => {
    const setup = await seedM8Prerequisites("m8-unsupported");
    const mapping = await proposal(setup, setup.unsupportedInputId);
    await expect(setup.service.reviewMapping(actor(setup.fixture.context, "mapping-reviewer"), { mappingId: mapping.mappingId, decision: "approved_for_submission", modelDocumentationChecked: true, verificationChecked: true, note: "Unsupported input must fail closed." })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    await setup.service.reviewMapping(actor(setup.fixture.context, "mapping-reviewer"), { mappingId: mapping.mappingId, decision: "unsupported", modelDocumentationChecked: true, verificationChecked: true, note: "No authoritative source or transformation exists." });
    const event = await setup.service.recordMappingEvent(actor(setup.fixture.context, "mapping-governor"), { mappingId: mapping.mappingId, eventType: "unsupported", reason: "Unsupported definition retained explicitly.", sourceAuthority: "Fortify governed register", sourceReference: "input-definition", humanConfirmed: true });
    expect(event.state).toBe("unsupported");
  });

  test("publishes a review-only commitment without converting it into insurance authority", async () => {
    const setup = await seedM8Prerequisites("m8-commitment");
    const organization = await setup.service.registerRecognitionOrganization(setup.fixture.context, { canonicalKey: "fictional-mutual", legalName: "Fictional High Plains Mutual", organizationType: "insurer", limitations: "No actual affiliation, appetite, capacity, pricing, or acceptance." });
    await expect(setup.service.createCommitmentVersion(setup.fixture.context, { committingOrganizationId: organization.recognitionOrganizationId, canonicalKey: "review-sla-invalid", name: "Invalid review SLA", commitmentType: "response_service_level", profileVersionId: setup.profileVersionId, modelVersionId: setup.modelVersionId, geography: ["Colorado"], propertyClasses: ["community association"], evidenceRequired: ["Approved finding"], exclusions: ["No insurance promise"], responseOrFinancialAction: "Review the evidence package.", authorityScope: "underwriting_action", effectiveFrom: "2026-12-01", sourceVersionId: setup.sourceVersionId, limitations: "Must fail." })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const commitment = await setup.service.createCommitmentVersion(setup.fixture.context, { committingOrganizationId: organization.recognitionOrganizationId, canonicalKey: "review-sla", name: "Evidence review service level", commitmentType: "response_service_level", profileVersionId: setup.profileVersionId, modelVersionId: setup.modelVersionId, geography: ["Colorado"], propertyClasses: ["community association"], evidenceRequired: ["Approved independent finding", "Exact model-input mapping"], exclusions: ["No quote, bind, renewal, price, capacity, or acceptance promise"], responseOrFinancialAction: "Review a complete fictional evidence package within 15 business days.", authorityScope: "review_only", effectiveFrom: "2026-12-01", effectiveTo: "2027-12-01", sourceVersionId: setup.sourceVersionId, limitations: "Will review does not mean will insure." });
    await setup.service.reviewCommitmentVersion(actor(setup.fixture.context, "commitment-reviewer"), { commitmentVersionId: commitment.commitmentVersionId, decision: "approved", sourceAndScopeChecked: true, note: "Source, scope, exclusions, and review-only authority checked." });
    await expect(setup.service.publishCommitmentVersion(actor(setup.fixture.context, "commitment-reviewer"), { commitmentVersionId: commitment.commitmentVersionId, decision: "published", humanConfirmed: true, note: "Same reviewer must fail." })).rejects.toBeInstanceOf(ModelRecognitionStateError);
    const published = await setup.service.publishCommitmentVersion(actor(setup.fixture.context, "commitment-publisher"), { commitmentVersionId: commitment.commitmentVersionId, decision: "published", humanConfirmed: true, note: "Publish exact review-only commitment." });
    expect(published.status).toBe("published");
    const workspace = await setup.service.getWorkspace(setup.fixture.context);
    expect(workspace.commitmentVersions[0]).toMatchObject({ authorityScope: "review_only", status: "published", exclusions: ["No quote, bind, renewal, price, capacity, or acceptance promise"] });
    expect(workspace.doctrine.reviewCommitmentEqualsInsurance).toBe(false);
  });

  test("rejects cross-tenant model-input references at the database boundary", async () => {
    const alpha = await seedM8Prerequisites("m8-alpha"), beta = await seedM8Prerequisites("m8-beta");
    await expect(database.insert(schema.modelInputMappings).values({ id: "cross-tenant-mapping", ...tenantRecord(beta.fixture.context, at), propertyId: beta.fixture.propertyId, projectInterventionId: beta.projectInterventionId, verificationFindingId: beta.findingId, modelVersionId: alpha.modelVersionId, inputDefinitionId: alpha.supportedInputId, preInterventionValue: { value: "old" }, proposedPostInterventionValue: { value: "new" }, transformationMethod: "Must fail", methodologyVersion: "invalid", confidence: "not_assessed", source: "cross tenant", limitations: "Must not persist.", authorSubject: beta.fixture.context.actorSubject, proposedAt: at })).rejects.toThrow();
  });
});

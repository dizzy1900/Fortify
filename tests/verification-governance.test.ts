import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { assertAuthorized, AuthorizationDeniedError } from "@/lib/production/authorization";
import { tenantRecord, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";
import { VerificationService, VerificationStateError } from "@/lib/production/verification-service";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const at = "2026-08-01T12:00:00.000Z";
const actor = (context: TenantContext, actorSubject: string): TenantContext => ({ ...context, actorSubject });

beforeAll(async () => {
  client = new PGlite(); database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: path.resolve(process.cwd(), "drizzle-production") });
});
afterAll(async () => client.close());

async function verificationFixture(key: string, expiresOn = "2027-08-01") {
  const fixture = await createTenantFixture(db(), key);
  const owned = tenantRecord(fixture.context, at);
  const projectId = `verification-project-${key}`;
  const profileId = `verification-profile-${key}`, profileVersionId = `${profileId}-v1`, criterionId = `${profileId}-criterion`;
  const interventionId = `verification-intervention-${key}`, interventionVersionId = `${interventionId}-v1`, projectInterventionId = `${projectId}-intervention`;
  const evidenceItemId = `verification-evidence-${key}`, evidenceVersionId = `${evidenceItemId}-v1`;
  const externalPrincipalId = `verification-principal-${key}`;
  await database.insert(schema.targetProfiles).values({ id: profileId, ...owned, canonicalKey: profileId, name: "Fixture evidence-readiness profile", description: "Synthetic test profile.", jurisdiction: "California", peril: "wildfire", propertyClass: "condominium" });
  await database.insert(schema.targetProfileVersions).values({ id: profileVersionId, ...owned, profileId, versionNumber: 1, effectiveFrom: "2026-08-01", status: "published", authorSubject: fixture.context.actorSubject, changeSummary: "Fixture", limitations: "Not a designation or insurer commitment.", recognitionState: "unavailable_no_commitment_registry" });
  await database.insert(schema.targetProfileCriteria).values({ id: criterionId, ...owned, profileVersionId, code: "INSTALL-01", title: "Installed condition", targetLevel: "minimum", evidenceLevel: "independent_verification", requirementText: "Confirm the documented installation condition.", verificationMethod: "Site visit plus photo review.", position: 1 });
  await database.insert(schema.targetProfileReviews).values({ id: `${profileVersionId}-review`, ...owned, profileVersionId, decision: "approved", reviewerSubject: "profile-reviewer", note: "Fixture criteria and source pins reviewed.", sourcePinsChecked: true, reviewedAt: at });
  await database.insert(schema.targetProfilePublications).values({ id: `${profileVersionId}-publication`, ...owned, profileVersionId, decision: "published", publisherSubject: "profile-publisher", note: "Fixture publication.", publishedAt: at });
  await database.insert(schema.interventions).values({ id: interventionId, ...owned, canonicalKey: interventionId, name: "Fixture intervention", category: "physical_work", description: "Synthetic intervention." });
  await database.insert(schema.interventionVersions).values({ id: interventionVersionId, ...owned, interventionId, versionNumber: 1, status: "published", technicalSpecification: "Document exact installation condition.", evidenceLevel: "independent_verification", typicalCostLowCents: 100_000, typicalCostHighCents: 200_000, typicalDurationDays: 14, dependencies: [], maintenanceRequirements: ["Annual evidence refresh"], benefitStatement: "May improve evidence readiness.", benefitBoundary: "No risk reduction, insurance, or pricing outcome is asserted.", authorSubject: fixture.context.actorSubject, reviewerSubject: "intervention-reviewer", reviewedAt: at });
  await database.insert(schema.interventionVersionReviews).values({ id: `${interventionVersionId}-review`, ...owned, interventionVersionId, decision: "approved", reviewerSubject: "intervention-reviewer", note: "Exact specification and evidence boundary reviewed.", reviewedAt: at });
  await database.insert(schema.resilienceProjects).values({ id: projectId, ...owned, propertyId: fixture.propertyId, name: "Fixture verification project", description: "Synthetic project for M7 controls.", status: "complete" });
  await database.insert(schema.projectInterventions).values({ id: projectInterventionId, ...owned, projectId, interventionVersionId, rationale: "Exact installed intervention under review." });
  await database.insert(schema.evidenceItems).values({ id: evidenceItemId, ...owned, propertyId: fixture.propertyId, evidenceType: "installation_photo" });
  await database.insert(schema.evidenceVersions).values({ id: evidenceVersionId, ...owned, evidenceItemId, versionNumber: 1, filename: "fixture-installation.jpg", mimeType: "image/jpeg", sizeBytes: 2048, sha256: key.padEnd(64, "a").slice(0, 64), storageKey: `tenant/${key}/fixture.jpg`, sourceType: "site_capture", sourceOrganization: "Fixture contractor", captureDate: "2026-07-31", receivedAt: at, scopeType: "property", scopeReference: fixture.propertyId, reviewStatus: "confirmed", reviewedBy: "evidence-reviewer", reviewedAt: at });
  await database.insert(schema.externalPrincipals).values({ id: externalPrincipalId, ...owned, principalType: "external_reviewer", email: `verifier-${key}@example.test`, displayName: `Verifier ${key}`, status: "active", expiresAt: "2027-12-31T23:59:59.000Z" });
  const service = new VerificationService(db(), () => new Date(at));
  const registered = await service.registerVerifier(fixture.context, { organizationName: `Fixture Verification ${key}`, organizationType: "engineering", limitations: "Synthetic credential fixture only; Fortify is not the substantive verifier.", verifierName: `Verifier ${key}`, verifierEmail: `verifier-${key}@example.test`, externalPrincipalId, credentialType: "fictional inspection credential", issuer: "Fictional credential issuer", credentialReference: `FC-${key}`, jurisdiction: "California", scope: ["document review", "site observation"], issuedOn: "2026-01-01", expiresOn, sourceVersion: "fixture-registry-2026.1", sourceUrl: "https://example.test/credentials" });
  return { fixture, service, projectId, profileVersionId, criterionId, interventionVersionId, projectInterventionId, evidenceVersionId, externalPrincipalId, ...registered };
}

const assignmentScopes = ["resilience_project:read", "project_intervention:read", "target_profile_version:read", "target_profile_criterion:read", "evidence_item:read", "evidence_version:read", "verification_assignment:read", "verification_conflict_declaration:read", "verification_conflict_declaration:create", "verification_method:read", "verification_method:create", "verification_finding:read", "verification_finding:create", "verification_finding_evidence_link:read", "verification_finding_evidence_link:create", "verification_exception:read", "verification_exception:create", "verification_corrective_action:read", "verification_corrective_action:create", "verification_certificate:read", "verification_certificate_event:read", "maintenance_obligation:read", "maintenance_obligation_event:read", "maintenance_obligation_event:create", "property_condition_event:read", "property_condition_event:create"];

async function assigned(setup: Awaited<ReturnType<typeof verificationFixture>>) {
  await expect(setup.service.reviewCredential(setup.fixture.context, { credentialId: setup.credentialId, decision: "approved", sourceChecked: true, note: "Self-review fails." })).rejects.toBeInstanceOf(VerificationStateError);
  await setup.service.reviewCredential(actor(setup.fixture.context, "credential-reviewer"), { credentialId: setup.credentialId, decision: "approved", sourceChecked: true, note: "Exact credential registry version and expiry reviewed." });
  const assignment = await setup.service.createAssignment(setup.fixture.context, { projectId: setup.projectId, profileVersionId: setup.profileVersionId, verifierId: setup.verifierId, credentialId: setup.credentialId, purpose: "Verify exact installed intervention evidence.", scope: assignmentScopes, dueOn: "2026-09-01", expiresAt: "2027-01-01T00:00:00.000Z" });
  const verifier = await setup.service.resolveExternalVerificationToken(assignment.token);
  return { ...assignment, verifier };
}

describe("independent verification governance", () => {
  test("blocks expired credentials, conflicted work, unreviewed findings, and cross-project access", async () => {
    const expired = await verificationFixture("m7-expired", "2026-07-31");
    const review = await expired.service.reviewCredential(actor(expired.fixture.context, "credential-reviewer"), { credentialId: expired.credentialId, decision: "approved", sourceChecked: true, note: "Expired source state remains explicit." });
    expect(review.verifyCurrentStatus).toBe("expired");
    await expect(expired.service.createAssignment(expired.fixture.context, { projectId: expired.projectId, profileVersionId: expired.profileVersionId, verifierId: expired.verifierId, credentialId: expired.credentialId, purpose: "Must fail", scope: assignmentScopes, expiresAt: "2027-01-01T00:00:00.000Z" })).rejects.toBeInstanceOf(VerificationStateError);

    const setup = await verificationFixture("m7-boundaries"); const access = await assigned(setup);
    await setup.service.declareConflict(access.verifier, { assignmentId: access.assignmentId, conflictState: "conflict_disclosed", declaration: "A prior advisory relationship is disclosed.", disclosedRelationships: ["Prior fixture advisory engagement"] });
    await expect(setup.service.recordMethod(access.verifier, { assignmentId: access.assignmentId, methodType: "site_visit", methodVersion: "site-v1", performedAt: at, limitations: "Visual observation only." })).rejects.toBeInstanceOf(VerificationStateError);
    expect(() => assertAuthorized(access.verifier, { action: "read", resource: "verification_assignment", resourceOrganizationId: setup.fixture.organizationId, projectId: "another-project" })).toThrow(AuthorizationDeniedError);
    expect(() => assertAuthorized(access.verifier, { action: "read", resource: "capital_stack", resourceOrganizationId: setup.fixture.organizationId, projectId: setup.projectId })).toThrow(AuthorizationDeniedError);
  });

  test("traces signed findings through method, evidence, review, certificate, revocation, and maintenance history", async () => {
    const setup = await verificationFixture("m7-happy"); const access = await assigned(setup);
    await setup.service.declareConflict(access.verifier, { assignmentId: access.assignmentId, conflictState: "no_conflict_declared", declaration: "No financial, ownership, employment, or advisory conflict is known for this assignment.", disclosedRelationships: [] });
    const method = await setup.service.recordMethod(access.verifier, { assignmentId: access.assignmentId, methodType: "site_visit", methodVersion: "site-observation-v1", performedAt: at, latitude: "38.581572", longitude: "-121.494400", measurementJson: { photoCount: 12, timestampSource: "camera-metadata" }, limitations: "Visible conditions only; concealed assemblies not observed." });
    const finding = await setup.service.recordFinding(access.verifier, { assignmentId: access.assignmentId, methodId: method.methodId, projectInterventionId: setup.projectInterventionId, criterionId: setup.criterionId, conclusion: "conforming", evidenceLevel: "verified_installation", statement: "The visible fixture installation conforms to the version-pinned criterion within the stated observation scope.", limitations: "No concealed-condition or future-performance conclusion.", evidence: [{ evidenceVersionId: setup.evidenceVersionId, relationship: "supports" }] });
    await expect(setup.service.reviewFinding(access.verifier, { findingId: finding.findingId, decision: "approved", evidenceAndMethodChecked: true, note: "Self-review fails." })).rejects.toBeInstanceOf(AuthorizationDeniedError);
    await setup.service.reviewFinding(actor(setup.fixture.context, "finding-reviewer"), { findingId: finding.findingId, decision: "approved", evidenceAndMethodChecked: true, note: "Exact method, evidence version, criterion, intervention, and signature hash reviewed." });
    await expect(setup.service.issueCertificate(actor(setup.fixture.context, "finding-reviewer"), { assignmentId: access.assignmentId, certificateNumber: "M7-HAPPY-001", expiresAt: "2027-08-01T00:00:00.000Z", humanConfirmed: true, limitations: "Evidence-readiness record only." })).rejects.toBeInstanceOf(VerificationStateError);
    const certificate = await setup.service.issueCertificate(actor(setup.fixture.context, "certificate-issuer"), { assignmentId: access.assignmentId, certificateNumber: "M7-HAPPY-001", expiresAt: "2027-08-01T00:00:00.000Z", humanConfirmed: true, limitations: "Issued by the fictional verifier organization; Fortify only records provenance and does not certify risk reduction, compliance, insurance treatment, or programme acceptance." });
    const obligation = await setup.service.createMaintenanceObligation(actor(setup.fixture.context, "maintenance-owner"), { certificateId: certificate.certificateId, interventionVersionId: setup.interventionVersionId, title: "Annual installation evidence refresh", requirement: "Re-observe the version-pinned installed condition.", recurrenceRule: "FREQ=YEARLY", evidenceRequirement: "Current dated photographs and human observation.", nextDueAt: "2027-07-15T00:00:00.000Z" });
    await expect(setup.service.recordMaintenanceEvent(access.verifier, { obligationId: obligation.obligationId, eventType: "satisfied", note: "Missing evidence must fail." })).rejects.toBeInstanceOf(VerificationStateError);
    await setup.service.recordMaintenanceEvent(access.verifier, { obligationId: obligation.obligationId, eventType: "evidence_refreshed", evidenceVersionId: setup.evidenceVersionId, note: "Exact fixture evidence version refreshed." });
    await setup.service.recordMaintenanceEvent(actor(setup.fixture.context, "maintenance-owner"), { obligationId: obligation.obligationId, eventType: "expired", note: "Fixture maintenance window expired; prior refresh evidence remains preserved." });
    const condition = await setup.service.recordPropertyConditionEvent(access.verifier, { propertyId: setup.fixture.propertyId, projectId: setup.projectId, certificateId: certificate.certificateId, eventType: "scheduled_refresh_observation", conditionState: "observed_conforming", evidenceVersionId: setup.evidenceVersionId, observedAt: "2026-12-10T18:00:00.000Z", note: "Visible fixture condition observed within the bounded method scope." });
    const issued = await database.select().from(schema.verificationCertificateEvents).where(eq(schema.verificationCertificateEvents.certificateId, certificate.certificateId));
    const revoked = await setup.service.recordCertificateEvent(actor(setup.fixture.context, "certificate-governor"), { certificateId: certificate.certificateId, eventType: "revoked", rationale: "Synthetic revocation preserves the issued history.", supersedesEventId: issued[0].id });
    const workspace = await setup.service.getAssignmentWorkspace(access.verifier, access.assignmentId);
    expect(workspace).toMatchObject({ doctrine: { fortifyIsSubstantiveVerifier: false, missingEvidencePasses: false } });
    expect(workspace.findings[0]).toMatchObject({ evidenceLevel: "verified_installation", signatureHash: finding.signatureHash });
    expect(workspace.certificateEvents.map((event) => event.eventType)).toEqual(["issued", "revoked"]);
    expect(workspace.maintenanceEvents.map((event) => event.eventType)).toEqual(["scheduled", "evidence_refreshed", "expired"]);
    expect(condition.state).toBe("observed_conforming");
    expect(revoked.state).toBe("revoked");
    await expect(database.update(schema.verificationFindings).set({ statement: "tampered" }).where(eq(schema.verificationFindings.id, finding.findingId))).rejects.toThrow();
  });

  test("preserves failed verification, corrective action, and reinspection lineage", async () => {
    const setup = await verificationFixture("m7-corrective"); const access = await assigned(setup);
    await setup.service.declareConflict(access.verifier, { assignmentId: access.assignmentId, conflictState: "no_conflict_declared", declaration: "No conflict declared.", disclosedRelationships: [] });
    const method = await setup.service.recordMethod(access.verifier, { assignmentId: access.assignmentId, methodType: "photographic_review", methodVersion: "photo-v1", performedAt: at, limitations: "Photographic review only." });
    const finding = await setup.service.recordFinding(access.verifier, { assignmentId: access.assignmentId, methodId: method.methodId, projectInterventionId: setup.projectInterventionId, criterionId: setup.criterionId, conclusion: "nonconforming", evidenceLevel: "physical_specification", statement: "The submitted fixture evidence does not show the required installed condition.", limitations: "No concealed condition observed.", evidence: [{ evidenceVersionId: setup.evidenceVersionId, relationship: "contradicts" }] });
    await setup.service.reviewFinding(actor(setup.fixture.context, "finding-reviewer"), { findingId: finding.findingId, decision: "approved", evidenceAndMethodChecked: true, note: "Nonconforming conclusion and exact evidence reviewed." });
    const exception = await setup.service.openException(access.verifier, { assignmentId: access.assignmentId, findingId: finding.findingId, exceptionType: "installation_variance", description: "Fixture installation evidence does not meet the criterion.", severity: "high" });
    const required = await setup.service.recordCorrectiveAction(access.verifier, { exceptionId: exception.exceptionId, actionType: "replace_and_resubmit", description: "Replace the affected fixture and submit current evidence.", state: "required", responsibleSubject: "fixture-contractor", dueOn: "2026-09-15" });
    const accepted = await setup.service.recordCorrectiveAction(actor(setup.fixture.context, "corrective-reviewer"), { exceptionId: exception.exceptionId, actionType: "replace_and_resubmit", description: "Corrected fixture evidence accepted for reinspection.", state: "accepted", responsibleSubject: "fixture-contractor", evidenceVersionId: setup.evidenceVersionId, supersedesActionId: required.correctiveActionId });
    const reinspection = await setup.service.createAssignment(setup.fixture.context, { projectId: setup.projectId, profileVersionId: setup.profileVersionId, verifierId: setup.verifierId, credentialId: setup.credentialId, purpose: "Reinspect accepted corrective work.", scope: assignmentScopes, expiresAt: "2027-01-01T00:00:00.000Z", reinspectionOfAssignmentId: access.assignmentId });
    expect(accepted.state).toBe("accepted"); expect(reinspection.token).toMatch(/^fverify_/);
    await expect(setup.service.issueCertificate(actor(setup.fixture.context, "certificate-issuer"), { assignmentId: access.assignmentId, certificateNumber: "M7-FAILED-001", expiresAt: "2027-08-01T00:00:00.000Z", humanConfirmed: true, limitations: "Must remain blocked." })).rejects.toBeInstanceOf(VerificationStateError);
  });

  test("rejects cross-tenant verification references at the database boundary", async () => {
    const alpha = await verificationFixture("m7-alpha"), beta = await verificationFixture("m7-beta");
    await alpha.service.reviewCredential(actor(alpha.fixture.context, "credential-reviewer-alpha"), { credentialId: alpha.credentialId, decision: "approved", sourceChecked: true, note: "Approved alpha credential." });
    await expect(database.insert(schema.verificationAssignments).values({ id: "cross-tenant-verification-assignment", ...tenantRecord(beta.fixture.context, at), projectId: beta.projectId, profileVersionId: beta.profileVersionId, verifierId: alpha.verifierId, credentialId: alpha.credentialId, purpose: "Must fail", scope: assignmentScopes, tokenHash: "c".repeat(64), assignedBy: beta.fixture.context.actorSubject, assignedAt: at, expiresAt: "2027-01-01T00:00:00.000Z" })).rejects.toThrow();
  });
});

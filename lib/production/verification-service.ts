import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import { appendAudit, tenantRecord, TenantResourceNotFoundError, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";

export type VerificationEvidenceLevel =
  | "physical_specification" | "verified_installation" | "modelled_vulnerability_reduction"
  | "modelled_expected_loss_reduction" | "filed_rating_treatment" | "underwriting_treatment"
  | "financing_or_programme_treatment" | "observed_event_performance" | "claims_evidence";

export class VerificationValidationError extends Error {
  constructor(message: string) { super(message); this.name = "VerificationValidationError"; }
}
export class VerificationStateError extends Error {
  constructor(message: string) { super(message); this.name = "VerificationStateError"; }
}

const required = (value: string | undefined, label: string) => {
  if (!value?.trim()) throw new VerificationValidationError(`${label} is required.`);
  return value.trim();
};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const human = (context: TenantContext, action: string) => {
  if (context.principalType !== "membership") throw new VerificationStateError(`A human organization member must ${action}.`);
};
const verifierScopes = new Set([
  "resilience_project:read", "project_intervention:read", "target_profile_version:read", "target_profile_criterion:read",
  "evidence_item:read", "evidence_version:read", "verification_assignment:read", "verification_conflict_declaration:read",
  "verification_conflict_declaration:create", "verification_method:read", "verification_method:create", "verification_finding:read",
  "verification_finding:create", "verification_finding_evidence_link:read", "verification_finding_evidence_link:create",
  "verification_exception:read", "verification_exception:create", "verification_corrective_action:read", "verification_corrective_action:create",
  "verification_certificate:read", "verification_certificate_event:read", "maintenance_obligation:read", "maintenance_obligation_event:read",
  "maintenance_obligation_event:create", "property_condition_event:read", "property_condition_event:create",
]);

export class VerificationService {
  constructor(private readonly database: ProductionDatabaseLike, private readonly clock: () => Date = () => new Date()) {}

  async registerVerifier(context: TenantContext, input: {
    organizationName: string; organizationType: "engineering" | "inspection" | "consultancy" | "other"; website?: string;
    limitations: string; verifierName: string; verifierEmail: string; externalPrincipalId?: string;
    credentialType: string; issuer: string; credentialReference: string; jurisdiction: string; scope: string[];
    issuedOn: string; expiresOn: string; sourceVersion: string; sourceUrl?: string;
  }) {
    assertAuthorized(context, { action: "create", resource: "verifier", resourceOrganizationId: context.organizationId });
    human(context, "register a verifier and credential");
    if (!input.scope.length) throw new VerificationValidationError("Credential scope must be explicit.");
    if (input.expiresOn < input.issuedOn) throw new VerificationValidationError("Credential expiry cannot precede issuance.");
    const at = this.clock().toISOString();
    const verificationOrganizationId = randomUUID(), verifierId = randomUUID(), credentialId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      if (input.externalPrincipalId) {
        const principal = await db.select().from(schema.externalPrincipals).where(and(eq(schema.externalPrincipals.organizationId, context.organizationId), eq(schema.externalPrincipals.id, input.externalPrincipalId))).limit(1);
        if (!principal[0]) throw new TenantResourceNotFoundError("External verifier principal");
      }
      await db.insert(schema.verificationOrganizations).values({ id: verificationOrganizationId, ...tenantRecord(context, at), legalName: required(input.organizationName, "Verification organization"), organizationType: input.organizationType, website: input.website, limitations: required(input.limitations, "Verification organization limitations") });
      await db.insert(schema.verifiers).values({ id: verifierId, ...tenantRecord(context, at), verificationOrganizationId, externalPrincipalId: input.externalPrincipalId, displayName: required(input.verifierName, "Verifier name"), email: required(input.verifierEmail, "Verifier email") });
      await db.insert(schema.verifierCredentials).values({ id: credentialId, ...tenantRecord(context, at), verifierId, versionNumber: 1, credentialType: required(input.credentialType, "Credential type"), issuer: required(input.issuer, "Credential issuer"), credentialReference: required(input.credentialReference, "Credential reference"), jurisdiction: required(input.jurisdiction, "Credential jurisdiction"), scope: input.scope, issuedOn: input.issuedOn, expiresOn: input.expiresOn, sourceVersion: required(input.sourceVersion, "Credential source version"), sourceUrl: input.sourceUrl, verifyCurrentStatus: "unreviewed", authorSubject: context.actorSubject });
      await appendAudit(db, context, { action: "verifier.registered", resourceType: "verifier", resourceId: verifierId, detail: { verificationOrganizationId, credentialId, sourceVersion: input.sourceVersion, substantiveVerifier: false }, occurredAt: at });
    });
    return { verificationOrganizationId, verifierId, credentialId };
  }

  async reviewCredential(context: TenantContext, input: { credentialId: string; decision: "approved" | "rejected" | "changes_requested"; sourceChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "verifier_credential_review", resourceOrganizationId: context.organizationId });
    human(context, "review a verifier credential");
    const credential = await this.database.select().from(schema.verifierCredentials).where(and(eq(schema.verifierCredentials.organizationId, context.organizationId), eq(schema.verifierCredentials.id, input.credentialId))).limit(1);
    if (!credential[0]) throw new TenantResourceNotFoundError("Verifier credential");
    if (credential[0].authorSubject === context.actorSubject) throw new VerificationStateError("Credential author and reviewer must be different humans.");
    if (input.decision === "approved" && !input.sourceChecked) throw new VerificationStateError("Approval requires the exact credential source and version to be checked.");
    const at = this.clock().toISOString(), id = randomUUID();
    const current = credential[0].expiresOn < at.slice(0, 10) ? "expired" : input.decision === "approved" ? "verified_current" : "unable_to_verify";
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.verifierCredentialReviews).values({ id, ...tenantRecord(context, at), credentialId: input.credentialId, decision: input.decision, reviewerSubject: context.actorSubject, sourceChecked: input.sourceChecked, note: required(input.note, "Credential review note"), reviewedAt: at });
      await db.update(schema.verifierCredentials).set({ verifyCurrentStatus: current, updatedAt: at, updatedBy: context.actorSubject, revision: credential[0].revision + 1 }).where(eq(schema.verifierCredentials.id, input.credentialId));
      await appendAudit(db, context, { action: `verifier_credential.${input.decision}`, resourceType: "verifier_credential", resourceId: input.credentialId, detail: { sourceChecked: input.sourceChecked, verifyCurrentStatus: current }, occurredAt: at });
    });
    return { reviewId: id, verifyCurrentStatus: current };
  }

  async createAssignment(context: TenantContext, input: { projectId: string; profileVersionId: string; verifierId: string; credentialId: string; purpose: string; scope: string[]; dueOn?: string; expiresAt: string; reinspectionOfAssignmentId?: string }) {
    assertAuthorized(context, { action: "create", resource: "verification_assignment", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    human(context, "assign an independent verifier");
    if (!input.scope.length || input.scope.some((scope) => !verifierScopes.has(scope))) throw new VerificationValidationError("Verifier assignment contains an absent or out-of-scope permission.");
    if (new Date(input.expiresAt).getTime() <= this.clock().getTime()) throw new VerificationValidationError("Verifier access must expire in the future.");
    const [project, profile, verifier, credential, review, interventions] = await Promise.all([
      this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId))).limit(1),
      this.database.select().from(schema.targetProfilePublications).where(and(eq(schema.targetProfilePublications.organizationId, context.organizationId), eq(schema.targetProfilePublications.profileVersionId, input.profileVersionId), eq(schema.targetProfilePublications.decision, "published"))).limit(1),
      this.database.select().from(schema.verifiers).where(and(eq(schema.verifiers.organizationId, context.organizationId), eq(schema.verifiers.id, input.verifierId), eq(schema.verifiers.status, "active"))).limit(1),
      this.database.select().from(schema.verifierCredentials).where(and(eq(schema.verifierCredentials.organizationId, context.organizationId), eq(schema.verifierCredentials.id, input.credentialId), eq(schema.verifierCredentials.verifierId, input.verifierId))).limit(1),
      this.database.select().from(schema.verifierCredentialReviews).where(and(eq(schema.verifierCredentialReviews.organizationId, context.organizationId), eq(schema.verifierCredentialReviews.credentialId, input.credentialId), eq(schema.verifierCredentialReviews.decision, "approved"))).limit(1),
      this.database.select().from(schema.projectInterventions).where(and(eq(schema.projectInterventions.organizationId, context.organizationId), eq(schema.projectInterventions.projectId, input.projectId))),
    ]);
    if (!project[0] || !profile[0] || !verifier[0] || !credential[0] || !review[0]) throw new VerificationStateError("Assignment requires an in-tenant project, published profile, active verifier, and independently approved credential.");
    if (!interventions.length) throw new VerificationStateError("Assignment requires at least one version-pinned project intervention.");
    if (credential[0].verifyCurrentStatus !== "verified_current" || credential[0].expiresOn < this.clock().toISOString().slice(0, 10)) throw new VerificationStateError("The verifier credential is not current.");
    if (input.reinspectionOfAssignmentId) {
      const prior = await this.database.select().from(schema.verificationAssignments).where(and(eq(schema.verificationAssignments.organizationId, context.organizationId), eq(schema.verificationAssignments.id, input.reinspectionOfAssignmentId), eq(schema.verificationAssignments.projectId, input.projectId))).limit(1);
      if (!prior[0]) throw new VerificationStateError("Reinspection must reference an assignment for the same project.");
    }
    const at = this.clock().toISOString(), id = randomUUID(), token = `fverify_${randomBytes(32).toString("base64url")}`;
    await this.database.insert(schema.verificationAssignments).values({ id, ...tenantRecord(context, at), projectId: input.projectId, profileVersionId: input.profileVersionId, verifierId: input.verifierId, credentialId: input.credentialId, purpose: required(input.purpose, "Assignment purpose"), scope: input.scope, tokenHash: digest(token), assignedBy: context.actorSubject, assignedAt: at, dueOn: input.dueOn, expiresAt: input.expiresAt, reinspectionOfAssignmentId: input.reinspectionOfAssignmentId });
    await appendAudit(this.database, context, { action: "verification_assignment.created", resourceType: "verification_assignment", resourceId: id, detail: { projectId: input.projectId, profileVersionId: input.profileVersionId, credentialId: input.credentialId, reinspectionOfAssignmentId: input.reinspectionOfAssignmentId ?? null }, occurredAt: at });
    return { assignmentId: id, token };
  }

  async resolveExternalVerificationToken(rawToken: string): Promise<TenantContext> {
    const tokenHash = digest(required(rawToken, "Verification access token"));
    const assignment = await this.database.select().from(schema.verificationAssignments).where(eq(schema.verificationAssignments.tokenHash, tokenHash)).limit(1);
    if (!assignment[0] || assignment[0].revokedAt || new Date(assignment[0].expiresAt).getTime() <= this.clock().getTime()) throw new VerificationStateError("Verification access is invalid, expired, or revoked.");
    const [verifier, credential] = await Promise.all([
      this.database.select().from(schema.verifiers).where(and(eq(schema.verifiers.organizationId, assignment[0].organizationId), eq(schema.verifiers.id, assignment[0].verifierId), eq(schema.verifiers.status, "active"))).limit(1),
      this.database.select().from(schema.verifierCredentials).where(and(eq(schema.verifierCredentials.organizationId, assignment[0].organizationId), eq(schema.verifierCredentials.id, assignment[0].credentialId), eq(schema.verifierCredentials.verifyCurrentStatus, "verified_current"))).limit(1),
    ]);
    if (!verifier[0] || !credential[0] || credential[0].expiresOn < this.clock().toISOString().slice(0, 10)) throw new VerificationStateError("The assigned verifier or credential is no longer current.");
    return { organizationId: assignment[0].organizationId, actorSubject: verifier[0].email, principalType: "external_reviewer", role: "independent_verifier", grantedScopes: assignment[0].scope, assignedProjectIds: [assignment[0].projectId], assignedProjectScopes: { [assignment[0].projectId]: assignment[0].scope } };
  }

  async declareConflict(context: TenantContext, input: { assignmentId: string; conflictState: "no_conflict_declared" | "conflict_disclosed" | "unable_to_determine"; declaration: string; disclosedRelationships: string[] }) {
    const assignment = await this.assignment(context, input.assignmentId, "verification_conflict_declaration", "create");
    if (context.actorSubject !== (await this.verifierEmail(assignment.verifierId, context.organizationId))) throw new VerificationStateError("Only the assigned verifier may sign the conflict declaration.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationConflictDeclarations).values({ id, ...tenantRecord(context, at), assignmentId: input.assignmentId, declaration: required(input.declaration, "Conflict declaration"), conflictState: input.conflictState, disclosedRelationships: input.disclosedRelationships, signedBy: context.actorSubject, signedAt: at });
    await appendAudit(this.database, context, { action: "verification_conflict.declared", resourceType: "verification_conflict_declaration", resourceId: id, detail: { assignmentId: input.assignmentId, conflictState: input.conflictState }, occurredAt: at });
    return { declarationId: id, conflictState: input.conflictState };
  }

  async recordMethod(context: TenantContext, input: { assignmentId: string; methodType: "desktop_review" | "site_visit" | "photographic_review" | "geolocation_check" | "timestamp_check" | "measurement"; methodVersion: string; performedAt: string; latitude?: string; longitude?: string; measurementJson?: Record<string, unknown>; limitations: string }) {
    await this.assignment(context, input.assignmentId, "verification_method", "create");
    await this.requireClearConflict(context, input.assignmentId);
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationMethods).values({ id, ...tenantRecord(context, at), assignmentId: input.assignmentId, methodType: input.methodType, methodVersion: required(input.methodVersion, "Method version"), performedBy: context.actorSubject, performedAt: input.performedAt, latitude: input.latitude, longitude: input.longitude, measurementJson: input.measurementJson ?? {}, limitations: required(input.limitations, "Method limitations") });
    await appendAudit(this.database, context, { action: "verification_method.recorded", resourceType: "verification_method", resourceId: id, detail: { assignmentId: input.assignmentId, methodType: input.methodType, methodVersion: input.methodVersion }, occurredAt: at });
    return { methodId: id };
  }

  async recordFinding(context: TenantContext, input: { assignmentId: string; methodId: string; projectInterventionId: string; criterionId: string; conclusion: "conforming" | "nonconforming" | "insufficient_evidence" | "not_observed"; evidenceLevel: VerificationEvidenceLevel; statement: string; limitations: string; evidence: Array<{ evidenceVersionId: string; relationship: "supports" | "contradicts" | "context_only" }> }) {
    const assignment = await this.assignment(context, input.assignmentId, "verification_finding", "create");
    await this.requireClearConflict(context, input.assignmentId);
    if (!input.evidence.length) throw new VerificationValidationError("A verification finding must cite at least one exact evidence version.");
    const [method, intervention, criterion, project] = await Promise.all([
      this.database.select().from(schema.verificationMethods).where(and(eq(schema.verificationMethods.organizationId, context.organizationId), eq(schema.verificationMethods.id, input.methodId), eq(schema.verificationMethods.assignmentId, input.assignmentId))).limit(1),
      this.database.select().from(schema.projectInterventions).where(and(eq(schema.projectInterventions.organizationId, context.organizationId), eq(schema.projectInterventions.id, input.projectInterventionId), eq(schema.projectInterventions.projectId, assignment.projectId))).limit(1),
      this.database.select().from(schema.targetProfileCriteria).where(and(eq(schema.targetProfileCriteria.organizationId, context.organizationId), eq(schema.targetProfileCriteria.id, input.criterionId), eq(schema.targetProfileCriteria.profileVersionId, assignment.profileVersionId))).limit(1),
      this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, assignment.projectId))).limit(1),
    ]);
    if (!method[0] || !intervention[0] || !criterion[0] || !project[0]) throw new VerificationStateError("Finding references must match the exact assignment, project intervention, and profile criterion.");
    const evidenceRows = await this.database.select({ versionId: schema.evidenceVersions.id, propertyId: schema.evidenceItems.propertyId }).from(schema.evidenceVersions).innerJoin(schema.evidenceItems, eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId)).where(and(eq(schema.evidenceVersions.organizationId, context.organizationId), inArray(schema.evidenceVersions.id, input.evidence.map((item) => item.evidenceVersionId))));
    if (evidenceRows.length !== new Set(input.evidence.map((item) => item.evidenceVersionId)).size || evidenceRows.some((item) => item.propertyId !== project[0].propertyId)) throw new VerificationStateError("Every finding evidence version must belong to the assigned property and tenant.");
    const payload = { assignmentId: input.assignmentId, profileVersionId: assignment.profileVersionId, projectInterventionId: input.projectInterventionId, criterionId: input.criterionId, methodId: input.methodId, conclusion: input.conclusion, evidenceLevel: input.evidenceLevel, statement: required(input.statement, "Finding statement"), limitations: required(input.limitations, "Finding limitations"), evidence: input.evidence, verifierSubject: context.actorSubject, concludedAt: this.clock().toISOString() };
    const id = randomUUID(), at = payload.concludedAt, signatureHash = digest(payload);
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.verificationFindings).values({ id, ...tenantRecord(context, at), assignmentId: input.assignmentId, methodId: input.methodId, projectInterventionId: input.projectInterventionId, criterionId: input.criterionId, conclusion: input.conclusion, evidenceLevel: input.evidenceLevel, statement: payload.statement, limitations: payload.limitations, verifierSubject: context.actorSubject, concludedAt: at, signatureHash });
      await db.insert(schema.verificationFindingEvidenceLinks).values(input.evidence.map((item) => ({ id: randomUUID(), ...tenantRecord(context, at), findingId: id, evidenceVersionId: item.evidenceVersionId, relationship: item.relationship })));
      await appendAudit(db, context, { action: "verification_finding.signed", resourceType: "verification_finding", resourceId: id, detail: { assignmentId: input.assignmentId, conclusion: input.conclusion, evidenceLevel: input.evidenceLevel, signatureHash }, occurredAt: at });
    });
    return { findingId: id, signatureHash };
  }

  async reviewFinding(context: TenantContext, input: { findingId: string; decision: "approved" | "rejected" | "changes_requested"; evidenceAndMethodChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "verification_finding_review", resourceOrganizationId: context.organizationId });
    human(context, "review a verifier finding");
    const finding = await this.database.select().from(schema.verificationFindings).where(and(eq(schema.verificationFindings.organizationId, context.organizationId), eq(schema.verificationFindings.id, input.findingId))).limit(1);
    if (!finding[0]) throw new TenantResourceNotFoundError("Verification finding");
    if (finding[0].verifierSubject === context.actorSubject) throw new VerificationStateError("Finding author and reviewer must be different humans.");
    if (input.decision === "approved" && !input.evidenceAndMethodChecked) throw new VerificationStateError("Finding approval requires evidence and method review.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationFindingReviews).values({ id, ...tenantRecord(context, at), findingId: input.findingId, decision: input.decision, reviewerSubject: context.actorSubject, evidenceAndMethodChecked: input.evidenceAndMethodChecked, note: required(input.note, "Finding review note"), reviewedAt: at });
    await appendAudit(this.database, context, { action: `verification_finding.${input.decision}`, resourceType: "verification_finding_review", resourceId: id, detail: { findingId: input.findingId, evidenceAndMethodChecked: input.evidenceAndMethodChecked }, occurredAt: at });
    return { reviewId: id, decision: input.decision };
  }

  async openException(context: TenantContext, input: { assignmentId: string; findingId?: string; exceptionType: string; description: string; severity: "low" | "medium" | "high" | "critical" }) {
    await this.assignment(context, input.assignmentId, "verification_exception", "create");
    if (input.findingId) {
      const finding = await this.database.select().from(schema.verificationFindings).where(and(eq(schema.verificationFindings.organizationId, context.organizationId), eq(schema.verificationFindings.id, input.findingId), eq(schema.verificationFindings.assignmentId, input.assignmentId))).limit(1);
      if (!finding[0]) throw new VerificationStateError("Exception finding must belong to the assignment.");
    }
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationExceptions).values({ id, ...tenantRecord(context, at), assignmentId: input.assignmentId, findingId: input.findingId, exceptionType: required(input.exceptionType, "Exception type"), description: required(input.description, "Exception description"), severity: input.severity, openedBy: context.actorSubject, openedAt: at });
    return { exceptionId: id };
  }

  async recordCorrectiveAction(context: TenantContext, input: { exceptionId: string; actionType: string; description: string; state: "required" | "submitted" | "accepted" | "rejected" | "cancelled"; responsibleSubject: string; dueOn?: string; evidenceVersionId?: string; supersedesActionId?: string }) {
    const exception = await this.database.select().from(schema.verificationExceptions).where(and(eq(schema.verificationExceptions.organizationId, context.organizationId), eq(schema.verificationExceptions.id, input.exceptionId))).limit(1);
    if (!exception[0]) throw new TenantResourceNotFoundError("Verification exception");
    const assignment = await this.assignment(context, exception[0].assignmentId, "verification_corrective_action", "create");
    if (input.supersedesActionId) {
      const prior = await this.database.select().from(schema.verificationCorrectiveActions).where(and(eq(schema.verificationCorrectiveActions.organizationId, context.organizationId), eq(schema.verificationCorrectiveActions.id, input.supersedesActionId), eq(schema.verificationCorrectiveActions.exceptionId, input.exceptionId))).limit(1);
      if (!prior[0]) throw new VerificationStateError("Corrective action may supersede only prior history for the same exception.");
    }
    if (input.state === "accepted" && assignment.verifierId && context.principalType !== "membership") throw new VerificationStateError("Only an organization member may accept corrective evidence.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationCorrectiveActions).values({ id, ...tenantRecord(context, at), exceptionId: input.exceptionId, actionType: required(input.actionType, "Corrective action type"), description: required(input.description, "Corrective action description"), state: input.state, responsibleSubject: required(input.responsibleSubject, "Responsible subject"), dueOn: input.dueOn, evidenceVersionId: input.evidenceVersionId, recordedBy: context.actorSubject, recordedAt: at, supersedesActionId: input.supersedesActionId });
    await appendAudit(this.database, context, { action: `verification_corrective_action.${input.state}`, resourceType: "verification_corrective_action", resourceId: id, detail: { exceptionId: input.exceptionId, supersedesActionId: input.supersedesActionId ?? null }, occurredAt: at });
    return { correctiveActionId: id, state: input.state };
  }

  async issueCertificate(context: TenantContext, input: { assignmentId: string; certificateNumber: string; expiresAt: string; humanConfirmed: boolean; limitations: string }) {
    const assignment = await this.assignment(context, input.assignmentId, "verification_certificate", "create");
    human(context, "confirm and issue a verification certificate record");
    if (!input.humanConfirmed) throw new VerificationStateError("A human must confirm the exact verification conclusion before issuance.");
    await this.requireClearConflict(context, input.assignmentId);
    const [credential, findings, exceptions] = await Promise.all([
      this.database.select().from(schema.verifierCredentials).where(and(eq(schema.verifierCredentials.organizationId, context.organizationId), eq(schema.verifierCredentials.id, assignment.credentialId))).limit(1),
      this.database.select({ finding: schema.verificationFindings, review: schema.verificationFindingReviews }).from(schema.verificationFindings).leftJoin(schema.verificationFindingReviews, eq(schema.verificationFindingReviews.findingId, schema.verificationFindings.id)).where(and(eq(schema.verificationFindings.organizationId, context.organizationId), eq(schema.verificationFindings.assignmentId, input.assignmentId))).orderBy(asc(schema.verificationFindings.concludedAt)),
      this.database.select().from(schema.verificationExceptions).where(and(eq(schema.verificationExceptions.organizationId, context.organizationId), eq(schema.verificationExceptions.assignmentId, input.assignmentId))),
    ]);
    if (!credential[0] || credential[0].verifyCurrentStatus !== "verified_current" || credential[0].expiresOn < this.clock().toISOString().slice(0, 10)) throw new VerificationStateError("Certificate issuance requires a current, reviewed credential.");
    if (!findings.length || findings.some(({ finding, review }) => finding.conclusion !== "conforming" || review?.decision !== "approved")) throw new VerificationStateError("Certificate issuance requires at least one conforming finding and independent approval of every finding.");
    for (const exception of exceptions) {
      const latest = await this.database.select().from(schema.verificationCorrectiveActions).where(and(eq(schema.verificationCorrectiveActions.organizationId, context.organizationId), eq(schema.verificationCorrectiveActions.exceptionId, exception.id))).orderBy(desc(schema.verificationCorrectiveActions.recordedAt)).limit(1);
      if (latest[0]?.state !== "accepted") throw new VerificationStateError("Certificate issuance is blocked while an exception lacks an accepted corrective action.");
    }
    if (findings.some(({ finding, review }) => [finding.verifierSubject, review?.reviewerSubject].includes(context.actorSubject))) throw new VerificationStateError("Certificate issuer must be separate from finding authors and reviewers.");
    if (new Date(input.expiresAt).getTime() <= this.clock().getTime()) throw new VerificationValidationError("Certificate expiry must be in the future.");
    const conclusion = findings.map(({ finding, review }) => ({ findingId: finding.id, signatureHash: finding.signatureHash, conclusion: finding.conclusion, evidenceLevel: finding.evidenceLevel, reviewId: review!.id, reviewDecision: review!.decision }));
    const at = this.clock().toISOString(), id = randomUUID(), eventId = randomUUID(), conclusionHash = digest({ assignmentId: input.assignmentId, profileVersionId: assignment.profileVersionId, credentialId: assignment.credentialId, conclusion });
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.verificationCertificates).values({ id, ...tenantRecord(context, at), assignmentId: input.assignmentId, certificateNumber: required(input.certificateNumber, "Certificate number"), conclusionHash, issuedBy: context.actorSubject, issuedAt: at, expiresAt: input.expiresAt, humanConfirmed: true, limitations: required(input.limitations, "Certificate limitations") });
      await db.insert(schema.verificationCertificateEvents).values({ id: eventId, ...tenantRecord(context, at), certificateId: id, eventType: "issued", rationale: "Human-confirmed issue event for the exact signed finding set.", decidedBy: context.actorSubject, occurredAt: at });
      await appendAudit(db, context, { action: "verification_certificate.issued", resourceType: "verification_certificate", resourceId: id, detail: { assignmentId: input.assignmentId, conclusionHash, fortifyIsSubstantiveVerifier: false }, occurredAt: at });
    });
    return { certificateId: id, conclusionHash, state: "issued" as const };
  }

  async recordCertificateEvent(context: TenantContext, input: { certificateId: string; eventType: "expired" | "revoked" | "reinstated"; rationale: string; supersedesEventId?: string }) {
    assertAuthorized(context, { action: "create", resource: "verification_certificate_event", resourceOrganizationId: context.organizationId });
    human(context, "record certificate status history");
    const certificate = await this.database.select().from(schema.verificationCertificates).where(and(eq(schema.verificationCertificates.organizationId, context.organizationId), eq(schema.verificationCertificates.id, input.certificateId))).limit(1);
    if (!certificate[0]) throw new TenantResourceNotFoundError("Verification certificate");
    const prior = await this.database.select().from(schema.verificationCertificateEvents).where(and(eq(schema.verificationCertificateEvents.organizationId, context.organizationId), eq(schema.verificationCertificateEvents.certificateId, input.certificateId))).orderBy(desc(schema.verificationCertificateEvents.occurredAt)).limit(1);
    if (input.supersedesEventId && prior[0]?.id !== input.supersedesEventId) throw new VerificationStateError("Certificate status changes must supersede the latest event.");
    if (input.eventType === "reinstated" && prior[0]?.eventType !== "revoked") throw new VerificationStateError("Only a revoked certificate may be reinstated.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.verificationCertificateEvents).values({ id, ...tenantRecord(context, at), certificateId: input.certificateId, eventType: input.eventType, rationale: required(input.rationale, "Certificate event rationale"), decidedBy: context.actorSubject, occurredAt: at, supersedesEventId: input.supersedesEventId });
    await appendAudit(this.database, context, { action: `verification_certificate.${input.eventType}`, resourceType: "verification_certificate_event", resourceId: id, detail: { certificateId: input.certificateId, supersedesEventId: input.supersedesEventId ?? null }, occurredAt: at });
    return { eventId: id, state: input.eventType };
  }

  async createMaintenanceObligation(context: TenantContext, input: { certificateId: string; interventionVersionId: string; title: string; requirement: string; recurrenceRule: string; evidenceRequirement: string; nextDueAt: string }) {
    assertAuthorized(context, { action: "create", resource: "maintenance_obligation", resourceOrganizationId: context.organizationId });
    human(context, "create a certificate-linked maintenance obligation");
    const certificate = await this.database.select({ certificate: schema.verificationCertificates, assignment: schema.verificationAssignments }).from(schema.verificationCertificates).innerJoin(schema.verificationAssignments, eq(schema.verificationAssignments.id, schema.verificationCertificates.assignmentId)).where(and(eq(schema.verificationCertificates.organizationId, context.organizationId), eq(schema.verificationCertificates.id, input.certificateId))).limit(1);
    const projectIntervention = certificate[0] ? await this.database.select().from(schema.projectInterventions).where(and(eq(schema.projectInterventions.organizationId, context.organizationId), eq(schema.projectInterventions.projectId, certificate[0].assignment.projectId), eq(schema.projectInterventions.interventionVersionId, input.interventionVersionId))).limit(1) : [];
    if (!certificate[0] || !projectIntervention[0]) throw new VerificationStateError("Maintenance obligation must trace to the certificate project and exact intervention version.");
    const at = this.clock().toISOString(), id = randomUUID(), eventId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.maintenanceObligations).values({ id, ...tenantRecord(context, at), certificateId: input.certificateId, interventionVersionId: input.interventionVersionId, title: required(input.title, "Maintenance title"), requirement: required(input.requirement, "Maintenance requirement"), recurrenceRule: required(input.recurrenceRule, "Maintenance recurrence"), evidenceRequirement: required(input.evidenceRequirement, "Maintenance evidence requirement"), nextDueAt: input.nextDueAt });
      await db.insert(schema.maintenanceObligationEvents).values({ id: eventId, ...tenantRecord(context, at), obligationId: id, eventType: "scheduled", note: "Initial maintenance obligation schedule.", recordedBy: context.actorSubject, occurredAt: at });
    });
    return { obligationId: id, eventId };
  }

  async recordMaintenanceEvent(context: TenantContext, input: { obligationId: string; eventType: "evidence_refreshed" | "satisfied" | "expired" | "waived"; evidenceVersionId?: string; note: string }) {
    const obligation = await this.database.select({ obligation: schema.maintenanceObligations, certificate: schema.verificationCertificates, assignment: schema.verificationAssignments }).from(schema.maintenanceObligations).innerJoin(schema.verificationCertificates, eq(schema.verificationCertificates.id, schema.maintenanceObligations.certificateId)).innerJoin(schema.verificationAssignments, eq(schema.verificationAssignments.id, schema.verificationCertificates.assignmentId)).where(and(eq(schema.maintenanceObligations.organizationId, context.organizationId), eq(schema.maintenanceObligations.id, input.obligationId))).limit(1);
    if (!obligation[0]) throw new TenantResourceNotFoundError("Maintenance obligation");
    assertAuthorized(context, { action: "create", resource: "maintenance_obligation_event", resourceOrganizationId: context.organizationId, projectId: obligation[0].assignment.projectId });
    if (["evidence_refreshed", "satisfied"].includes(input.eventType) && !input.evidenceVersionId) throw new VerificationStateError("Evidence refresh and satisfaction events require an exact evidence version.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.insert(schema.maintenanceObligationEvents).values({ id, ...tenantRecord(context, at), obligationId: input.obligationId, eventType: input.eventType, evidenceVersionId: input.evidenceVersionId, note: required(input.note, "Maintenance event note"), recordedBy: context.actorSubject, occurredAt: at });
    return { eventId: id, state: input.eventType };
  }

  async recordPropertyConditionEvent(context: TenantContext, input: { propertyId: string; projectId?: string; certificateId?: string; eventType: string; conditionState: "observed_conforming" | "observed_degraded" | "insufficient_evidence" | "not_observed"; evidenceVersionId?: string; observedAt: string; note: string }) {
    if (!input.projectId && !input.certificateId) throw new VerificationValidationError("A condition event must trace to a project or certificate.");
    assertAuthorized(context, { action: "create", resource: "property_condition_event", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    const [property, project, certificate, evidence] = await Promise.all([
      this.database.select().from(schema.properties).where(and(eq(schema.properties.organizationId, context.organizationId), eq(schema.properties.id, input.propertyId))).limit(1),
      input.projectId ? this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId), eq(schema.resilienceProjects.propertyId, input.propertyId))).limit(1) : Promise.resolve([]),
      input.certificateId ? this.database.select({ certificate: schema.verificationCertificates, assignment: schema.verificationAssignments, project: schema.resilienceProjects }).from(schema.verificationCertificates).innerJoin(schema.verificationAssignments, eq(schema.verificationAssignments.id, schema.verificationCertificates.assignmentId)).innerJoin(schema.resilienceProjects, eq(schema.resilienceProjects.id, schema.verificationAssignments.projectId)).where(and(eq(schema.verificationCertificates.organizationId, context.organizationId), eq(schema.verificationCertificates.id, input.certificateId), eq(schema.resilienceProjects.propertyId, input.propertyId))).limit(1) : Promise.resolve([]),
      input.evidenceVersionId ? this.database.select({ id: schema.evidenceVersions.id }).from(schema.evidenceVersions).innerJoin(schema.evidenceItems, eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId)).where(and(eq(schema.evidenceVersions.organizationId, context.organizationId), eq(schema.evidenceVersions.id, input.evidenceVersionId), eq(schema.evidenceItems.propertyId, input.propertyId))).limit(1) : Promise.resolve([]),
    ]);
    if (!property[0] || (input.projectId && !project[0]) || (input.certificateId && !certificate[0]) || (input.evidenceVersionId && !evidence[0])) throw new VerificationStateError("Condition-event project, certificate, evidence, and property must share the same tenant and property.");
    if (input.certificateId && input.projectId && certificate[0]?.assignment.projectId !== input.projectId) throw new VerificationStateError("Condition-event certificate must belong to the referenced project.");
    if (["observed_conforming", "observed_degraded"].includes(input.conditionState) && !input.evidenceVersionId) throw new VerificationStateError("An observed condition requires an exact evidence version.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.propertyConditionEvents).values({ id, ...tenantRecord(context, at), propertyId: input.propertyId, projectId: input.projectId, certificateId: input.certificateId, eventType: required(input.eventType, "Condition event type"), conditionState: input.conditionState, evidenceVersionId: input.evidenceVersionId, observedBy: context.actorSubject, observedAt: input.observedAt, note: required(input.note, "Condition event note") });
      await appendAudit(db, context, { action: "property_condition.recorded", resourceType: "property_condition_event", resourceId: id, detail: { propertyId: input.propertyId, projectId: input.projectId ?? null, certificateId: input.certificateId ?? null, conditionState: input.conditionState, evidenceVersionId: input.evidenceVersionId ?? null }, occurredAt: at });
    });
    return { conditionEventId: id, state: input.conditionState };
  }

  async getAssignmentWorkspace(context: TenantContext, assignmentId: string) {
    const assignment = await this.assignment(context, assignmentId, "verification_assignment", "read");
    const organizationId = context.organizationId;
    const [verifier, credential, credentialReview, conflict, methods, findings, links, reviews, exceptions, actions, certificates, certificateEvents, obligations, obligationEvents] = await Promise.all([
      this.database.select().from(schema.verifiers).where(and(eq(schema.verifiers.organizationId, organizationId), eq(schema.verifiers.id, assignment.verifierId))).limit(1),
      this.database.select().from(schema.verifierCredentials).where(and(eq(schema.verifierCredentials.organizationId, organizationId), eq(schema.verifierCredentials.id, assignment.credentialId))).limit(1),
      this.database.select().from(schema.verifierCredentialReviews).where(and(eq(schema.verifierCredentialReviews.organizationId, organizationId), eq(schema.verifierCredentialReviews.credentialId, assignment.credentialId))).limit(1),
      this.database.select().from(schema.verificationConflictDeclarations).where(and(eq(schema.verificationConflictDeclarations.organizationId, organizationId), eq(schema.verificationConflictDeclarations.assignmentId, assignmentId))).limit(1),
      this.database.select().from(schema.verificationMethods).where(and(eq(schema.verificationMethods.organizationId, organizationId), eq(schema.verificationMethods.assignmentId, assignmentId))),
      this.database.select().from(schema.verificationFindings).where(and(eq(schema.verificationFindings.organizationId, organizationId), eq(schema.verificationFindings.assignmentId, assignmentId))),
      this.database.select({ link: schema.verificationFindingEvidenceLinks }).from(schema.verificationFindingEvidenceLinks).innerJoin(schema.verificationFindings, eq(schema.verificationFindings.id, schema.verificationFindingEvidenceLinks.findingId)).where(and(eq(schema.verificationFindingEvidenceLinks.organizationId, organizationId), eq(schema.verificationFindings.assignmentId, assignmentId))),
      this.database.select({ review: schema.verificationFindingReviews }).from(schema.verificationFindingReviews).innerJoin(schema.verificationFindings, eq(schema.verificationFindings.id, schema.verificationFindingReviews.findingId)).where(and(eq(schema.verificationFindingReviews.organizationId, organizationId), eq(schema.verificationFindings.assignmentId, assignmentId))),
      this.database.select().from(schema.verificationExceptions).where(and(eq(schema.verificationExceptions.organizationId, organizationId), eq(schema.verificationExceptions.assignmentId, assignmentId))),
      this.database.select({ action: schema.verificationCorrectiveActions }).from(schema.verificationCorrectiveActions).innerJoin(schema.verificationExceptions, eq(schema.verificationExceptions.id, schema.verificationCorrectiveActions.exceptionId)).where(and(eq(schema.verificationCorrectiveActions.organizationId, organizationId), eq(schema.verificationExceptions.assignmentId, assignmentId))),
      this.database.select().from(schema.verificationCertificates).where(and(eq(schema.verificationCertificates.organizationId, organizationId), eq(schema.verificationCertificates.assignmentId, assignmentId))),
      this.database.select({ event: schema.verificationCertificateEvents }).from(schema.verificationCertificateEvents).innerJoin(schema.verificationCertificates, eq(schema.verificationCertificates.id, schema.verificationCertificateEvents.certificateId)).where(and(eq(schema.verificationCertificateEvents.organizationId, organizationId), eq(schema.verificationCertificates.assignmentId, assignmentId))),
      this.database.select({ obligation: schema.maintenanceObligations }).from(schema.maintenanceObligations).innerJoin(schema.verificationCertificates, eq(schema.verificationCertificates.id, schema.maintenanceObligations.certificateId)).where(and(eq(schema.maintenanceObligations.organizationId, organizationId), eq(schema.verificationCertificates.assignmentId, assignmentId))),
      this.database.select({ event: schema.maintenanceObligationEvents }).from(schema.maintenanceObligationEvents).innerJoin(schema.maintenanceObligations, eq(schema.maintenanceObligations.id, schema.maintenanceObligationEvents.obligationId)).innerJoin(schema.verificationCertificates, eq(schema.verificationCertificates.id, schema.maintenanceObligations.certificateId)).where(and(eq(schema.maintenanceObligationEvents.organizationId, organizationId), eq(schema.verificationCertificates.assignmentId, assignmentId))),
    ]);
    return { assignment, verifier: verifier[0], credential: credential[0], credentialReview: credentialReview[0], conflict: conflict[0] ?? null, methods, findings, evidenceLinks: links.map((item) => item.link), findingReviews: reviews.map((item) => item.review), exceptions, correctiveActions: actions.map((item) => item.action), certificates, certificateEvents: certificateEvents.map((item) => item.event), maintenanceObligations: obligations.map((item) => item.obligation), maintenanceEvents: obligationEvents.map((item) => item.event), doctrine: { fortifyIsSubstantiveVerifier: false, conclusionsAreAssignmentBound: true, missingEvidencePasses: false, certificatesGuaranteeOutcomes: false } };
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, { action: "read", resource: "verification_assignment", resourceOrganizationId: context.organizationId });
    const organizationId = context.organizationId;
    const [organizations, verifiers, credentials, credentialReviews, assignments, conflicts, methods, findings, evidenceLinks, findingReviews, exceptions, correctiveActions, certificates, certificateEvents, maintenanceObligations, maintenanceEvents, conditionEvents] = await Promise.all([
      this.database.select().from(schema.verificationOrganizations).where(eq(schema.verificationOrganizations.organizationId, organizationId)), this.database.select().from(schema.verifiers).where(eq(schema.verifiers.organizationId, organizationId)), this.database.select().from(schema.verifierCredentials).where(eq(schema.verifierCredentials.organizationId, organizationId)), this.database.select().from(schema.verifierCredentialReviews).where(eq(schema.verifierCredentialReviews.organizationId, organizationId)), this.database.select().from(schema.verificationAssignments).where(eq(schema.verificationAssignments.organizationId, organizationId)), this.database.select().from(schema.verificationConflictDeclarations).where(eq(schema.verificationConflictDeclarations.organizationId, organizationId)), this.database.select().from(schema.verificationMethods).where(eq(schema.verificationMethods.organizationId, organizationId)), this.database.select().from(schema.verificationFindings).where(eq(schema.verificationFindings.organizationId, organizationId)), this.database.select().from(schema.verificationFindingEvidenceLinks).where(eq(schema.verificationFindingEvidenceLinks.organizationId, organizationId)), this.database.select().from(schema.verificationFindingReviews).where(eq(schema.verificationFindingReviews.organizationId, organizationId)), this.database.select().from(schema.verificationExceptions).where(eq(schema.verificationExceptions.organizationId, organizationId)), this.database.select().from(schema.verificationCorrectiveActions).where(eq(schema.verificationCorrectiveActions.organizationId, organizationId)), this.database.select().from(schema.verificationCertificates).where(eq(schema.verificationCertificates.organizationId, organizationId)), this.database.select().from(schema.verificationCertificateEvents).where(eq(schema.verificationCertificateEvents.organizationId, organizationId)), this.database.select().from(schema.maintenanceObligations).where(eq(schema.maintenanceObligations.organizationId, organizationId)), this.database.select().from(schema.maintenanceObligationEvents).where(eq(schema.maintenanceObligationEvents.organizationId, organizationId)), this.database.select().from(schema.propertyConditionEvents).where(eq(schema.propertyConditionEvents.organizationId, organizationId)),
    ]);
    return { organizations, verifiers, credentials, credentialReviews, assignments, conflicts, methods, findings, evidenceLinks, findingReviews, exceptions, correctiveActions, certificates, certificateEvents, maintenanceObligations, maintenanceEvents, conditionEvents, doctrine: { fortifyIsSubstantiveVerifier: false, evidenceLevelIsNotProofStrength: true, conclusionsRequireHumanSignature: true, missingEvidencePasses: false } };
  }

  private async assignment(context: TenantContext, assignmentId: string, resource: Parameters<typeof assertAuthorized>[1]["resource"], action: Parameters<typeof assertAuthorized>[1]["action"]) {
    const assignment = await this.database.select().from(schema.verificationAssignments).where(and(eq(schema.verificationAssignments.organizationId, context.organizationId), eq(schema.verificationAssignments.id, assignmentId))).limit(1);
    if (!assignment[0]) throw new TenantResourceNotFoundError("Verification assignment");
    assertAuthorized(context, { action, resource, resourceOrganizationId: context.organizationId, projectId: assignment[0].projectId });
    if (assignment[0].revokedAt || new Date(assignment[0].expiresAt).getTime() <= this.clock().getTime()) throw new VerificationStateError("Verification assignment is expired or revoked.");
    return assignment[0];
  }

  private async verifierEmail(verifierId: string, organizationId: string) {
    const verifier = await this.database.select({ email: schema.verifiers.email }).from(schema.verifiers).where(and(eq(schema.verifiers.organizationId, organizationId), eq(schema.verifiers.id, verifierId))).limit(1);
    if (!verifier[0]) throw new TenantResourceNotFoundError("Verifier");
    return verifier[0].email;
  }

  private async requireClearConflict(context: TenantContext, assignmentId: string) {
    const declaration = await this.database.select().from(schema.verificationConflictDeclarations).where(and(eq(schema.verificationConflictDeclarations.organizationId, context.organizationId), eq(schema.verificationConflictDeclarations.assignmentId, assignmentId))).limit(1);
    if (declaration[0]?.conflictState !== "no_conflict_declared") throw new VerificationStateError("Verification work is blocked until the assigned verifier signs a no-conflict declaration.");
  }
}

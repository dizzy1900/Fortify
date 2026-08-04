import { getProductionDatabase } from "@/db/production/client";
import { VerificationService } from "@/lib/production/verification-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type VerificationWorkspace = Awaited<
  ReturnType<VerificationService["getWorkspace"]>
>;
type VerificationAssignmentWorkspace = Awaited<
  ReturnType<VerificationService["getAssignmentWorkspace"]>
>;
type PresentableVerificationWorkspace = Omit<
  VerificationWorkspace,
  "doctrine"
> & { doctrine: Record<string, boolean> };

export function getProductionVerificationService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new VerificationService(database);
}

export function presentVerificationWorkspace(
  workspace: PresentableVerificationWorkspace,
) {
  return {
    organizations: workspace.organizations.map((organization) => ({
      id: organization.id,
      legalName: organization.legalName,
      organizationType: organization.organizationType,
      status: organization.status,
      limitations: organization.limitations,
    })),
    verifiers: workspace.verifiers.map((verifier) => ({
      id: verifier.id,
      verificationOrganizationId: verifier.verificationOrganizationId,
      displayName: verifier.displayName,
      email: verifier.email,
      status: verifier.status,
    })),
    credentials: workspace.credentials.map((credential) => ({
      id: credential.id,
      verifierId: credential.verifierId,
      credentialType: credential.credentialType,
      issuer: credential.issuer,
      credentialReference: credential.credentialReference,
      jurisdiction: credential.jurisdiction,
      scope: [...credential.scope],
      issuedOn: credential.issuedOn,
      expiresOn: credential.expiresOn,
      sourceVersion: credential.sourceVersion,
      verifyCurrentStatus: credential.verifyCurrentStatus,
    })),
    credentialReviews: workspace.credentialReviews.map((review) => ({
      credentialId: review.credentialId,
      decision: review.decision,
      reviewerSubject: review.reviewerSubject,
      sourceChecked: review.sourceChecked,
      reviewedAt: review.reviewedAt,
    })),
    assignments: workspace.assignments.map((assignment) => ({
      id: assignment.id,
      projectId: assignment.projectId,
      profileVersionId: assignment.profileVersionId,
      verifierId: assignment.verifierId,
      credentialId: assignment.credentialId,
      purpose: assignment.purpose,
      scope: [...assignment.scope],
      assignedBy: assignment.assignedBy,
      assignedAt: assignment.assignedAt,
      dueOn: assignment.dueOn,
      expiresAt: assignment.expiresAt,
      revokedAt: assignment.revokedAt,
      reinspectionOfAssignmentId: assignment.reinspectionOfAssignmentId,
    })),
    conflicts: workspace.conflicts.map((conflict) => ({
      assignmentId: conflict.assignmentId,
      conflictState: conflict.conflictState,
      declaration: conflict.declaration,
      disclosedRelationships: [...conflict.disclosedRelationships],
      signedBy: conflict.signedBy,
      signedAt: conflict.signedAt,
    })),
    methods: workspace.methods.map((method) => ({
      id: method.id,
      assignmentId: method.assignmentId,
      methodType: method.methodType,
      methodVersion: method.methodVersion,
      performedBy: method.performedBy,
      performedAt: method.performedAt,
      latitude: method.latitude,
      longitude: method.longitude,
      measurementJson: method.measurementJson,
      limitations: method.limitations,
    })),
    findings: workspace.findings.map((finding) => ({
      id: finding.id,
      assignmentId: finding.assignmentId,
      methodId: finding.methodId,
      projectInterventionId: finding.projectInterventionId,
      criterionId: finding.criterionId,
      conclusion: finding.conclusion,
      evidenceLevel: finding.evidenceLevel,
      statement: finding.statement,
      limitations: finding.limitations,
      verifierSubject: finding.verifierSubject,
      concludedAt: finding.concludedAt,
      signatureHash: finding.signatureHash,
    })),
    evidenceLinks: workspace.evidenceLinks.map((link) => ({
      findingId: link.findingId,
      evidenceVersionId: link.evidenceVersionId,
      relationship: link.relationship,
    })),
    findingReviews: workspace.findingReviews.map((review) => ({
      findingId: review.findingId,
      decision: review.decision,
      reviewerSubject: review.reviewerSubject,
      evidenceAndMethodChecked: review.evidenceAndMethodChecked,
      reviewedAt: review.reviewedAt,
    })),
    exceptions: workspace.exceptions.map((exception) => ({
      id: exception.id,
      assignmentId: exception.assignmentId,
      findingId: exception.findingId,
      exceptionType: exception.exceptionType,
      description: exception.description,
      severity: exception.severity,
      openedAt: exception.openedAt,
    })),
    correctiveActions: workspace.correctiveActions.map((action) => ({
      id: action.id,
      exceptionId: action.exceptionId,
      actionType: action.actionType,
      description: action.description,
      state: action.state,
      responsibleSubject: action.responsibleSubject,
      dueOn: action.dueOn,
      evidenceVersionId: action.evidenceVersionId,
      recordedAt: action.recordedAt,
    })),
    certificates: workspace.certificates.map((certificate) => ({
      id: certificate.id,
      assignmentId: certificate.assignmentId,
      certificateNumber: certificate.certificateNumber,
      conclusionHash: certificate.conclusionHash,
      issuedBy: certificate.issuedBy,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      limitations: certificate.limitations,
    })),
    certificateEvents: workspace.certificateEvents.map((event) => ({
      certificateId: event.certificateId,
      eventType: event.eventType,
      rationale: event.rationale,
      decidedBy: event.decidedBy,
      occurredAt: event.occurredAt,
    })),
    maintenanceObligations: workspace.maintenanceObligations.map(
      (obligation) => ({
        id: obligation.id,
        certificateId: obligation.certificateId,
        title: obligation.title,
        requirement: obligation.requirement,
        recurrenceRule: obligation.recurrenceRule,
        evidenceRequirement: obligation.evidenceRequirement,
        nextDueAt: obligation.nextDueAt,
      }),
    ),
    maintenanceEvents: workspace.maintenanceEvents.map((event) => ({
      obligationId: event.obligationId,
      eventType: event.eventType,
      evidenceVersionId: event.evidenceVersionId,
      note: event.note,
      recordedBy: event.recordedBy,
      occurredAt: event.occurredAt,
    })),
    doctrine: workspace.doctrine,
  };
}

export function presentVerificationAssignmentWorkspace(
  workspace: VerificationAssignmentWorkspace,
) {
  const presented = presentVerificationWorkspace({
    organizations: [],
    verifiers: workspace.verifier ? [workspace.verifier] : [],
    credentials: workspace.credential ? [workspace.credential] : [],
    credentialReviews: workspace.credentialReview
      ? [workspace.credentialReview]
      : [],
    assignments: [workspace.assignment],
    conflicts: workspace.conflict ? [workspace.conflict] : [],
    methods: workspace.methods,
    findings: workspace.findings,
    evidenceLinks: workspace.evidenceLinks,
    findingReviews: workspace.findingReviews,
    exceptions: workspace.exceptions,
    correctiveActions: workspace.correctiveActions,
    certificates: workspace.certificates,
    certificateEvents: workspace.certificateEvents,
    maintenanceObligations: workspace.maintenanceObligations,
    maintenanceEvents: workspace.maintenanceEvents,
    conditionEvents: [],
    doctrine: workspace.doctrine,
  });
  return {
    assignment: presented.assignments[0],
    verifier: presented.verifiers[0],
    credential: presented.credentials[0],
    credentialReview: presented.credentialReviews[0],
    conflict: presented.conflicts[0] ?? null,
    methods: presented.methods,
    findings: presented.findings,
    evidenceLinks: presented.evidenceLinks,
    findingReviews: presented.findingReviews,
    exceptions: presented.exceptions,
    correctiveActions: presented.correctiveActions,
    certificates: presented.certificates,
    certificateEvents: presented.certificateEvents,
    maintenanceObligations: presented.maintenanceObligations,
    maintenanceEvents: presented.maintenanceEvents,
    doctrine: workspace.doctrine,
  };
}

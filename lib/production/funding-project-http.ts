import { getProductionDatabase } from "@/db/production/client";
import { FundingProjectService } from "@/lib/production/funding-project-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type FundingProjectWorkspace = Awaited<
  ReturnType<FundingProjectService["getWorkspace"]>
>;
type FundingProjectScopedWorkspace = Awaited<
  ReturnType<FundingProjectService["getProjectWorkspace"]>
>;

export function getProductionFundingProjectService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new FundingProjectService(database);
}

export function presentFundingProjectWorkspace(
  workspace: FundingProjectWorkspace,
) {
  return {
    programmes: workspace.programmes.map((programme) => ({
      id: programme.id,
      name: programme.name,
      sponsorName: programme.sponsorName,
      programmeType: programme.programmeType,
      description: programme.description,
    })),
    programmeVersions: workspace.programmeVersions.map((version) => ({
      id: version.id,
      programmeId: version.programmeId,
      versionNumber: version.versionNumber,
      jurisdiction: version.jurisdiction,
      hazard: version.hazard,
      propertyClasses: [...version.propertyClasses],
      applicationOpensOn: version.applicationOpensOn,
      applicationClosesOn: version.applicationClosesOn,
      maximumAwardCents: version.maximumAwardCents,
      maximumCostShareBps: version.maximumCostShareBps,
      evidenceRequirements: [...version.evidenceRequirements],
      paymentConditions: [...version.paymentConditions],
      maintenanceObligations: [...version.maintenanceObligations],
      limitations: version.limitations,
      authorSubject: version.authorSubject,
    })),
    rules: workspace.rules.map((rule) => ({
      id: rule.id,
      programmeVersionId: rule.programmeVersionId,
      code: rule.code,
      field: rule.field,
      operator: rule.operator,
      expectedValues: [...rule.expectedValues],
      required: rule.required,
    })),
    reviews: workspace.reviews.map((review) => ({
      programmeVersionId: review.programmeVersionId,
      decision: review.decision,
      reviewerSubject: review.reviewerSubject,
    })),
    publications: workspace.publications.map((publication) => ({
      programmeVersionId: publication.programmeVersionId,
      decision: publication.decision,
      publisherSubject: publication.publisherSubject,
    })),
    assessments: workspace.assessments.map((assessment) => ({
      id: assessment.id,
      projectId: assessment.projectId,
      programmeVersionId: assessment.programmeVersionId,
      state: assessment.state,
      reasons: [...assessment.reasons],
      assessedBy: assessment.assessedBy,
    })),
    applications: workspace.applications.map((application) => ({
      id: application.id,
      requestedAmountCents: application.requestedAmountCents,
      state: application.state,
      limitations: application.limitations,
    })),
    stacks: workspace.stacks.map((stack) => ({
      id: stack.id,
      projectId: stack.projectId,
      name: stack.name,
      projectCostCents: stack.projectCostCents,
      state: stack.state,
      decisionBoundary: stack.decisionBoundary,
    })),
    contributions: workspace.contributions.map((contribution) => ({
      id: contribution.id,
      capitalStackId: contribution.capitalStackId,
      contributionType: contribution.contributionType,
      contributorName: contribution.contributorName,
      amountCents: contribution.amountCents,
      costShareBps: contribution.costShareBps,
      purpose: contribution.purpose,
    })),
    commitments: workspace.commitments.map((commitment) => ({
      id: commitment.id,
      contributionId: commitment.contributionId,
      committedAmountCents: commitment.committedAmountCents,
      terms: commitment.terms,
    })),
    commitmentEvents: workspace.commitmentEvents.map((event) => ({
      id: event.id,
      commitmentId: event.commitmentId,
      eventType: event.eventType,
      effectiveAmountCents: event.effectiveAmountCents,
      rationale: event.rationale,
      decidedBy: event.decidedBy,
      occurredAt: event.occurredAt,
    })),
    milestones: workspace.milestones.map((milestone) => ({
      id: milestone.id,
      projectId: milestone.projectId,
      code: milestone.code,
      name: milestone.name,
      position: milestone.position,
      dueOn: milestone.dueOn,
      evidenceRequirement: milestone.evidenceRequirement,
      paymentEligible: milestone.paymentEligible,
      plannedPaymentCents: milestone.plannedPaymentCents,
    })),
    dependencies: workspace.dependencies.map((dependency) => ({
      milestoneId: dependency.milestoneId,
      dependsOnMilestoneId: dependency.dependsOnMilestoneId,
    })),
    milestoneEvents: workspace.milestoneEvents.map((event) => ({
      milestoneId: event.milestoneId,
      eventType: event.eventType,
      note: event.note,
      decidedBy: event.decidedBy,
    })),
    paymentApprovals: workspace.paymentApprovals.map((approval) => ({
      id: approval.id,
      milestoneId: approval.milestoneId,
      amountCents: approval.amountCents,
      decision: approval.decision,
      approverSubject: approval.approverSubject,
    })),
    exports: workspace.exports.map((item) => ({
      id: item.id,
      paymentApprovalId: item.paymentApprovalId,
      exportVersion: item.exportVersion,
      payloadHash: item.payloadHash,
      executionState: item.executionState,
    })),
    collaborators: workspace.collaborators.map((collaborator) => ({
      id: collaborator.id,
      projectId: collaborator.projectId,
      collaboratorRole: collaborator.collaboratorRole,
      purpose: collaborator.purpose,
      scopes: [...collaborator.scopes],
      expiresAt: collaborator.expiresAt,
      revokedAt: collaborator.revokedAt,
    })),
    benefits: workspace.benefits.map((benefit) => ({
      id: benefit.id,
      stakeholderType: benefit.stakeholderType,
      stakeholderName: benefit.stakeholderName,
      expectedBenefitCategory: benefit.expectedBenefitCategory,
      expectedCostCents: benefit.expectedCostCents,
      fundingContributionCents: benefit.fundingContributionCents,
      evidenceLevel: benefit.evidenceLevel,
      timeframe: benefit.timeframe,
      uncertainty: benefit.uncertainty,
      commitmentState: benefit.commitmentState,
      realisedResponseState: benefit.realisedResponseState,
    })),
  };
}

export function presentFundingProjectScopedWorkspace(
  workspace: FundingProjectScopedWorkspace,
) {
  return {
    project: {
      id: workspace.project.id,
      name: workspace.project.name,
      description: workspace.project.description,
      status: workspace.project.status,
    },
    milestones: workspace.milestones.map((milestone) => ({
      id: milestone.id,
      code: milestone.code,
      name: milestone.name,
      position: milestone.position,
      dueOn: milestone.dueOn,
      evidenceRequirement: milestone.evidenceRequirement,
      paymentEligible: milestone.paymentEligible,
      plannedPaymentCents: milestone.plannedPaymentCents,
    })),
    dependencies: workspace.dependencies.map((dependency) => ({
      milestoneId: dependency.milestoneId,
      dependsOnMilestoneId: dependency.dependsOnMilestoneId,
    })),
    milestoneEvents: workspace.milestoneEvents.map((event) => ({
      id: event.id,
      milestoneId: event.milestoneId,
      eventType: event.eventType,
      note: event.note,
      decidedBy: event.decidedBy,
      occurredAt: event.occurredAt,
      supersedesEventId: event.supersedesEventId,
    })),
    capitalStacks: workspace.capitalStacks.map((stack) => ({
      id: stack.id,
      name: stack.name,
      projectCostCents: stack.projectCostCents,
      currency: stack.currency,
      state: stack.state,
      decisionBoundary: stack.decisionBoundary,
    })),
    benefits: workspace.benefits.map((benefit) => ({
      id: benefit.id,
      stakeholderType: benefit.stakeholderType,
      stakeholderName: benefit.stakeholderName,
      expectedBenefitCategory: benefit.expectedBenefitCategory,
      expectedCostCents: benefit.expectedCostCents,
      fundingContributionCents: benefit.fundingContributionCents,
      evidenceLevel: benefit.evidenceLevel,
      source: benefit.source,
      timeframe: benefit.timeframe,
      uncertainty: benefit.uncertainty,
      commitmentState: benefit.commitmentState,
      realisedResponseState: benefit.realisedResponseState,
      correctionOfId: benefit.correctionOfId,
    })),
    access: workspace.access,
    doctrine: workspace.doctrine,
  };
}

import { getProductionDatabase } from "@/db/production/client";
import { ResiliencePlanningService } from "@/lib/production/resilience-planning-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type ResiliencePlanningWorkspace = Awaited<
  ReturnType<ResiliencePlanningService["getWorkspace"]>
>;

export function getProductionResiliencePlanningService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new ResiliencePlanningService(database);
}

export function presentResiliencePlanningWorkspace(
  workspace: ResiliencePlanningWorkspace,
) {
  return {
    profiles: workspace.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
    })),
    profileVersions: workspace.profileVersions.map((version) => ({
      id: version.id,
      profileId: version.profileId,
      versionNumber: version.versionNumber,
      limitations: version.limitations,
    })),
    criteria: workspace.criteria.map((criterion) => ({
      id: criterion.id,
      profileVersionId: criterion.profileVersionId,
      code: criterion.code,
      title: criterion.title,
      targetLevel: criterion.targetLevel,
      evidenceLevel: criterion.evidenceLevel,
      requirementText: criterion.requirementText,
      verificationMethod: criterion.verificationMethod,
    })),
    applicability: workspace.applicability.map((rule) => ({
      profileVersionId: rule.profileVersionId,
      field: rule.field,
      operator: rule.operator,
      expectedValues: [...rule.expectedValues],
    })),
    interventions: workspace.interventions.map((intervention) => ({
      id: intervention.id,
      name: intervention.name,
      category: intervention.category,
      description: intervention.description,
    })),
    interventionVersions: workspace.interventionVersions.map((version) => ({
      id: version.id,
      interventionId: version.interventionId,
      versionNumber: version.versionNumber,
      technicalSpecification: version.technicalSpecification,
      evidenceLevel: version.evidenceLevel,
      typicalCostLowCents: version.typicalCostLowCents,
      typicalCostHighCents: version.typicalCostHighCents,
      typicalDurationDays: version.typicalDurationDays,
      maintenanceRequirements: [...version.maintenanceRequirements],
      benefitBoundary: version.benefitBoundary,
    })),
    interventionReviews: workspace.interventionReviews.map((review) => ({
      decision: review.decision,
    })),
    assessments: workspace.assessments.map((assessment) => ({
      id: assessment.id,
    })),
    gaps: workspace.gaps.map((gap) => ({
      id: gap.id,
      baselineAssessmentId: gap.baselineAssessmentId,
      criterionId: gap.criterionId,
      state: gap.state,
      observedCondition: gap.observedCondition,
    })),
    scenarios: workspace.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      totalCostLowCents: scenario.totalCostLowCents,
      totalCostHighCents: scenario.totalCostHighCents,
      durationDays: scenario.durationDays,
      dependencies: [...scenario.dependencies],
      maintenanceRequirements: [...scenario.maintenanceRequirements],
      fundingEligibilityState: scenario.fundingEligibilityState,
      modeledBenefitState: scenario.modeledBenefitState,
      insurerTreatmentState: scenario.insurerTreatmentState,
      rationale: scenario.rationale,
      assumptions: [...scenario.assumptions],
    })),
  };
}

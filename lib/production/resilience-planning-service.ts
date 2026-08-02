import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  appendAudit,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export type EvidenceLevel =
  | "self_attested"
  | "documented"
  | "professional_observation"
  | "independent_verification"
  | "jurisdictional_record"
  | "programme_recognition"
  | "insurer_acknowledgement"
  | "modeled_analysis"
  | "measured_outcome";

export type CreateTargetProfileVersionInput = {
  profileId?: string;
  canonicalKey?: string;
  name?: string;
  description?: string;
  jurisdiction?: string;
  peril?: string;
  propertyClass?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  changeSummary: string;
  limitations: string;
  supersedesVersionId?: string;
  sourceVersionIds: string[];
  criteria: Array<{
    code: string;
    title: string;
    targetLevel: "minimum" | "preferred";
    evidenceLevel: EvidenceLevel;
    requirementText: string;
    verificationMethod: string;
  }>;
  applicability: Array<{
    field: string;
    operator: "equals" | "includes" | "one_of";
    expectedValues: string[];
  }>;
};

export type CreateInterventionVersionInput = {
  interventionId?: string;
  canonicalKey?: string;
  name?: string;
  category?: string;
  description?: string;
  technicalSpecification: string;
  evidenceLevel: EvidenceLevel;
  typicalCostLowCents: number;
  typicalCostHighCents: number;
  typicalDurationDays: number;
  dependencies: string[];
  maintenanceRequirements: string[];
  benefitStatement: string;
  benefitBoundary: string;
  supersedesVersionId?: string;
};

export type CreateCapitalPlanInput = {
  propertyId: string;
  profileVersionId: string;
  name: string;
  propertyFacts: Record<string, string | string[]>;
  gaps: Array<{
    criterionId: string;
    state: "satisfied" | "gap" | "insufficient_evidence" | "not_applicable";
    observedCondition: string;
    evidenceItemId?: string;
  }>;
  scenarios: Array<{
    name: string;
    project: {
      name: string;
      description: string;
      interventionVersionIds: string[];
    };
    totalCostLowCents: number;
    totalCostHighCents: number;
    durationDays: number;
    dependencies: string[];
    maintenanceRequirements: string[];
    fundingEligibilityState: "unknown" | "potential_candidate" | "not_eligible";
    modeledBenefitState: "unavailable" | "not_requested" | "externally_supplied_unverified";
    insurerTreatmentState: "unverified" | "no_commitment" | "externally_acknowledged";
    rationale: string;
    assumptions: string[];
  }>;
};

export class ResiliencePlanningValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResiliencePlanningValidationError";
  }
}
export class ResiliencePlanningStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResiliencePlanningStateError";
  }
}

const required = (value: string | undefined, label: string) => {
  if (!value?.trim()) throw new ResiliencePlanningValidationError(`${label} is required.`);
  return value.trim();
};
const isoDate = (value: string | undefined, label: string) => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized))
    throw new ResiliencePlanningValidationError(`${label} must be an ISO date.`);
  return normalized;
};
const human = (context: TenantContext, action: string) => {
  if (context.principalType !== "membership")
    throw new ResiliencePlanningStateError(`A human organization member must ${action}.`);
};

export class ResiliencePlanningService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createProfileVersion(context: TenantContext, input: CreateTargetProfileVersionInput) {
    assertAuthorized(context, { action: "create", resource: "target_profile_version", resourceOrganizationId: context.organizationId });
    human(context, "author a target profile version");
    if (!input.criteria.some((item) => item.targetLevel === "minimum") || !input.criteria.some((item) => item.targetLevel === "preferred"))
      throw new ResiliencePlanningValidationError("A profile requires both minimum and preferred criteria.");
    if (!input.applicability.length)
      throw new ResiliencePlanningValidationError("A profile requires explicit applicability rules.");
    if (!input.sourceVersionIds.length)
      throw new ResiliencePlanningValidationError("A profile must pin at least one governed source version.");
    const effectiveFrom = isoDate(input.effectiveFrom, "Effective-from date");
    const effectiveTo = input.effectiveTo ? isoDate(input.effectiveTo, "Effective-to date") : undefined;
    if (effectiveTo && effectiveTo < effectiveFrom)
      throw new ResiliencePlanningValidationError("Effective-to cannot precede effective-from.");

    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const publishedSources = await db.select({ id: schema.governedSourcePublications.sourceVersionId })
        .from(schema.governedSourcePublications)
        .where(and(eq(schema.governedSourcePublications.organizationId, context.organizationId), eq(schema.governedSourcePublications.decision, "published"), inArray(schema.governedSourcePublications.sourceVersionId, input.sourceVersionIds)));
      if (new Set(publishedSources.map((item) => item.id)).size !== new Set(input.sourceVersionIds).size)
        throw new ResiliencePlanningStateError("Every profile source must be an in-tenant, independently reviewed published version.");
      const at = this.clock().toISOString();
      let profileId = input.profileId;
      if (!profileId) {
        profileId = randomUUID();
        await db.insert(schema.targetProfiles).values({
          id: profileId, ...tenantRecord(context, at),
          canonicalKey: required(input.canonicalKey, "Canonical key"),
          name: required(input.name, "Profile name"),
          description: required(input.description, "Profile description"),
          jurisdiction: required(input.jurisdiction, "Jurisdiction"),
          peril: required(input.peril, "Peril"),
          propertyClass: required(input.propertyClass, "Property class"),
        });
      }
      const latest = await db.select({ id: schema.targetProfileVersions.id, versionNumber: schema.targetProfileVersions.versionNumber })
        .from(schema.targetProfileVersions)
        .where(and(eq(schema.targetProfileVersions.organizationId, context.organizationId), eq(schema.targetProfileVersions.profileId, profileId)))
        .orderBy(desc(schema.targetProfileVersions.versionNumber)).limit(1);
      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
      if (versionNumber > 1 && input.supersedesVersionId !== latest[0]?.id)
        throw new ResiliencePlanningValidationError("A successor must reference the immediately prior profile version.");
      if (versionNumber === 1 && input.supersedesVersionId)
        throw new ResiliencePlanningValidationError("An initial profile version cannot supersede another version.");
      const profileVersionId = randomUUID();
      await db.insert(schema.targetProfileVersions).values({
        id: profileVersionId, ...tenantRecord(context, at), profileId, versionNumber,
        effectiveFrom, effectiveTo, status: "draft", authorSubject: context.actorSubject,
        changeSummary: required(input.changeSummary, "Change summary"),
        limitations: required(input.limitations, "Limitations"),
        recognitionState: "unavailable_no_commitment_registry",
        supersedesVersionId: input.supersedesVersionId,
      });
      await db.insert(schema.targetProfileCriteria).values(input.criteria.map((criterion, index) => ({
        id: randomUUID(), ...tenantRecord(context, at), profileVersionId,
        code: required(criterion.code, "Criterion code"), title: required(criterion.title, "Criterion title"),
        targetLevel: criterion.targetLevel, evidenceLevel: criterion.evidenceLevel,
        requirementText: required(criterion.requirementText, "Requirement text"),
        verificationMethod: required(criterion.verificationMethod, "Verification method"), position: index + 1,
      })));
      await db.insert(schema.targetProfileApplicability).values(input.applicability.map((rule, index) => ({
        id: randomUUID(), ...tenantRecord(context, at), profileVersionId,
        field: required(rule.field, "Applicability field"), operator: rule.operator,
        expectedValues: rule.expectedValues.map((item) => required(item, "Expected value")), position: index + 1,
      })));
      await db.insert(schema.governedSourceDependencies).values(input.sourceVersionIds.map((sourceVersionId) => ({
        id: randomUUID(), ...tenantRecord(context, at), sourceVersionId,
        consumerType: "target_profile_version", consumerId: profileVersionId,
        relationship: "relied_on", rationale: "Exact source version pinned by authored target profile.",
        pinnedAt: at, pinnedBy: context.actorSubject,
      })));
      await appendAudit(db, context, { action: "target_profile.version_created", resourceType: "target_profile_version", resourceId: profileVersionId, detail: { profileId, versionNumber, sourceVersionIds: input.sourceVersionIds, operative: false }, occurredAt: at });
      return { profileId, profileVersionId, versionNumber, operative: false as const };
    });
  }

  async reviewProfileVersion(context: TenantContext, input: { profileVersionId: string; decision: "approved" | "changes_requested"; note: string; sourcePinsChecked: boolean }) {
    assertAuthorized(context, { action: "create", resource: "target_profile_review", resourceOrganizationId: context.organizationId });
    human(context, "review a target profile version");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const rows = await db.select().from(schema.targetProfileVersions).where(and(eq(schema.targetProfileVersions.id, input.profileVersionId), eq(schema.targetProfileVersions.organizationId, context.organizationId))).limit(1);
      if (!rows[0]) throw new TenantResourceNotFoundError("Target profile version");
      if (rows[0].authorSubject === context.actorSubject) throw new ResiliencePlanningStateError("A profile author cannot review the same version.");
      if (input.decision === "approved" && !input.sourcePinsChecked) throw new ResiliencePlanningStateError("Approval requires exact source-pin review.");
      const at = this.clock().toISOString(); const reviewId = randomUUID();
      await db.insert(schema.targetProfileReviews).values({ id: reviewId, ...tenantRecord(context, at), profileVersionId: input.profileVersionId, decision: input.decision, reviewerSubject: context.actorSubject, note: required(input.note, "Review note"), sourcePinsChecked: input.sourcePinsChecked, reviewedAt: at });
      await appendAudit(db, context, { action: `target_profile.version_${input.decision}`, resourceType: "target_profile_version", resourceId: input.profileVersionId, detail: { reviewId }, occurredAt: at });
      return { reviewId, decision: input.decision, reviewedAt: at };
    });
  }

  async publishProfileVersion(context: TenantContext, input: { profileVersionId: string; decision: "published" | "rejected"; note: string }) {
    assertAuthorized(context, { action: "create", resource: "target_profile_publication", resourceOrganizationId: context.organizationId });
    human(context, "publish a target profile version");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const versions = await db.select().from(schema.targetProfileVersions).where(and(eq(schema.targetProfileVersions.id, input.profileVersionId), eq(schema.targetProfileVersions.organizationId, context.organizationId))).limit(1);
      if (!versions[0]) throw new TenantResourceNotFoundError("Target profile version");
      if (versions[0].authorSubject === context.actorSubject) throw new ResiliencePlanningStateError("A profile author cannot publish the same version.");
      const reviews = await db.select().from(schema.targetProfileReviews).where(and(eq(schema.targetProfileReviews.organizationId, context.organizationId), eq(schema.targetProfileReviews.profileVersionId, input.profileVersionId), eq(schema.targetProfileReviews.decision, "approved"))).limit(1);
      if (input.decision === "published" && !reviews[0]) throw new ResiliencePlanningStateError("Publication requires an independent approved review.");
      if (input.decision === "published" && reviews[0]?.reviewerSubject === context.actorSubject) throw new ResiliencePlanningStateError("Review and publication require separate human decisions.");
      const at = this.clock().toISOString(); const publicationId = randomUUID();
      await db.insert(schema.targetProfilePublications).values({ id: publicationId, ...tenantRecord(context, at), profileVersionId: input.profileVersionId, decision: input.decision, publisherSubject: context.actorSubject, note: required(input.note, "Publication note"), publishedAt: at });
      await appendAudit(db, context, { action: `target_profile.version_${input.decision}`, resourceType: "target_profile_version", resourceId: input.profileVersionId, detail: { publicationId, recognitionState: "unavailable_no_commitment_registry" }, occurredAt: at });
      return { publicationId, decision: input.decision, publishedAt: at, recognitionState: "unavailable_no_commitment_registry" as const };
    });
  }

  async createInterventionVersion(context: TenantContext, input: CreateInterventionVersionInput) {
    assertAuthorized(context, { action: "create", resource: "intervention_version", resourceOrganizationId: context.organizationId });
    human(context, "author an intervention version");
    if (input.typicalCostLowCents < 0 || input.typicalCostHighCents < input.typicalCostLowCents || input.typicalDurationDays < 0)
      throw new ResiliencePlanningValidationError("Intervention cost and duration ranges must be transparent and non-negative.");
    if (!input.maintenanceRequirements.length) throw new ResiliencePlanningValidationError("An intervention requires explicit maintenance requirements.");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike; const at = this.clock().toISOString();
      let interventionId = input.interventionId;
      if (!interventionId) {
        interventionId = randomUUID();
        await db.insert(schema.interventions).values({ id: interventionId, ...tenantRecord(context, at), canonicalKey: required(input.canonicalKey, "Canonical key"), name: required(input.name, "Intervention name"), category: required(input.category, "Category"), description: required(input.description, "Description") });
      }
      const latest = await db.select({ id: schema.interventionVersions.id, versionNumber: schema.interventionVersions.versionNumber }).from(schema.interventionVersions).where(and(eq(schema.interventionVersions.organizationId, context.organizationId), eq(schema.interventionVersions.interventionId, interventionId))).orderBy(desc(schema.interventionVersions.versionNumber)).limit(1);
      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
      if (versionNumber > 1 && input.supersedesVersionId !== latest[0]?.id) throw new ResiliencePlanningValidationError("An intervention successor must reference the immediately prior version.");
      if (versionNumber === 1 && input.supersedesVersionId) throw new ResiliencePlanningValidationError("An initial intervention cannot supersede another version.");
      const interventionVersionId = randomUUID();
      await db.insert(schema.interventionVersions).values({ id: interventionVersionId, ...tenantRecord(context, at), interventionId, versionNumber, status: "draft", technicalSpecification: required(input.technicalSpecification, "Technical specification"), evidenceLevel: input.evidenceLevel, typicalCostLowCents: input.typicalCostLowCents, typicalCostHighCents: input.typicalCostHighCents, typicalDurationDays: input.typicalDurationDays, dependencies: input.dependencies, maintenanceRequirements: input.maintenanceRequirements, benefitStatement: required(input.benefitStatement, "Benefit statement"), benefitBoundary: required(input.benefitBoundary, "Benefit boundary"), authorSubject: context.actorSubject, supersedesVersionId: input.supersedesVersionId });
      await appendAudit(db, context, { action: "intervention.version_created", resourceType: "intervention_version", resourceId: interventionVersionId, detail: { interventionId, versionNumber, operative: false }, occurredAt: at });
      return { interventionId, interventionVersionId, versionNumber, operative: false as const };
    });
  }

  async reviewInterventionVersion(context: TenantContext, input: { interventionVersionId: string; decision: "approved" | "changes_requested"; note: string }) {
    assertAuthorized(context, { action: "create", resource: "intervention_version_review", resourceOrganizationId: context.organizationId });
    human(context, "review an intervention version");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const versions = await db.select().from(schema.interventionVersions).where(and(eq(schema.interventionVersions.id, input.interventionVersionId), eq(schema.interventionVersions.organizationId, context.organizationId))).limit(1);
      if (!versions[0]) throw new TenantResourceNotFoundError("Intervention version");
      if (versions[0].authorSubject === context.actorSubject) throw new ResiliencePlanningStateError("An intervention author cannot review the same version.");
      const at = this.clock().toISOString(); const reviewId = randomUUID();
      await db.insert(schema.interventionVersionReviews).values({ id: reviewId, ...tenantRecord(context, at), interventionVersionId: input.interventionVersionId, decision: input.decision, reviewerSubject: context.actorSubject, note: required(input.note, "Review note"), reviewedAt: at });
      await appendAudit(db, context, { action: `intervention.version_${input.decision}`, resourceType: "intervention_version", resourceId: input.interventionVersionId, detail: { reviewId }, occurredAt: at });
      return { reviewId, decision: input.decision, reviewedAt: at };
    });
  }

  async createCapitalPlan(context: TenantContext, input: CreateCapitalPlanInput) {
    assertAuthorized(context, { action: "create", resource: "capital_plan", resourceOrganizationId: context.organizationId });
    human(context, "create a capital plan");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const [properties, publications, rules, criteria] = await Promise.all([
        db.select().from(schema.properties).where(and(eq(schema.properties.id, input.propertyId), eq(schema.properties.organizationId, context.organizationId))).limit(1),
        db.select().from(schema.targetProfilePublications).where(and(eq(schema.targetProfilePublications.profileVersionId, input.profileVersionId), eq(schema.targetProfilePublications.organizationId, context.organizationId), eq(schema.targetProfilePublications.decision, "published"))).limit(1),
        db.select().from(schema.targetProfileApplicability).where(and(eq(schema.targetProfileApplicability.profileVersionId, input.profileVersionId), eq(schema.targetProfileApplicability.organizationId, context.organizationId))).orderBy(asc(schema.targetProfileApplicability.position)),
        db.select().from(schema.targetProfileCriteria).where(and(eq(schema.targetProfileCriteria.profileVersionId, input.profileVersionId), eq(schema.targetProfileCriteria.organizationId, context.organizationId))),
      ]);
      if (!properties[0]) throw new TenantResourceNotFoundError("Property");
      if (!publications[0]) throw new ResiliencePlanningStateError("Capital planning requires a published, independently reviewed target profile.");
      const reasons: string[] = [];
      let applicabilityState: "applicable" | "inapplicable" | "insufficient_property_data" = "applicable";
      for (const rule of rules) {
        const fact = input.propertyFacts[rule.field];
        if (fact === undefined) { applicabilityState = "insufficient_property_data"; reasons.push(`${rule.field}: property fact unavailable`); continue; }
        const values = Array.isArray(fact) ? fact : [fact];
        const matches = rule.operator === "includes" ? rule.expectedValues.every((value) => values.includes(value)) : values.some((value) => rule.expectedValues.includes(value));
        reasons.push(`${rule.field}: ${matches ? "matched" : "did not match"} [${rule.expectedValues.join(", ")}]`);
        if (!matches) applicabilityState = "inapplicable";
      }
      const criterionIds = new Set(criteria.map((item) => item.id));
      if (input.gaps.some((gap) => !criterionIds.has(gap.criterionId))) throw new ResiliencePlanningValidationError("Every gap must reference a criterion in the selected profile version.");
      const suppliedCriterionIds = new Set(input.gaps.map((gap) => gap.criterionId));
      if (applicabilityState === "applicable" && (suppliedCriterionIds.size !== input.gaps.length || suppliedCriterionIds.size !== criterionIds.size))
        throw new ResiliencePlanningValidationError("An applicable assessment requires exactly one explicit state for every profile criterion.");
      const effectiveGaps = applicabilityState === "applicable" ? input.gaps : [];
      const planningState = applicabilityState === "inapplicable" ? "inapplicable" : applicabilityState === "insufficient_property_data" || effectiveGaps.some((gap) => gap.state === "insufficient_evidence") ? "insufficient_evidence" : input.scenarios.length ? "options_available" : "no_attractive_path";
      const at = this.clock().toISOString(); const baselineAssessmentId = randomUUID();
      await db.insert(schema.baselineAssessments).values({ id: baselineAssessmentId, ...tenantRecord(context, at), propertyId: input.propertyId, profileVersionId: input.profileVersionId, applicabilityState, applicabilityReasons: reasons, assessedAt: at, assessedBy: context.actorSubject });
      if (effectiveGaps.length) await db.insert(schema.baselineGaps).values(effectiveGaps.map((gap) => ({ id: randomUUID(), ...tenantRecord(context, at), baselineAssessmentId, criterionId: gap.criterionId, state: gap.state, observedCondition: required(gap.observedCondition, "Observed condition"), evidenceItemId: gap.evidenceItemId })));
      const capitalPlanId = randomUUID();
      await db.insert(schema.capitalPlans).values({ id: capitalPlanId, ...tenantRecord(context, at), propertyId: input.propertyId, baselineAssessmentId, name: required(input.name, "Capital plan name"), planningState, decisionBoundary: "Planning aid only. Costs are transparent ranges; funding, modeled benefit, insurer treatment, renewal, pricing, and acceptance remain unverified unless separately evidenced." });
      if (planningState === "options_available") for (const [index, scenario] of input.scenarios.entries()) {
        if (scenario.totalCostLowCents < 0 || scenario.totalCostHighCents < scenario.totalCostLowCents || scenario.durationDays < 0) throw new ResiliencePlanningValidationError("Scenario cost and duration ranges must be transparent and non-negative.");
        const reviewed = scenario.project.interventionVersionIds.length ? await db.select({ id: schema.interventionVersionReviews.interventionVersionId }).from(schema.interventionVersionReviews).where(and(eq(schema.interventionVersionReviews.organizationId, context.organizationId), eq(schema.interventionVersionReviews.decision, "approved"), inArray(schema.interventionVersionReviews.interventionVersionId, scenario.project.interventionVersionIds))) : [];
        if (reviewed.length !== new Set(scenario.project.interventionVersionIds).size) throw new ResiliencePlanningStateError("Every scenario intervention must have an independent approved review.");
        const projectId = randomUUID();
        await db.insert(schema.resilienceProjects).values({ id: projectId, ...tenantRecord(context, at), propertyId: input.propertyId, name: required(scenario.project.name, "Project name"), description: required(scenario.project.description, "Project description"), status: "candidate" });
        if (scenario.project.interventionVersionIds.length) await db.insert(schema.projectInterventions).values(scenario.project.interventionVersionIds.map((interventionVersionId) => ({ id: randomUUID(), ...tenantRecord(context, at), projectId, interventionVersionId, rationale: "Reviewed intervention selected to address an explicit baseline gap." })));
        const scenarioId = randomUUID();
        await db.insert(schema.capitalPlanScenarios).values({ id: scenarioId, ...tenantRecord(context, at), capitalPlanId, name: required(scenario.name, "Scenario name"), totalCostLowCents: scenario.totalCostLowCents, totalCostHighCents: scenario.totalCostHighCents, durationDays: scenario.durationDays, dependencies: scenario.dependencies, maintenanceRequirements: scenario.maintenanceRequirements, fundingEligibilityState: scenario.fundingEligibilityState, modeledBenefitState: scenario.modeledBenefitState, insurerTreatmentState: scenario.insurerTreatmentState, rationale: required(scenario.rationale, "Scenario rationale"), assumptions: scenario.assumptions, position: index + 1 });
        await db.insert(schema.capitalPlanScenarioProjects).values({ id: randomUUID(), ...tenantRecord(context, at), scenarioId, projectId, position: 1 });
      }
      await appendAudit(db, context, { action: "capital_plan.created", resourceType: "capital_plan", resourceId: capitalPlanId, detail: { baselineAssessmentId, profileVersionId: input.profileVersionId, applicabilityState, planningState, scenarioCount: planningState === "options_available" ? input.scenarios.length : 0 }, occurredAt: at });
      return { capitalPlanId, baselineAssessmentId, applicabilityState, planningState };
    });
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, { action: "read", resource: "capital_plan", resourceOrganizationId: context.organizationId });
    const organization = context.organizationId;
    const [profiles, profileVersions, criteria, applicability, profileReviews, profilePublications, interventions, interventionVersions, interventionReviews, assessments, gaps, projects, projectLinks, plans, scenarios, scenarioProjects] = await Promise.all([
      this.database.select().from(schema.targetProfiles).where(eq(schema.targetProfiles.organizationId, organization)),
      this.database.select().from(schema.targetProfileVersions).where(eq(schema.targetProfileVersions.organizationId, organization)).orderBy(desc(schema.targetProfileVersions.createdAt)),
      this.database.select().from(schema.targetProfileCriteria).where(eq(schema.targetProfileCriteria.organizationId, organization)).orderBy(asc(schema.targetProfileCriteria.position)),
      this.database.select().from(schema.targetProfileApplicability).where(eq(schema.targetProfileApplicability.organizationId, organization)).orderBy(asc(schema.targetProfileApplicability.position)),
      this.database.select().from(schema.targetProfileReviews).where(eq(schema.targetProfileReviews.organizationId, organization)),
      this.database.select().from(schema.targetProfilePublications).where(eq(schema.targetProfilePublications.organizationId, organization)),
      this.database.select().from(schema.interventions).where(eq(schema.interventions.organizationId, organization)),
      this.database.select().from(schema.interventionVersions).where(eq(schema.interventionVersions.organizationId, organization)),
      this.database.select().from(schema.interventionVersionReviews).where(eq(schema.interventionVersionReviews.organizationId, organization)),
      this.database.select().from(schema.baselineAssessments).where(eq(schema.baselineAssessments.organizationId, organization)),
      this.database.select().from(schema.baselineGaps).where(eq(schema.baselineGaps.organizationId, organization)),
      this.database.select().from(schema.resilienceProjects).where(eq(schema.resilienceProjects.organizationId, organization)),
      this.database.select().from(schema.projectInterventions).where(eq(schema.projectInterventions.organizationId, organization)),
      this.database.select().from(schema.capitalPlans).where(eq(schema.capitalPlans.organizationId, organization)),
      this.database.select().from(schema.capitalPlanScenarios).where(eq(schema.capitalPlanScenarios.organizationId, organization)).orderBy(asc(schema.capitalPlanScenarios.position)),
      this.database.select().from(schema.capitalPlanScenarioProjects).where(eq(schema.capitalPlanScenarioProjects.organizationId, organization)),
    ]);
    return { profiles, profileVersions, criteria, applicability, profileReviews, profilePublications, interventions, interventionVersions, interventionReviews, assessments, gaps, projects, projectLinks, plans, scenarios, scenarioProjects, doctrine: { riskScoresProduced: false, financialReturnModeled: false, insurerAcceptancePredicted: false, humanReviewRequired: true } };
  }
}

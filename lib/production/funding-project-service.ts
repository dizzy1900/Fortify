import { and, asc, desc, eq } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  appendAudit,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

type Fact = string | string[] | number;
type RuleOperator = "equals" | "one_of" | "includes" | "at_least" | "at_most";
type EvidenceLevel =
  | "self_attested"
  | "documented"
  | "professional_observation"
  | "independent_verification"
  | "jurisdictional_record"
  | "programme_recognition"
  | "insurer_acknowledgement"
  | "modeled_analysis"
  | "measured_outcome";

export type CreateFundingProgrammeVersionInput = {
  programmeId?: string;
  canonicalKey?: string;
  name?: string;
  sponsorName?: string;
  programmeType?: "public_grant" | "insurer" | "reinsurer" | "lender" | "philanthropic" | "local_government" | "mixed";
  description?: string;
  governedSourceVersionId: string;
  targetProfileVersionId?: string;
  jurisdiction: string;
  hazard: string;
  propertyClasses: string[];
  applicationOpensOn: string;
  applicationClosesOn: string;
  maximumAwardCents: number;
  maximumCostShareBps: number;
  currency?: string;
  evidenceRequirements: string[];
  paymentConditions: string[];
  maintenanceObligations: string[];
  limitations: string;
  supersedesVersionId?: string;
  rules: Array<{ code: string; field: string; operator: RuleOperator; expectedValues: string[]; required?: boolean }>;
};

export type CapitalStackInput = {
  projectId: string;
  capitalPlanScenarioId?: string;
  name: string;
  projectCostCents: number;
  currency?: string;
  contributions: Array<{
    programmeVersionId?: string;
    contributionType: "owner" | "grant" | "financing" | "insurer" | "reinsurer" | "local_government" | "philanthropic";
    contributorName: string;
    sourceReference: string;
    amountCents: number;
    purpose: string;
  }>;
};

export type ProjectExecutionInput = {
  projectId: string;
  milestones: Array<{
    code: string;
    name: string;
    dueOn?: string;
    evidenceRequirement: string;
    paymentEligible: boolean;
    plannedPaymentCents: number;
    dependsOnCodes?: string[];
  }>;
  collaborators: Array<{
    externalPrincipalId: string;
    collaboratorRole: "property_manager" | "board_contributor" | "contractor";
    purpose: string;
    scopes: string[];
    dueOn?: string;
    expiresAt: string;
  }>;
  benefits: Array<{
    stakeholderType: string;
    stakeholderName: string;
    expectedBenefitCategory: string;
    expectedCostCents: number;
    fundingContributionCents: number;
    evidenceLevel: EvidenceLevel;
    source: string;
    timeframe: string;
    uncertainty: string;
    commitmentState: "none" | "proposed" | "approved" | "cancelled";
    realisedResponseState?: "not_observed" | "recorded" | "corrected";
    correctionOfId?: string;
  }>;
};

export class FundingProjectValidationError extends Error {
  constructor(message: string) { super(message); this.name = "FundingProjectValidationError"; }
}
export class FundingProjectStateError extends Error {
  constructor(message: string) { super(message); this.name = "FundingProjectStateError"; }
}

const required = (value: string | undefined, label: string) => {
  if (!value?.trim()) throw new FundingProjectValidationError(`${label} is required.`);
  return value.trim();
};
const isoDate = (value: string | undefined, label: string) => {
  const normalized = required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new FundingProjectValidationError(`${label} must be an ISO date.`);
  return normalized;
};
const human = (context: TenantContext, action: string) => {
  if (context.principalType !== "membership") throw new FundingProjectStateError(`A human organization member must ${action}.`);
};
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const normalized = (value: string) => value.trim().toLocaleLowerCase("en-US");

function evaluateRule(rule: { operator: string; expectedValues: string[] }, fact: Fact | undefined) {
  if (fact === undefined) return { state: "insufficient_evidence" as const, reason: "Required fact is unavailable." };
  const expected = rule.expectedValues.map(normalized);
  if (rule.operator === "at_least" || rule.operator === "at_most") {
    const actual = typeof fact === "number" ? fact : Number(fact);
    const boundary = Number(rule.expectedValues[0]);
    if (!Number.isFinite(actual) || !Number.isFinite(boundary)) return { state: "insufficient_evidence" as const, reason: "A numeric fact and numeric rule boundary are required." };
    const matched = rule.operator === "at_least" ? actual >= boundary : actual <= boundary;
    return { state: matched ? "matched" as const : "not_matched" as const, reason: `${actual} ${matched ? "meets" : "does not meet"} ${rule.operator.replace("_", " ")} ${boundary}.` };
  }
  const actual = Array.isArray(fact) ? fact.map(normalized) : [normalized(String(fact))];
  const matched = rule.operator === "includes"
    ? expected.every((item) => actual.includes(item))
    : rule.operator === "equals"
      ? actual.length === 1 && actual[0] === expected[0]
      : actual.some((item) => expected.includes(item));
  return { state: matched ? "matched" as const : "not_matched" as const, reason: matched ? "Fact matched the published rule." : "Fact did not match the published rule." };
}

const contributorScopeAllowlist: Record<ProjectExecutionInput["collaborators"][number]["collaboratorRole"], ReadonlySet<string>> = {
  property_manager: new Set(["resilience_project:read", "project_milestone:read", "project_milestone_event:read", "project_milestone_event:create", "stakeholder_benefit_ledger_entry:read"]),
  board_contributor: new Set(["resilience_project:read", "capital_stack:read", "capital_stack_contribution:read", "funding_commitment:read", "project_milestone:read", "project_milestone_event:read", "project_milestone_event:create", "stakeholder_benefit_ledger_entry:read"]),
  contractor: new Set(["resilience_project:read", "project_intervention:read", "project_milestone:read", "project_milestone_event:read", "project_milestone_event:create"]),
};

export class FundingProjectService {
  constructor(private readonly database: ProductionDatabaseLike, private readonly clock: () => Date = () => new Date()) {}

  async createProgrammeVersion(context: TenantContext, input: CreateFundingProgrammeVersionInput) {
    assertAuthorized(context, { action: "create", resource: "funding_programme_version", resourceOrganizationId: context.organizationId });
    human(context, "author a funding programme version");
    const opens = isoDate(input.applicationOpensOn, "Application open date");
    const closes = isoDate(input.applicationClosesOn, "Application close date");
    if (closes < opens) throw new FundingProjectValidationError("Application close date cannot precede the open date.");
    if (!Number.isInteger(input.maximumAwardCents) || input.maximumAwardCents < 0) throw new FundingProjectValidationError("Maximum award must be a non-negative integer number of cents.");
    if (!Number.isInteger(input.maximumCostShareBps) || input.maximumCostShareBps < 0 || input.maximumCostShareBps > 10_000) throw new FundingProjectValidationError("Maximum cost share must be between 0 and 10,000 basis points.");
    if (!input.rules.length) throw new FundingProjectValidationError("A programme version requires deterministic eligibility rules.");
    if (!input.evidenceRequirements.length || !input.paymentConditions.length) throw new FundingProjectValidationError("Evidence requirements and payment conditions must remain explicit.");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const source = await db.select({ id: schema.governedSourcePublications.sourceVersionId }).from(schema.governedSourcePublications)
        .where(and(eq(schema.governedSourcePublications.organizationId, context.organizationId), eq(schema.governedSourcePublications.sourceVersionId, input.governedSourceVersionId), eq(schema.governedSourcePublications.decision, "published"))).limit(1);
      if (!source[0]) throw new FundingProjectStateError("A funding programme must pin an in-tenant, independently reviewed published source version.");
      if (input.targetProfileVersionId) {
        const profile = await db.select({ id: schema.targetProfilePublications.profileVersionId }).from(schema.targetProfilePublications)
          .where(and(eq(schema.targetProfilePublications.organizationId, context.organizationId), eq(schema.targetProfilePublications.profileVersionId, input.targetProfileVersionId), eq(schema.targetProfilePublications.decision, "published"))).limit(1);
        if (!profile[0]) throw new FundingProjectStateError("A linked target profile must be independently reviewed and published in the active tenant.");
      }
      const at = this.clock().toISOString();
      let programmeId = input.programmeId;
      if (!programmeId) {
        programmeId = randomUUID();
        await db.insert(schema.fundingProgrammes).values({ id: programmeId, ...tenantRecord(context, at), canonicalKey: required(input.canonicalKey, "Canonical key"), name: required(input.name, "Programme name"), sponsorName: required(input.sponsorName, "Sponsor name"), programmeType: input.programmeType ?? "mixed", description: required(input.description, "Programme description") });
      }
      const latest = await db.select({ id: schema.fundingProgrammeVersions.id, versionNumber: schema.fundingProgrammeVersions.versionNumber }).from(schema.fundingProgrammeVersions)
        .where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.programmeId, programmeId))).orderBy(desc(schema.fundingProgrammeVersions.versionNumber)).limit(1);
      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
      if (versionNumber > 1 && input.supersedesVersionId !== latest[0]?.id) throw new FundingProjectValidationError("A programme successor must reference the immediately prior version.");
      if (versionNumber === 1 && input.supersedesVersionId) throw new FundingProjectValidationError("An initial programme version cannot supersede another version.");
      const programmeVersionId = randomUUID();
      await db.insert(schema.fundingProgrammeVersions).values({ id: programmeVersionId, ...tenantRecord(context, at), programmeId, versionNumber, governedSourceVersionId: input.governedSourceVersionId, targetProfileVersionId: input.targetProfileVersionId, jurisdiction: required(input.jurisdiction, "Jurisdiction"), hazard: required(input.hazard, "Hazard"), propertyClasses: input.propertyClasses.map((item) => required(item, "Property class")), applicationOpensOn: opens, applicationClosesOn: closes, maximumAwardCents: input.maximumAwardCents, maximumCostShareBps: input.maximumCostShareBps, currency: input.currency ?? "USD", evidenceRequirements: input.evidenceRequirements.map((item) => required(item, "Evidence requirement")), paymentConditions: input.paymentConditions.map((item) => required(item, "Payment condition")), maintenanceObligations: input.maintenanceObligations.map((item) => required(item, "Maintenance obligation")), limitations: required(input.limitations, "Limitations"), authorSubject: context.actorSubject, supersedesVersionId: input.supersedesVersionId });
      await db.insert(schema.fundingEligibilityRules).values(input.rules.map((rule, index) => ({ id: randomUUID(), ...tenantRecord(context, at), programmeVersionId, code: required(rule.code, "Rule code"), field: required(rule.field, "Rule field"), operator: rule.operator, expectedValues: rule.expectedValues.map((item) => required(item, "Expected value")), required: rule.required ?? true, position: index + 1 })));
      await appendAudit(db, context, { action: "funding_programme.version_created", resourceType: "funding_programme_version", resourceId: programmeVersionId, detail: { programmeId, versionNumber, governedSourceVersionId: input.governedSourceVersionId, operative: false }, occurredAt: at });
      return { programmeId, programmeVersionId, versionNumber, operative: false as const };
    });
  }

  async reviewProgrammeVersion(context: TenantContext, input: { programmeVersionId: string; decision: "approved" | "changes_requested"; sourceAndRulesChecked: boolean; note: string }) {
    assertAuthorized(context, { action: "create", resource: "funding_programme_review", resourceOrganizationId: context.organizationId });
    human(context, "review a funding programme version");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const version = await db.select().from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, input.programmeVersionId))).limit(1);
      if (!version[0]) throw new TenantResourceNotFoundError("Funding programme version");
      if (version[0].authorSubject === context.actorSubject) throw new FundingProjectStateError("A programme author cannot review the same version.");
      if (input.decision === "approved" && !input.sourceAndRulesChecked) throw new FundingProjectStateError("Approval requires exact source and deterministic-rule review.");
      const at = this.clock().toISOString(); const reviewId = randomUUID();
      await db.insert(schema.fundingProgrammeReviews).values({ id: reviewId, ...tenantRecord(context, at), programmeVersionId: input.programmeVersionId, decision: input.decision, reviewerSubject: context.actorSubject, sourceAndRulesChecked: input.sourceAndRulesChecked, note: required(input.note, "Review note"), reviewedAt: at });
      await appendAudit(db, context, { action: `funding_programme.version_${input.decision}`, resourceType: "funding_programme_version", resourceId: input.programmeVersionId, detail: { reviewId }, occurredAt: at });
      return { reviewId, decision: input.decision, reviewedAt: at };
    });
  }

  async publishProgrammeVersion(context: TenantContext, input: { programmeVersionId: string; decision: "published" | "rejected"; note: string }) {
    assertAuthorized(context, { action: "create", resource: "funding_programme_publication", resourceOrganizationId: context.organizationId });
    human(context, "publish a funding programme version");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      const version = await db.select().from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, input.programmeVersionId))).limit(1);
      if (!version[0]) throw new TenantResourceNotFoundError("Funding programme version");
      const review = await db.select().from(schema.fundingProgrammeReviews).where(and(eq(schema.fundingProgrammeReviews.organizationId, context.organizationId), eq(schema.fundingProgrammeReviews.programmeVersionId, input.programmeVersionId), eq(schema.fundingProgrammeReviews.decision, "approved"))).limit(1);
      if (input.decision === "published" && !review[0]) throw new FundingProjectStateError("Publication requires an independently approved programme review.");
      if (version[0].authorSubject === context.actorSubject || review[0]?.reviewerSubject === context.actorSubject) throw new FundingProjectStateError("Author, reviewer, and publisher must be separate people.");
      const at = this.clock().toISOString(); const publicationId = randomUUID();
      await db.insert(schema.fundingProgrammePublications).values({ id: publicationId, ...tenantRecord(context, at), programmeVersionId: input.programmeVersionId, decision: input.decision, publisherSubject: context.actorSubject, note: required(input.note, "Publication note"), publishedAt: at });
      await appendAudit(db, context, { action: `funding_programme.version_${input.decision}`, resourceType: "funding_programme_version", resourceId: input.programmeVersionId, detail: { publicationId, fundingDecisionAuthority: false }, occurredAt: at });
      return { publicationId, decision: input.decision, fundingDecisionAuthority: false as const };
    });
  }

  async assessEligibility(context: TenantContext, input: { projectId: string; programmeVersionId: string; facts: Record<string, Fact> }) {
    assertAuthorized(context, { action: "create", resource: "funding_eligibility_assessment", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    const [project, publication, rules] = await Promise.all([
      this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId))).limit(1),
      this.database.select().from(schema.fundingProgrammePublications).where(and(eq(schema.fundingProgrammePublications.organizationId, context.organizationId), eq(schema.fundingProgrammePublications.programmeVersionId, input.programmeVersionId), eq(schema.fundingProgrammePublications.decision, "published"))).limit(1),
      this.database.select().from(schema.fundingEligibilityRules).where(and(eq(schema.fundingEligibilityRules.organizationId, context.organizationId), eq(schema.fundingEligibilityRules.programmeVersionId, input.programmeVersionId))).orderBy(asc(schema.fundingEligibilityRules.position)),
    ]);
    if (!project[0]) throw new TenantResourceNotFoundError("Resilience project");
    if (!publication[0]) throw new FundingProjectStateError("Eligibility can only be evaluated against a published programme version.");
    if (!rules.length) throw new FundingProjectStateError("The published programme has no deterministic eligibility rules.");
    const results = rules.map((rule) => ({ rule, ...evaluateRule(rule, input.facts[rule.field]) }));
    const state = results.some((item) => item.rule.required && item.state === "insufficient_evidence") ? "insufficient_evidence" as const : results.some((item) => item.rule.required && item.state === "not_matched") ? "ineligible" as const : "eligible" as const;
    const reasons = results.map((item) => `${item.rule.code}: ${item.reason}`);
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike; const at = this.clock().toISOString(); const assessmentId = randomUUID();
      await db.insert(schema.fundingEligibilityAssessments).values({ id: assessmentId, ...tenantRecord(context, at), projectId: input.projectId, programmeVersionId: input.programmeVersionId, state, inputFacts: input.facts, inputHash: digest(input.facts), reasons, assessedBy: context.actorSubject, assessedAt: at });
      await db.insert(schema.fundingEligibilityRuleResults).values(results.map((result) => ({ id: randomUUID(), ...tenantRecord(context, at), assessmentId, ruleId: result.rule.id, state: result.state, observedValue: input.facts[result.rule.field] ?? null, reason: result.reason })));
      await appendAudit(db, context, { action: "funding_eligibility.assessed", resourceType: "funding_eligibility_assessment", resourceId: assessmentId, detail: { projectId: input.projectId, programmeVersionId: input.programmeVersionId, state, inputHash: digest(input.facts), financialAward: false }, occurredAt: at });
      return { assessmentId, state, reasons, programmeAwarded: false as const };
    });
  }

  async prepareApplication(context: TenantContext, input: { projectId: string; programmeVersionId: string; eligibilityAssessmentId: string; requestedAmountCents: number; humanConfirmed: boolean }) {
    assertAuthorized(context, { action: "create", resource: "funding_application", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    human(context, "confirm a funding application record");
    if (!input.humanConfirmed) throw new FundingProjectStateError("A human must confirm the requested amount and exact programme version.");
    const [assessment, version] = await Promise.all([
      this.database.select().from(schema.fundingEligibilityAssessments).where(and(eq(schema.fundingEligibilityAssessments.organizationId, context.organizationId), eq(schema.fundingEligibilityAssessments.id, input.eligibilityAssessmentId), eq(schema.fundingEligibilityAssessments.projectId, input.projectId), eq(schema.fundingEligibilityAssessments.programmeVersionId, input.programmeVersionId))).limit(1),
      this.database.select().from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, input.programmeVersionId))).limit(1),
    ]);
    if (!assessment[0] || !version[0]) throw new TenantResourceNotFoundError("Funding eligibility assessment");
    if (assessment[0].state !== "eligible") throw new FundingProjectStateError("An application cannot be prepared from an ineligible or insufficient-evidence assessment.");
    if (!Number.isInteger(input.requestedAmountCents) || input.requestedAmountCents <= 0 || input.requestedAmountCents > version[0].maximumAwardCents) throw new FundingProjectValidationError("Requested amount must be positive and no greater than the published maximum award.");
    const at = this.clock().toISOString(); const applicationId = randomUUID();
    await this.database.insert(schema.fundingApplications).values({ id: applicationId, ...tenantRecord(context, at), projectId: input.projectId, programmeVersionId: input.programmeVersionId, eligibilityAssessmentId: input.eligibilityAssessmentId, requestedAmountCents: input.requestedAmountCents, state: "prepared", humanConfirmedBy: context.actorSubject, preparedAt: at, limitations: "Prepared record only. External submission and sponsor approval are not inferred." });
    await appendAudit(this.database, context, { action: "funding_application.prepared", resourceType: "funding_application", resourceId: applicationId, detail: { projectId: input.projectId, requestedAmountCents: input.requestedAmountCents, submittedExternally: false }, occurredAt: at });
    return { applicationId, state: "prepared" as const, submittedExternally: false as const };
  }

  async createCapitalStack(context: TenantContext, input: CapitalStackInput) {
    assertAuthorized(context, { action: "create", resource: "capital_stack", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    human(context, "create a blended capital stack");
    if (!Number.isInteger(input.projectCostCents) || input.projectCostCents <= 0) throw new FundingProjectValidationError("Project cost must be a positive integer number of cents.");
    if (input.contributions.length < 2) throw new FundingProjectValidationError("A blended capital stack requires at least two contributions.");
    const references = input.contributions.map((item) => required(item.sourceReference, "Source reference"));
    if (new Set(references).size !== references.length) throw new FundingProjectValidationError("Duplicate funding source references are not allowed in one stack.");
    const programmeIds = input.contributions.flatMap((item) => item.programmeVersionId ? [item.programmeVersionId] : []);
    if (new Set(programmeIds).size !== programmeIds.length) throw new FundingProjectValidationError("A programme version cannot fund the same stack twice.");
    const total = input.contributions.reduce((sum, item) => sum + item.amountCents, 0);
    if (input.contributions.some((item) => !Number.isInteger(item.amountCents) || item.amountCents <= 0) || total > input.projectCostCents) throw new FundingProjectValidationError("Contributions must be positive whole cents and cannot exceed project cost.");
    const project = await this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId))).limit(1);
    if (!project[0]) throw new TenantResourceNotFoundError("Resilience project");
    if (input.capitalPlanScenarioId) {
      const scenarioProject = await this.database.select().from(schema.capitalPlanScenarioProjects).where(and(
        eq(schema.capitalPlanScenarioProjects.organizationId, context.organizationId),
        eq(schema.capitalPlanScenarioProjects.scenarioId, input.capitalPlanScenarioId),
        eq(schema.capitalPlanScenarioProjects.projectId, input.projectId),
      )).limit(1);
      if (!scenarioProject[0]) throw new FundingProjectStateError("A capital stack scenario must include the same project.");
    }
    for (const contribution of input.contributions) {
      if (!contribution.programmeVersionId) continue;
      const [version, eligible] = await Promise.all([
        this.database.select().from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, contribution.programmeVersionId))).limit(1),
        this.database.select().from(schema.fundingEligibilityAssessments).where(and(eq(schema.fundingEligibilityAssessments.organizationId, context.organizationId), eq(schema.fundingEligibilityAssessments.projectId, input.projectId), eq(schema.fundingEligibilityAssessments.programmeVersionId, contribution.programmeVersionId), eq(schema.fundingEligibilityAssessments.state, "eligible"))).orderBy(desc(schema.fundingEligibilityAssessments.assessedAt)).limit(1),
      ]);
      if (!version[0] || !eligible[0]) throw new FundingProjectStateError("Programme contributions require a current in-tenant eligible assessment.");
      const share = Math.round((contribution.amountCents * 10_000) / input.projectCostCents);
      if (contribution.amountCents > version[0].maximumAwardCents || share > version[0].maximumCostShareBps) throw new FundingProjectValidationError("A programme contribution exceeds its published award or cost-share limit.");
    }
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike; const at = this.clock().toISOString(); const capitalStackId = randomUUID();
      await db.insert(schema.capitalStacks).values({ id: capitalStackId, ...tenantRecord(context, at), projectId: input.projectId, capitalPlanScenarioId: input.capitalPlanScenarioId, name: required(input.name, "Capital stack name"), projectCostCents: input.projectCostCents, currency: input.currency ?? "USD", state: "proposed", decisionBoundary: "Planning and approval record only. Fortify does not hold, transfer, or disburse customer funds." });
      const contributions = input.contributions.map((item) => ({ id: randomUUID(), ...tenantRecord(context, at), capitalStackId, programmeVersionId: item.programmeVersionId, contributionType: item.contributionType, contributorName: required(item.contributorName, "Contributor name"), sourceReference: required(item.sourceReference, "Source reference"), amountCents: item.amountCents, costShareBps: Math.round((item.amountCents * 10_000) / input.projectCostCents), purpose: required(item.purpose, "Contribution purpose") }));
      await db.insert(schema.capitalStackContributions).values(contributions);
      await appendAudit(db, context, { action: "capital_stack.created", resourceType: "capital_stack", resourceId: capitalStackId, detail: { projectId: input.projectId, projectCostCents: input.projectCostCents, contributionTotalCents: total, contributionCount: contributions.length, movesFunds: false }, occurredAt: at });
      return { capitalStackId, contributionIds: contributions.map((item) => item.id), fundedCents: total, unfundedCents: input.projectCostCents - total, movesFunds: false as const };
    });
  }

  async createCommitment(context: TenantContext, input: { contributionId: string; committedAmountCents: number; terms: string }) {
    assertAuthorized(context, { action: "create", resource: "funding_commitment", resourceOrganizationId: context.organizationId });
    human(context, "propose a funding commitment");
    const contribution = await this.database.select().from(schema.capitalStackContributions).where(and(eq(schema.capitalStackContributions.organizationId, context.organizationId), eq(schema.capitalStackContributions.id, input.contributionId))).limit(1);
    if (!contribution[0]) throw new TenantResourceNotFoundError("Capital stack contribution");
    if (!Number.isInteger(input.committedAmountCents) || input.committedAmountCents <= 0 || input.committedAmountCents > contribution[0].amountCents) throw new FundingProjectValidationError("A commitment must be positive and cannot exceed its contribution.");
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike; const at = this.clock().toISOString(); const commitmentId = randomUUID(); const eventId = randomUUID();
      await db.insert(schema.fundingCommitments).values({ id: commitmentId, ...tenantRecord(context, at), contributionId: input.contributionId, committedAmountCents: input.committedAmountCents, terms: required(input.terms, "Commitment terms"), proposedBy: context.actorSubject, proposedAt: at });
      await db.insert(schema.fundingCommitmentEvents).values({ id: eventId, ...tenantRecord(context, at), commitmentId, eventType: "proposed", effectiveAmountCents: input.committedAmountCents, rationale: "Initial human-authored proposal.", decidedBy: context.actorSubject, occurredAt: at });
      await appendAudit(db, context, { action: "funding_commitment.proposed", resourceType: "funding_commitment", resourceId: commitmentId, detail: { contributionId: input.contributionId, eventId, amountCents: input.committedAmountCents, externalDecisionRecorded: false }, occurredAt: at });
      return { commitmentId, eventId, state: "proposed" as const };
    });
  }

  async recordCommitmentEvent(context: TenantContext, input: { commitmentId: string; eventType: "approved" | "corrected" | "cancelled"; effectiveAmountCents: number; rationale: string; supersedesEventId?: string }) {
    assertAuthorized(context, { action: "create", resource: "funding_commitment_event", resourceOrganizationId: context.organizationId });
    human(context, `${input.eventType} a funding commitment`);
    const [commitment, latest] = await Promise.all([
      this.database.select().from(schema.fundingCommitments).where(and(eq(schema.fundingCommitments.organizationId, context.organizationId), eq(schema.fundingCommitments.id, input.commitmentId))).limit(1),
      this.database.select().from(schema.fundingCommitmentEvents).where(and(eq(schema.fundingCommitmentEvents.organizationId, context.organizationId), eq(schema.fundingCommitmentEvents.commitmentId, input.commitmentId))).orderBy(desc(schema.fundingCommitmentEvents.occurredAt), desc(schema.fundingCommitmentEvents.id)).limit(1),
    ]);
    if (!commitment[0] || !latest[0]) throw new TenantResourceNotFoundError("Funding commitment");
    if (input.eventType === "approved" && latest[0].eventType !== "proposed") throw new FundingProjectStateError("Only a proposed commitment can be approved.");
    if (input.eventType === "approved" && commitment[0].proposedBy === context.actorSubject) throw new FundingProjectStateError("The commitment proposer cannot approve the same commitment.");
    if ((input.eventType === "corrected" || input.eventType === "cancelled") && input.supersedesEventId !== latest[0].id) throw new FundingProjectStateError("A correction or cancellation must supersede the latest commitment event.");
    if (input.eventType === "corrected" && (!Number.isInteger(input.effectiveAmountCents) || input.effectiveAmountCents <= 0 || input.effectiveAmountCents > commitment[0].committedAmountCents)) throw new FundingProjectValidationError("A corrected commitment amount must be positive and cannot exceed the original commitment.");
    if (input.eventType === "cancelled" && input.effectiveAmountCents !== 0) throw new FundingProjectValidationError("A cancelled commitment must have an effective amount of zero.");
    const at = this.clock().toISOString(); const eventId = randomUUID();
    await this.database.insert(schema.fundingCommitmentEvents).values({ id: eventId, ...tenantRecord(context, at), commitmentId: input.commitmentId, eventType: input.eventType, effectiveAmountCents: input.effectiveAmountCents, rationale: required(input.rationale, "Decision rationale"), decidedBy: context.actorSubject, occurredAt: at, supersedesEventId: input.supersedesEventId });
    await appendAudit(this.database, context, { action: `funding_commitment.${input.eventType}`, resourceType: "funding_commitment", resourceId: input.commitmentId, detail: { eventId, supersedesEventId: input.supersedesEventId ?? null, effectiveAmountCents: input.effectiveAmountCents }, occurredAt: at });
    return { eventId, state: input.eventType, effectiveAmountCents: input.effectiveAmountCents };
  }

  async createProjectExecution(context: TenantContext, input: ProjectExecutionInput) {
    assertAuthorized(context, { action: "create", resource: "project_milestone", resourceOrganizationId: context.organizationId, projectId: input.projectId });
    human(context, "create project execution controls");
    const project = await this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId))).limit(1);
    if (!project[0]) throw new TenantResourceNotFoundError("Resilience project");
    if (!input.milestones.length) throw new FundingProjectValidationError("Project execution requires at least one milestone.");
    const codes = input.milestones.map((item) => required(item.code, "Milestone code"));
    if (new Set(codes).size !== codes.length) throw new FundingProjectValidationError("Milestone codes must be unique within a project.");
    input.milestones.forEach((item, index) => {
      if (item.plannedPaymentCents < 0 || !Number.isInteger(item.plannedPaymentCents)) throw new FundingProjectValidationError("Planned milestone payments must be non-negative whole cents.");
      for (const dependency of item.dependsOnCodes ?? []) {
        const dependencyIndex = codes.indexOf(dependency);
        if (dependencyIndex < 0 || dependencyIndex >= index) throw new FundingProjectValidationError("Milestone dependencies must reference an earlier milestone in the same project.");
      }
    });
    for (const collaborator of input.collaborators) {
      const allowed = contributorScopeAllowlist[collaborator.collaboratorRole];
      if (!collaborator.scopes.length || collaborator.scopes.some((scope) => !allowed.has(scope))) throw new FundingProjectValidationError(`The ${collaborator.collaboratorRole} assignment contains an out-of-scope permission.`);
      if (new Date(collaborator.expiresAt).getTime() <= this.clock().getTime()) throw new FundingProjectValidationError("External project access must expire in the future.");
    }
    return this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike; const at = this.clock().toISOString();
      const principals = input.collaborators.length ? await db.select().from(schema.externalPrincipals).where(eq(schema.externalPrincipals.organizationId, context.organizationId)) : [];
      if (input.collaborators.some((item) => !principals.some((principal) => principal.id === item.externalPrincipalId))) throw new TenantResourceNotFoundError("External collaborator");
      const milestones = input.milestones.map((item, index) => ({ id: randomUUID(), code: codes[index], source: item, position: index + 1 }));
      await db.insert(schema.projectMilestones).values(milestones.map((item) => ({ id: item.id, ...tenantRecord(context, at), projectId: input.projectId, code: item.code, name: required(item.source.name, "Milestone name"), position: item.position, dueOn: item.source.dueOn ? isoDate(item.source.dueOn, "Milestone due date") : undefined, evidenceRequirement: required(item.source.evidenceRequirement, "Evidence requirement"), paymentEligible: item.source.paymentEligible, plannedPaymentCents: item.source.plannedPaymentCents })));
      const milestoneByCode = new Map(milestones.map((item) => [item.code, item.id]));
      const dependencies = milestones.flatMap((item) => (item.source.dependsOnCodes ?? []).map((dependency) => ({ id: randomUUID(), ...tenantRecord(context, at), milestoneId: item.id, dependsOnMilestoneId: milestoneByCode.get(dependency)! })));
      if (dependencies.length) await db.insert(schema.projectMilestoneDependencies).values(dependencies);
      const collaboratorTokens = input.collaborators.map((item) => ({ item, token: `fproject_${randomBytes(32).toString("base64url")}`, id: randomUUID() }));
      if (collaboratorTokens.length) await db.insert(schema.projectExternalAssignments).values(collaboratorTokens.map(({ item, token, id }) => ({ id, ...tenantRecord(context, at), projectId: input.projectId, externalPrincipalId: item.externalPrincipalId, collaboratorRole: item.collaboratorRole, purpose: required(item.purpose, "Collaborator purpose"), tokenHash: digest(token), scopes: item.scopes, dueOn: item.dueOn ? isoDate(item.dueOn, "Collaborator due date") : undefined, expiresAt: item.expiresAt })));
      const benefitIds = input.benefits.map(() => randomUUID());
      if (input.benefits.length) await db.insert(schema.stakeholderBenefitLedgerEntries).values(input.benefits.map((item, index) => ({ id: benefitIds[index], ...tenantRecord(context, at), projectId: input.projectId, stakeholderType: required(item.stakeholderType, "Stakeholder type"), stakeholderName: required(item.stakeholderName, "Stakeholder name"), expectedBenefitCategory: required(item.expectedBenefitCategory, "Expected benefit category"), expectedCostCents: item.expectedCostCents, fundingContributionCents: item.fundingContributionCents, evidenceLevel: item.evidenceLevel, source: required(item.source, "Benefit source"), timeframe: required(item.timeframe, "Benefit timeframe"), uncertainty: required(item.uncertainty, "Benefit uncertainty"), commitmentState: item.commitmentState, realisedResponseState: item.realisedResponseState ?? "not_observed", correctionOfId: item.correctionOfId })));
      await appendAudit(db, context, { action: "project_execution.created", resourceType: "resilience_project", resourceId: input.projectId, detail: { milestoneCount: milestones.length, dependencyCount: dependencies.length, collaboratorCount: collaboratorTokens.length, benefitEntryCount: benefitIds.length }, occurredAt: at });
      return { milestoneIds: milestones.map((item) => item.id), collaboratorAssignments: collaboratorTokens.map(({ id, token }) => ({ id, token })), benefitEntryIds: benefitIds };
    });
  }

  async resolveExternalProjectToken(rawToken: string): Promise<TenantContext> {
    const tokenHash = digest(required(rawToken, "Project access token"));
    const assignment = await this.database.select().from(schema.projectExternalAssignments).where(eq(schema.projectExternalAssignments.tokenHash, tokenHash)).limit(1);
    if (!assignment[0] || assignment[0].revokedAt || new Date(assignment[0].expiresAt).getTime() <= this.clock().getTime()) throw new FundingProjectStateError("Project access is invalid, expired, or revoked.");
    const principal = await this.database.select().from(schema.externalPrincipals).where(and(eq(schema.externalPrincipals.organizationId, assignment[0].organizationId), eq(schema.externalPrincipals.id, assignment[0].externalPrincipalId), eq(schema.externalPrincipals.status, "active"))).limit(1);
    if (!principal[0]) throw new FundingProjectStateError("The external collaborator is not active.");
    const role = assignment[0].collaboratorRole === "contractor"
      ? "contractor_evidence_contributor" as const
      : assignment[0].collaboratorRole === "board_contributor"
        ? "board_contributor" as const
        : "property_manager" as const;
    return { organizationId: assignment[0].organizationId, actorSubject: principal[0].email, principalType: "external_collaborator", role, grantedScopes: assignment[0].scopes, assignedProjectIds: [assignment[0].projectId], assignedProjectScopes: { [assignment[0].projectId]: assignment[0].scopes } };
  }

  async revokeProjectAssignment(context: TenantContext, assignmentId: string) {
    human(context, "revoke external project access");
    const assignment = await this.database.select().from(schema.projectExternalAssignments).where(and(eq(schema.projectExternalAssignments.organizationId, context.organizationId), eq(schema.projectExternalAssignments.id, assignmentId))).limit(1);
    if (!assignment[0]) throw new TenantResourceNotFoundError("Project external assignment");
    assertAuthorized(context, { action: "update", resource: "project_external_assignment", resourceOrganizationId: context.organizationId, projectId: assignment[0].projectId });
    if (assignment[0].revokedAt) throw new FundingProjectStateError("Project access is already revoked.");
    const at = this.clock().toISOString();
    await this.database.update(schema.projectExternalAssignments).set({ revokedAt: at, updatedAt: at, updatedBy: context.actorSubject, revision: assignment[0].revision + 1 }).where(and(eq(schema.projectExternalAssignments.organizationId, context.organizationId), eq(schema.projectExternalAssignments.id, assignmentId)));
    await appendAudit(this.database, context, { action: "project_external_access.revoked", resourceType: "project_external_assignment", resourceId: assignmentId, detail: { projectId: assignment[0].projectId, externalPrincipalId: assignment[0].externalPrincipalId }, occurredAt: at });
    return { assignmentId, revokedAt: at };
  }

  async recordMilestoneEvent(context: TenantContext, input: { milestoneId: string; eventType: "started" | "evidence_submitted" | "approved" | "changes_requested" | "corrected" | "cancelled"; note: string; supersedesEventId?: string }) {
    const milestone = await this.database.select().from(schema.projectMilestones).where(and(eq(schema.projectMilestones.organizationId, context.organizationId), eq(schema.projectMilestones.id, input.milestoneId))).limit(1);
    if (!milestone[0]) throw new TenantResourceNotFoundError("Project milestone");
    assertAuthorized(context, { action: "create", resource: "project_milestone_event", resourceOrganizationId: context.organizationId, projectId: milestone[0].projectId });
    if (input.eventType === "approved" || input.eventType === "changes_requested" || input.eventType === "corrected" || input.eventType === "cancelled") human(context, `${input.eventType} a project milestone`);
    const latest = await this.database.select().from(schema.projectMilestoneEvents).where(and(eq(schema.projectMilestoneEvents.organizationId, context.organizationId), eq(schema.projectMilestoneEvents.milestoneId, input.milestoneId))).orderBy(desc(schema.projectMilestoneEvents.occurredAt), desc(schema.projectMilestoneEvents.id)).limit(1);
    if ((input.eventType === "corrected" || input.eventType === "cancelled") && input.supersedesEventId !== latest[0]?.id) throw new FundingProjectStateError("A milestone correction or cancellation must supersede the latest event.");
    if (input.eventType === "approved") {
      if (latest[0]?.eventType !== "evidence_submitted" && latest[0]?.eventType !== "corrected") throw new FundingProjectStateError("Milestone approval requires submitted or corrected evidence.");
      if (latest[0].decidedBy === context.actorSubject) throw new FundingProjectStateError("The evidence submitter cannot approve the same milestone.");
      const dependencies = await this.database.select().from(schema.projectMilestoneDependencies).where(and(eq(schema.projectMilestoneDependencies.organizationId, context.organizationId), eq(schema.projectMilestoneDependencies.milestoneId, input.milestoneId)));
      for (const dependency of dependencies) {
        const event = await this.database.select().from(schema.projectMilestoneEvents).where(and(eq(schema.projectMilestoneEvents.organizationId, context.organizationId), eq(schema.projectMilestoneEvents.milestoneId, dependency.dependsOnMilestoneId))).orderBy(desc(schema.projectMilestoneEvents.occurredAt), desc(schema.projectMilestoneEvents.id)).limit(1);
        if (event[0]?.eventType !== "approved") throw new FundingProjectStateError("Every predecessor milestone must be approved before this milestone can be approved.");
      }
    }
    const at = this.clock().toISOString(); const eventId = randomUUID();
    await this.database.insert(schema.projectMilestoneEvents).values({ id: eventId, ...tenantRecord(context, at), milestoneId: input.milestoneId, eventType: input.eventType, note: required(input.note, "Milestone note"), decidedBy: context.actorSubject, occurredAt: at, supersedesEventId: input.supersedesEventId });
    await appendAudit(this.database, context, { action: `project_milestone.${input.eventType}`, resourceType: "project_milestone", resourceId: input.milestoneId, detail: { eventId, projectId: milestone[0].projectId, supersedesEventId: input.supersedesEventId ?? null }, occurredAt: at });
    return { eventId, state: input.eventType };
  }

  async approvePayment(context: TenantContext, input: { milestoneId: string; contributionId: string; amountCents: number; decision: "approved" | "rejected"; note: string }) {
    human(context, "decide a payment recommendation");
    const [milestone, contributionAndStack, event, commitment] = await Promise.all([
      this.database.select().from(schema.projectMilestones).where(and(eq(schema.projectMilestones.organizationId, context.organizationId), eq(schema.projectMilestones.id, input.milestoneId))).limit(1),
      this.database.select({ contribution: schema.capitalStackContributions, stack: schema.capitalStacks }).from(schema.capitalStackContributions).innerJoin(schema.capitalStacks, eq(schema.capitalStacks.id, schema.capitalStackContributions.capitalStackId)).where(and(eq(schema.capitalStackContributions.organizationId, context.organizationId), eq(schema.capitalStackContributions.id, input.contributionId))).limit(1),
      this.database.select().from(schema.projectMilestoneEvents).where(and(eq(schema.projectMilestoneEvents.organizationId, context.organizationId), eq(schema.projectMilestoneEvents.milestoneId, input.milestoneId))).orderBy(desc(schema.projectMilestoneEvents.occurredAt), desc(schema.projectMilestoneEvents.id)).limit(1),
      this.database.select({ commitment: schema.fundingCommitments, event: schema.fundingCommitmentEvents }).from(schema.fundingCommitments).innerJoin(schema.fundingCommitmentEvents, eq(schema.fundingCommitmentEvents.commitmentId, schema.fundingCommitments.id)).where(and(eq(schema.fundingCommitments.organizationId, context.organizationId), eq(schema.fundingCommitments.contributionId, input.contributionId))).orderBy(desc(schema.fundingCommitmentEvents.occurredAt), desc(schema.fundingCommitmentEvents.id)).limit(1),
    ]);
    if (!milestone[0] || !contributionAndStack[0]) throw new TenantResourceNotFoundError("Milestone or contribution");
    assertAuthorized(context, { action: "create", resource: "payment_approval", resourceOrganizationId: context.organizationId, projectId: milestone[0].projectId });
    if (contributionAndStack[0].stack.projectId !== milestone[0].projectId) throw new FundingProjectStateError("Payment approval milestone and contribution must belong to the same project.");
    if (!milestone[0].paymentEligible || event[0]?.eventType !== "approved") throw new FundingProjectStateError("Payment approval requires a payment-eligible, human-approved milestone.");
    if (!commitment[0] || !["approved", "corrected"].includes(commitment[0].event.eventType)) throw new FundingProjectStateError("Payment approval requires an effective approved funding commitment.");
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0 || input.amountCents > milestone[0].plannedPaymentCents || input.amountCents > commitment[0].event.effectiveAmountCents) throw new FundingProjectValidationError("Payment amount exceeds the milestone or effective commitment boundary.");
    const at = this.clock().toISOString(); const paymentApprovalId = randomUUID();
    await this.database.insert(schema.paymentApprovals).values({ id: paymentApprovalId, ...tenantRecord(context, at), milestoneId: input.milestoneId, contributionId: input.contributionId, amountCents: input.amountCents, decision: input.decision, approverSubject: context.actorSubject, note: required(input.note, "Payment decision note"), decidedAt: at });
    await appendAudit(this.database, context, { action: `payment_recommendation.${input.decision}`, resourceType: "payment_approval", resourceId: paymentApprovalId, detail: { milestoneId: input.milestoneId, contributionId: input.contributionId, amountCents: input.amountCents, movesFunds: false }, occurredAt: at });
    return { paymentApprovalId, decision: input.decision, movesFunds: false as const };
  }

  async getProjectWorkspace(context: TenantContext, projectId: string) {
    assertAuthorized(context, { action: "read", resource: "resilience_project", resourceOrganizationId: context.organizationId, projectId });
    const project = await this.database.select().from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, projectId))).limit(1);
    if (!project[0]) throw new TenantResourceNotFoundError("Resilience project");
    const canRead = (resource: "capital_stack" | "stakeholder_benefit_ledger_entry") => {
      try {
        assertAuthorized(context, { action: "read", resource, resourceOrganizationId: context.organizationId, projectId });
        return true;
      } catch {
        return false;
      }
    };
    const [milestones, dependencies, milestoneEvents, stacks, benefits] = await Promise.all([
      this.database.select().from(schema.projectMilestones).where(and(eq(schema.projectMilestones.organizationId, context.organizationId), eq(schema.projectMilestones.projectId, projectId))).orderBy(asc(schema.projectMilestones.position)),
      this.database.select({ dependency: schema.projectMilestoneDependencies }).from(schema.projectMilestoneDependencies).innerJoin(schema.projectMilestones, eq(schema.projectMilestones.id, schema.projectMilestoneDependencies.milestoneId)).where(and(eq(schema.projectMilestoneDependencies.organizationId, context.organizationId), eq(schema.projectMilestones.projectId, projectId))),
      this.database.select({ event: schema.projectMilestoneEvents }).from(schema.projectMilestoneEvents).innerJoin(schema.projectMilestones, eq(schema.projectMilestones.id, schema.projectMilestoneEvents.milestoneId)).where(and(eq(schema.projectMilestoneEvents.organizationId, context.organizationId), eq(schema.projectMilestones.projectId, projectId))).orderBy(asc(schema.projectMilestoneEvents.occurredAt)),
      canRead("capital_stack") ? this.database.select().from(schema.capitalStacks).where(and(eq(schema.capitalStacks.organizationId, context.organizationId), eq(schema.capitalStacks.projectId, projectId))) : Promise.resolve([]),
      canRead("stakeholder_benefit_ledger_entry") ? this.database.select().from(schema.stakeholderBenefitLedgerEntries).where(and(eq(schema.stakeholderBenefitLedgerEntries.organizationId, context.organizationId), eq(schema.stakeholderBenefitLedgerEntries.projectId, projectId))) : Promise.resolve([]),
    ]);
    return {
      project: project[0],
      milestones,
      dependencies: dependencies.map((item) => item.dependency),
      milestoneEvents: milestoneEvents.map((item) => item.event),
      capitalStacks: stacks,
      benefits,
      access: { projectScoped: true, capitalStackAvailable: canRead("capital_stack"), stakeholderLedgerAvailable: canRead("stakeholder_benefit_ledger_entry") },
      doctrine: { movesFunds: false, milestoneLabelsArePhysicalProof: false, externalAccessIsAssignmentBound: true },
    };
  }

  async exportDisbursement(context: TenantContext, input: { paymentApprovalId: string; humanConfirmed: boolean }) {
    assertAuthorized(context, { action: "create", resource: "disbursement_export", resourceOrganizationId: context.organizationId });
    human(context, "confirm a disbursement instruction export");
    if (!input.humanConfirmed) throw new FundingProjectStateError("A human must confirm the exact approved instruction before export.");
    const approval = await this.database.select().from(schema.paymentApprovals).where(and(eq(schema.paymentApprovals.organizationId, context.organizationId), eq(schema.paymentApprovals.id, input.paymentApprovalId), eq(schema.paymentApprovals.decision, "approved"))).limit(1);
    if (!approval[0]) throw new FundingProjectStateError("Only an approved payment recommendation can be exported.");
    if (approval[0].approverSubject === context.actorSubject) throw new FundingProjectStateError("Payment approval and instruction export require separate humans.");
    const previous = await this.database.select({ version: schema.disbursementExports.exportVersion }).from(schema.disbursementExports).where(and(eq(schema.disbursementExports.organizationId, context.organizationId), eq(schema.disbursementExports.paymentApprovalId, input.paymentApprovalId))).orderBy(desc(schema.disbursementExports.exportVersion)).limit(1);
    const exportVersion = (previous[0]?.version ?? 0) + 1;
    const at = this.clock().toISOString(); const exportId = randomUUID();
    const payload = { schema: "fortify.disbursement-instruction.v1", paymentApprovalId: input.paymentApprovalId, milestoneId: approval[0].milestoneId, contributionId: approval[0].contributionId, amountCents: approval[0].amountCents, currency: "USD", instructionOnly: true, executionState: "not_executed_export_only" };
    const payloadHash = digest(payload);
    await this.database.insert(schema.disbursementExports).values({ id: exportId, ...tenantRecord(context, at), paymentApprovalId: input.paymentApprovalId, exportVersion, instructionPayload: payload, payloadHash, humanConfirmed: true, exportedBy: context.actorSubject, exportedAt: at, executionState: "not_executed_export_only" });
    await appendAudit(this.database, context, { action: "disbursement_instruction.exported", resourceType: "disbursement_export", resourceId: exportId, detail: { paymentApprovalId: input.paymentApprovalId, exportVersion, payloadHash, movesFunds: false }, occurredAt: at });
    return { exportId, exportVersion, payloadHash, executionState: "not_executed_export_only" as const, movesFunds: false as const };
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, { action: "read", resource: "funding_programme", resourceOrganizationId: context.organizationId });
    const organization = context.organizationId;
    const [programmes, programmeVersions, rules, reviews, publications, assessments, ruleResults, applications, stacks, contributions, commitments, commitmentEvents, milestones, dependencies, milestoneEvents, paymentApprovals, exports, collaborators, benefits] = await Promise.all([
      this.database.select().from(schema.fundingProgrammes).where(eq(schema.fundingProgrammes.organizationId, organization)),
      this.database.select().from(schema.fundingProgrammeVersions).where(eq(schema.fundingProgrammeVersions.organizationId, organization)).orderBy(desc(schema.fundingProgrammeVersions.createdAt)),
      this.database.select().from(schema.fundingEligibilityRules).where(eq(schema.fundingEligibilityRules.organizationId, organization)).orderBy(asc(schema.fundingEligibilityRules.position)),
      this.database.select().from(schema.fundingProgrammeReviews).where(eq(schema.fundingProgrammeReviews.organizationId, organization)),
      this.database.select().from(schema.fundingProgrammePublications).where(eq(schema.fundingProgrammePublications.organizationId, organization)),
      this.database.select().from(schema.fundingEligibilityAssessments).where(eq(schema.fundingEligibilityAssessments.organizationId, organization)).orderBy(desc(schema.fundingEligibilityAssessments.assessedAt)),
      this.database.select().from(schema.fundingEligibilityRuleResults).where(eq(schema.fundingEligibilityRuleResults.organizationId, organization)),
      this.database.select().from(schema.fundingApplications).where(eq(schema.fundingApplications.organizationId, organization)),
      this.database.select().from(schema.capitalStacks).where(eq(schema.capitalStacks.organizationId, organization)),
      this.database.select().from(schema.capitalStackContributions).where(eq(schema.capitalStackContributions.organizationId, organization)),
      this.database.select().from(schema.fundingCommitments).where(eq(schema.fundingCommitments.organizationId, organization)),
      this.database.select().from(schema.fundingCommitmentEvents).where(eq(schema.fundingCommitmentEvents.organizationId, organization)).orderBy(asc(schema.fundingCommitmentEvents.occurredAt)),
      this.database.select().from(schema.projectMilestones).where(eq(schema.projectMilestones.organizationId, organization)).orderBy(asc(schema.projectMilestones.position)),
      this.database.select().from(schema.projectMilestoneDependencies).where(eq(schema.projectMilestoneDependencies.organizationId, organization)),
      this.database.select().from(schema.projectMilestoneEvents).where(eq(schema.projectMilestoneEvents.organizationId, organization)).orderBy(asc(schema.projectMilestoneEvents.occurredAt)),
      this.database.select().from(schema.paymentApprovals).where(eq(schema.paymentApprovals.organizationId, organization)),
      this.database.select().from(schema.disbursementExports).where(eq(schema.disbursementExports.organizationId, organization)),
      this.database.select().from(schema.projectExternalAssignments).where(eq(schema.projectExternalAssignments.organizationId, organization)),
      this.database.select().from(schema.stakeholderBenefitLedgerEntries).where(eq(schema.stakeholderBenefitLedgerEntries.organizationId, organization)),
    ]);
    return { programmes, programmeVersions, rules, reviews, publications, assessments, ruleResults, applications, stacks, contributions, commitments, commitmentEvents, milestones, dependencies, milestoneEvents, paymentApprovals, exports, collaborators, benefits, doctrine: { movesFunds: false, eligibilityGuaranteesAward: false, benefitClaimsAggregatedIntoScore: false, humanApprovalRequired: true } };
  }
}

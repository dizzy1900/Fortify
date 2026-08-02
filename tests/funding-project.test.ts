import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { assertAuthorized, AuthorizationDeniedError } from "@/lib/production/authorization";
import {
  FundingProjectService,
  FundingProjectStateError,
  FundingProjectValidationError,
} from "@/lib/production/funding-project-service";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { tenantRecord, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const at = "2026-08-01T12:00:00.000Z";
const actor = (context: TenantContext, actorSubject: string): TenantContext => ({ ...context, actorSubject });
const tickingClock = () => {
  let tick = 0;
  return () => new Date(Date.parse(at) + tick++ * 1_000);
};

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: path.resolve(process.cwd(), "drizzle-production") });
});
afterAll(async () => client.close());

async function publishedSource(context: TenantContext, key: string) {
  const service = new GovernedSourceService(db(), () => new Date(at));
  const source = await service.createSource(context, {
    canonicalKey: `funding-source-${key}`,
    sourceClass: "funding_programme",
    issuingAuthority: "Fictional California programme sponsor",
    title: "Synthetic funding programme rules",
    jurisdiction: "California",
    officialUrl: `https://example.test/${key}/funding-rules`,
    authorityTier: "primary",
    reviewOwnerSubject: "source-owner",
  });
  const version = await service.createVersion(context, {
    sourceId: source.sourceId,
    versionLabel: "2026.1",
    retrievalDate: "2026-08-01",
    sourceHash: "f".repeat(64),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Metadata-only synthetic fixture.",
    structuredSummary: { scope: "Funding rules fixture" },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial synthetic funding fixture.",
  });
  await service.reviewVersion(actor(context, "source-reviewer"), { sourceVersionId: version.sourceVersionId, decision: "approved", note: "Exact synthetic source and rights reviewed.", sourceCompared: true, rightsConfirmed: true });
  await service.publishVersion(actor(context, "source-publisher"), { sourceVersionId: version.sourceVersionId, decision: "published", note: "Published as an administrative fixture." });
  return version.sourceVersionId;
}

async function governedProgramme(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const projectId = `project-${key}`;
  await database.insert(schema.resilienceProjects).values({ id: projectId, ...tenantRecord(fixture.context, at), propertyId: fixture.propertyId, name: "Perimeter condition project", description: "Synthetic project for funding controls.", status: "planned" });
  const sourceVersionId = await publishedSource(fixture.context, key);
  const service = new FundingProjectService(db(), tickingClock());
  const programme = await service.createProgrammeVersion(fixture.context, {
    canonicalKey: `ca-community-${key}`,
    name: "California community resilience pilot",
    sponsorName: "Fictional programme sponsor",
    programmeType: "mixed",
    description: "Synthetic programme for deterministic contract tests.",
    governedSourceVersionId: sourceVersionId,
    jurisdiction: "California",
    hazard: "wildfire",
    propertyClasses: ["condominium", "townhome"],
    applicationOpensOn: "2026-07-01",
    applicationClosesOn: "2027-03-31",
    maximumAwardCents: 2_400_000,
    maximumCostShareBps: 5_000,
    evidenceRequirements: ["Human-confirmed baseline"],
    paymentConditions: ["Approved milestone evidence"],
    maintenanceObligations: ["Annual evidence refresh"],
    limitations: "Candidate eligibility does not guarantee award, payment, insurance, or recognition.",
    rules: [
      { code: "GEO-01", field: "jurisdiction", operator: "equals", expectedValues: ["California"] },
      { code: "CLASS-02", field: "propertyClass", operator: "one_of", expectedValues: ["condominium", "townhome"] },
      { code: "SIZE-03", field: "unitCount", operator: "at_least", expectedValues: ["8"] },
    ],
  });
  await expect(service.reviewProgrammeVersion(fixture.context, { programmeVersionId: programme.programmeVersionId, decision: "approved", sourceAndRulesChecked: true, note: "Self-review must fail." })).rejects.toBeInstanceOf(FundingProjectStateError);
  await service.reviewProgrammeVersion(actor(fixture.context, "programme-reviewer"), { programmeVersionId: programme.programmeVersionId, decision: "approved", sourceAndRulesChecked: true, note: "Source, window, rules, and limitations reviewed." });
  await expect(service.publishProgrammeVersion(actor(fixture.context, "programme-reviewer"), { programmeVersionId: programme.programmeVersionId, decision: "published", note: "Reviewer cannot publish." })).rejects.toBeInstanceOf(FundingProjectStateError);
  await service.publishProgrammeVersion(actor(fixture.context, "programme-publisher"), { programmeVersionId: programme.programmeVersionId, decision: "published", note: "Published as a bounded administrative fixture." });
  return { fixture, projectId, service, ...programme };
}

const eligibleFacts = { jurisdiction: "California", propertyClass: "condominium", unitCount: 84 };

describe("governed funding and project execution", () => {
  test("publishes source-pinned rules and preserves eligible, ineligible, and insufficient states without awarding funds", async () => {
    const setup = await governedProgramme("m6-eligibility");
    const eligible = await setup.service.assessEligibility(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, facts: eligibleFacts });
    const ineligible = await setup.service.assessEligibility(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, facts: { ...eligibleFacts, jurisdiction: "Colorado" } });
    const insufficient = await setup.service.assessEligibility(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, facts: { jurisdiction: "California", propertyClass: "condominium" } });
    expect(eligible).toMatchObject({ state: "eligible", programmeAwarded: false });
    expect(ineligible.state).toBe("ineligible");
    expect(insufficient.state).toBe("insufficient_evidence");
    await expect(setup.service.prepareApplication(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, eligibilityAssessmentId: ineligible.assessmentId, requestedAmountCents: 1_000_000, humanConfirmed: true })).rejects.toBeInstanceOf(FundingProjectStateError);
    const application = await setup.service.prepareApplication(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, eligibilityAssessmentId: eligible.assessmentId, requestedAmountCents: 1_800_000, humanConfirmed: true });
    expect(application).toEqual(expect.objectContaining({ state: "prepared", submittedExternally: false }));
    await expect(database.update(schema.fundingProgrammeVersions).set({ limitations: "tampered" }).where(eq(schema.fundingProgrammeVersions.id, setup.programmeVersionId))).rejects.toThrow();
  });

  test("enforces blended-stack cost share, duplicate funding, and append-only approval, correction, and cancellation history", async () => {
    const setup = await governedProgramme("m6-capital");
    await setup.service.assessEligibility(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, facts: eligibleFacts });
    const base = {
      projectId: setup.projectId,
      name: "Blended project stack",
      projectCostCents: 4_200_000,
      contributions: [
        { programmeVersionId: setup.programmeVersionId, contributionType: "grant" as const, contributorName: "Fictional sponsor", sourceReference: "programme-v1", amountCents: 1_800_000, purpose: "Installation milestones" },
        { contributionType: "owner" as const, contributorName: "Community owner", sourceReference: "board-resolution-1", amountCents: 1_400_000, purpose: "Owner cost share" },
      ],
    };
    await expect(setup.service.createCapitalStack(setup.fixture.context, { ...base, contributions: [base.contributions[0], { ...base.contributions[1], sourceReference: "programme-v1" }] })).rejects.toBeInstanceOf(FundingProjectValidationError);
    await expect(setup.service.createCapitalStack(setup.fixture.context, { ...base, contributions: [{ ...base.contributions[0], amountCents: 2_300_000 }, base.contributions[1]] })).rejects.toBeInstanceOf(FundingProjectValidationError);
    await expect(setup.service.createCapitalStack(setup.fixture.context, { ...base, capitalPlanScenarioId: "scenario-not-linked-to-project" })).rejects.toBeInstanceOf(FundingProjectStateError);
    const stack = await setup.service.createCapitalStack(setup.fixture.context, base);
    expect(stack).toMatchObject({ fundedCents: 3_200_000, unfundedCents: 1_000_000, movesFunds: false });
    const commitment = await setup.service.createCommitment(setup.fixture.context, { contributionId: stack.contributionIds[0], committedAmountCents: 1_800_000, terms: "Fixture terms subject to milestone review." });
    await expect(setup.service.recordCommitmentEvent(setup.fixture.context, { commitmentId: commitment.commitmentId, eventType: "approved", effectiveAmountCents: 1_800_000, rationale: "Self approval must fail." })).rejects.toBeInstanceOf(FundingProjectStateError);
    const approved = await setup.service.recordCommitmentEvent(actor(setup.fixture.context, "funder-reviewer"), { commitmentId: commitment.commitmentId, eventType: "approved", effectiveAmountCents: 1_800_000, rationale: "Separate human fixture approval." });
    await expect(setup.service.recordCommitmentEvent(setup.fixture.context, { commitmentId: commitment.commitmentId, eventType: "corrected", effectiveAmountCents: 1_750_000, rationale: "Wrong predecessor.", supersedesEventId: commitment.eventId })).rejects.toBeInstanceOf(FundingProjectStateError);
    const corrected = await setup.service.recordCommitmentEvent(setup.fixture.context, { commitmentId: commitment.commitmentId, eventType: "corrected", effectiveAmountCents: 1_750_000, rationale: "Corrected after scope reconciliation.", supersedesEventId: approved.eventId });
    const cancelled = await setup.service.recordCommitmentEvent(actor(setup.fixture.context, "funder-reviewer"), { commitmentId: commitment.commitmentId, eventType: "cancelled", effectiveAmountCents: 0, rationale: "Fixture cancellation preserves all earlier history.", supersedesEventId: corrected.eventId });
    expect(cancelled.state).toBe("cancelled");
    const events = await database.select().from(schema.fundingCommitmentEvents).where(eq(schema.fundingCommitmentEvents.commitmentId, commitment.commitmentId));
    expect(events.map((item) => item.eventType)).toEqual(expect.arrayContaining(["proposed", "approved", "corrected", "cancelled"]));
    await expect(database.update(schema.fundingCommitmentEvents).set({ rationale: "tampered" }).where(eq(schema.fundingCommitmentEvents.id, approved.eventId))).rejects.toThrow();
  });

  test("gates milestones, scopes external contributors, separates payment approval from export, and never moves funds", async () => {
    const setup = await governedProgramme("m6-execution");
    await setup.service.assessEligibility(setup.fixture.context, { projectId: setup.projectId, programmeVersionId: setup.programmeVersionId, facts: eligibleFacts });
    const stack = await setup.service.createCapitalStack(setup.fixture.context, { projectId: setup.projectId, name: "Execution stack", projectCostCents: 4_000_000, contributions: [{ programmeVersionId: setup.programmeVersionId, contributionType: "grant", contributorName: "Fictional sponsor", sourceReference: "programme-execution-v1", amountCents: 1_800_000, purpose: "Installation" }, { contributionType: "owner", contributorName: "Community owner", sourceReference: "board-execution-1", amountCents: 1_200_000, purpose: "Owner share" }] });
    const commitment = await setup.service.createCommitment(setup.fixture.context, { contributionId: stack.contributionIds[0], committedAmountCents: 1_800_000, terms: "Fixture terms." });
    await setup.service.recordCommitmentEvent(actor(setup.fixture.context, "funder-reviewer"), { commitmentId: commitment.commitmentId, eventType: "approved", effectiveAmountCents: 1_800_000, rationale: "Separate human fixture approval." });
    const principalId = `external-${setup.projectId}`;
    await database.insert(schema.externalPrincipals).values({ id: principalId, ...tenantRecord(setup.fixture.context, at), principalType: "external_collaborator", email: "contractor@example.test", displayName: "Fixture contractor", status: "active", expiresAt: "2027-01-01T00:00:00.000Z" });
    const execution = await setup.service.createProjectExecution(setup.fixture.context, {
      projectId: setup.projectId,
      milestones: [
        { code: "BASELINE", name: "Baseline complete", evidenceRequirement: "Confirmed baseline", paymentEligible: false, plannedPaymentCents: 0 },
        { code: "INSTALL", name: "Installation complete", evidenceRequirement: "Scoped completion evidence", paymentEligible: true, plannedPaymentCents: 1_250_000, dependsOnCodes: ["BASELINE"] },
        { code: "VERIFY", name: "Verification complete", evidenceRequirement: "M7 verification finding", paymentEligible: true, plannedPaymentCents: 500_000, dependsOnCodes: ["INSTALL"] },
      ],
      collaborators: [{ externalPrincipalId: principalId, collaboratorRole: "contractor", purpose: "Submit installation evidence only", scopes: ["resilience_project:read", "project_milestone:read", "project_milestone_event:create"], expiresAt: "2026-12-31T23:59:59.000Z" }],
      benefits: [{ stakeholderType: "property_owner", stakeholderName: "Community owner", expectedBenefitCategory: "documented project completion", expectedCostCents: 1_200_000, fundingContributionCents: 1_200_000, evidenceLevel: "documented", source: "Board resolution fixture", timeframe: "Project period", uncertainty: "Final contractor cost remains unverified.", commitmentState: "approved" }],
    });
    const contractor = await setup.service.resolveExternalProjectToken(execution.collaboratorAssignments[0].token);
    expect(execution.collaboratorAssignments[0].token).toMatch(/^fproject_/);
    assertAuthorized(contractor, { action: "create", resource: "project_milestone_event", resourceOrganizationId: setup.fixture.organizationId, projectId: setup.projectId });
    expect(() => assertAuthorized(contractor, { action: "read", resource: "capital_stack", resourceOrganizationId: setup.fixture.organizationId, projectId: setup.projectId })).toThrow(AuthorizationDeniedError);
    const contractorWorkspace = await setup.service.getProjectWorkspace(contractor, setup.projectId);
    expect(contractorWorkspace).toMatchObject({ access: { projectScoped: true, capitalStackAvailable: false, stakeholderLedgerAvailable: false }, doctrine: { movesFunds: false, milestoneLabelsArePhysicalProof: false } });
    expect(contractorWorkspace.milestones).toHaveLength(3);
    expect(contractorWorkspace.capitalStacks).toEqual([]);
    await setup.service.recordMilestoneEvent(contractor, { milestoneId: execution.milestoneIds[0], eventType: "evidence_submitted", note: "Baseline evidence submitted." });
    await setup.service.recordMilestoneEvent(actor(setup.fixture.context, "milestone-reviewer"), { milestoneId: execution.milestoneIds[0], eventType: "approved", note: "Baseline approved by a separate human." });
    await setup.service.recordMilestoneEvent(contractor, { milestoneId: execution.milestoneIds[2], eventType: "evidence_submitted", note: "Verification placeholder submitted for dependency test." });
    await expect(setup.service.recordMilestoneEvent(actor(setup.fixture.context, "milestone-reviewer"), { milestoneId: execution.milestoneIds[2], eventType: "approved", note: "Must wait for installation." })).rejects.toBeInstanceOf(FundingProjectStateError);
    await setup.service.recordMilestoneEvent(contractor, { milestoneId: execution.milestoneIds[1], eventType: "evidence_submitted", note: "Installation evidence submitted." });
    await setup.service.recordMilestoneEvent(actor(setup.fixture.context, "milestone-reviewer"), { milestoneId: execution.milestoneIds[1], eventType: "approved", note: "Installation evidence approved." });
    const otherProjectId = `${setup.projectId}-other`;
    await database.insert(schema.resilienceProjects).values({ id: otherProjectId, ...tenantRecord(setup.fixture.context, at), propertyId: setup.fixture.propertyId, name: "Other fixture project", description: "Same-tenant project used to attack payment linkage.", status: "planned" });
    const otherStack = await setup.service.createCapitalStack(setup.fixture.context, { projectId: otherProjectId, name: "Other project stack", projectCostCents: 2_000_000, contributions: [{ contributionType: "owner", contributorName: "Other owner", sourceReference: "other-owner", amountCents: 1_000_000, purpose: "Other project" }, { contributionType: "financing", contributorName: "Other lender", sourceReference: "other-finance", amountCents: 500_000, purpose: "Other project" }] });
    await expect(setup.service.approvePayment(actor(setup.fixture.context, "payment-approver"), { milestoneId: execution.milestoneIds[1], contributionId: otherStack.contributionIds[0], amountCents: 500_000, decision: "approved", note: "Cross-project recommendation must fail." })).rejects.toBeInstanceOf(FundingProjectStateError);
    await expect(database.insert(schema.paymentApprovals).values({ id: "cross-project-payment", ...tenantRecord(setup.fixture.context, at), milestoneId: execution.milestoneIds[1], contributionId: otherStack.contributionIds[0], amountCents: 500_000, decision: "approved", approverSubject: "database-attacker", note: "Must fail at the database boundary.", decidedAt: at })).rejects.toThrow();
    const payment = await setup.service.approvePayment(actor(setup.fixture.context, "payment-approver"), { milestoneId: execution.milestoneIds[1], contributionId: stack.contributionIds[0], amountCents: 1_250_000, decision: "approved", note: "Approved instruction amount; no funds moved." });
    await expect(setup.service.exportDisbursement(actor(setup.fixture.context, "payment-approver"), { paymentApprovalId: payment.paymentApprovalId, humanConfirmed: true })).rejects.toBeInstanceOf(FundingProjectStateError);
    const exported = await setup.service.exportDisbursement(actor(setup.fixture.context, "export-confirmer"), { paymentApprovalId: payment.paymentApprovalId, humanConfirmed: true });
    expect(exported).toMatchObject({ executionState: "not_executed_export_only", movesFunds: false });
    await setup.service.revokeProjectAssignment(setup.fixture.context, execution.collaboratorAssignments[0].id);
    await expect(setup.service.resolveExternalProjectToken(execution.collaboratorAssignments[0].token)).rejects.toBeInstanceOf(FundingProjectStateError);
  });

  test("rejects cross-tenant financial references at the database boundary", async () => {
    const alpha = await governedProgramme("m6-alpha");
    const beta = await createTenantFixture(db(), "m6-beta");
    await database.insert(schema.capitalStacks).values({ id: "beta-stack", ...tenantRecord(beta.context, at), projectId: alpha.projectId, name: "Cross-tenant stack", projectCostCents: 1_000_000, currency: "USD", state: "proposed", decisionBoundary: "Must fail." }).then(() => { throw new Error("Expected cross-tenant guard."); }, (error) => expect(error).toBeTruthy());
  });
});

import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import {
  ResiliencePlanningService,
  ResiliencePlanningStateError,
  ResiliencePlanningValidationError,
} from "@/lib/production/resilience-planning-service";
import { tenantRecord, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";
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

async function publishedSource(context: TenantContext) {
  const service = new GovernedSourceService(db(), () => new Date(at));
  const source = await service.createSource(context, {
    canonicalKey: `profile-source-${context.organizationId}`,
    sourceClass: "regulator_guidance",
    issuingAuthority: "California authority fixture",
    title: "Governed profile source fixture",
    jurisdiction: "California",
    officialUrl: "https://example.test/california/profile-source",
    authorityTier: "primary",
    reviewOwnerSubject: "source-owner",
  });
  const version = await service.createVersion(context, {
    sourceId: source.sourceId, versionLabel: "2026.1", retrievalDate: "2026-08-01",
    sourceHash: "a".repeat(64), snapshotState: "metadata_only_restricted", rightsStatus: "restricted",
    redistributionAllowed: false, useRestrictions: "Metadata-only deterministic fixture.",
    structuredSummary: { scope: "Profile source test" }, verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01", extractionMethod: "human_authored", humanConfirmed: true,
    changeSummary: "Initial governed fixture.",
  });
  await service.reviewVersion(actor(context, "source-reviewer"), { sourceVersionId: version.sourceVersionId, decision: "approved", note: "Exact metadata and rights reviewed.", sourceCompared: true, rightsConfirmed: true });
  await service.publishVersion(actor(context, "source-publisher"), { sourceVersionId: version.sourceVersionId, decision: "published", note: "Published as a bounded fixture." });
  return { sourceService: service, sourceId: source.sourceId, sourceVersionId: version.sourceVersionId };
}

async function publishedProfile(fixture: Awaited<ReturnType<typeof createTenantFixture>>) {
  const { sourceService, sourceId, sourceVersionId } = await publishedSource(fixture.context);
  const service = new ResiliencePlanningService(db(), () => new Date(at));
  const created = await service.createProfileVersion(fixture.context, {
    canonicalKey: "ca-condo-wildfire-readiness", name: "California condominium wildfire evidence-readiness",
    description: "A bounded, evidence-readiness target profile.", jurisdiction: "California", peril: "wildfire", propertyClass: "condominium",
    effectiveFrom: "2026-08-01", changeSummary: "Initial profile fixture.",
    limitations: "Not a designation, risk score, engineering opinion, or insurer commitment.", sourceVersionIds: [sourceVersionId],
    criteria: [
      { code: "MIN-1", title: "Current record", targetLevel: "minimum", evidenceLevel: "documented", requirementText: "Current property record exists.", verificationMethod: "Human document review." },
      { code: "PREF-1", title: "Independent check", targetLevel: "preferred", evidenceLevel: "independent_verification", requirementText: "Independent check exists.", verificationMethod: "Signed verification review." },
    ],
    applicability: [
      { field: "jurisdiction", operator: "equals", expectedValues: ["California"] },
      { field: "propertyClass", operator: "one_of", expectedValues: ["condominium", "townhome"] },
      { field: "perils", operator: "includes", expectedValues: ["wildfire"] },
    ],
  });
  await expect(service.reviewProfileVersion(fixture.context, { profileVersionId: created.profileVersionId, decision: "approved", note: "Self review must fail.", sourcePinsChecked: true })).rejects.toBeInstanceOf(ResiliencePlanningStateError);
  await service.reviewProfileVersion(actor(fixture.context, "profile-reviewer"), { profileVersionId: created.profileVersionId, decision: "approved", note: "Criteria, applicability, evidence levels, and source pins reviewed.", sourcePinsChecked: true });
  await expect(service.publishProfileVersion(actor(fixture.context, "profile-reviewer"), { profileVersionId: created.profileVersionId, decision: "published", note: "Review and publication must remain separate." })).rejects.toBeInstanceOf(ResiliencePlanningStateError);
  await service.publishProfileVersion(actor(fixture.context, "profile-publisher"), { profileVersionId: created.profileVersionId, decision: "published", note: "Published as an evidence-readiness target only." });
  return { service, sourceService, sourceId, sourceVersionId, ...created };
}

describe("governed target profiles and resilience capital planning", () => {
  test("preserves independent profile governance, exact source impact, and immutable authored history", async () => {
    const fixture = await createTenantFixture(db(), "m5-profile");
    const result = await publishedProfile(fixture);
    const impact = await result.sourceService.impactReport(fixture.context, { sourceId: result.sourceId, fromVersionId: result.sourceVersionId, toVersionId: result.sourceVersionId });
    expect(impact.affected.profiles).toMatchObject({ state: "available", items: [{ id: result.profileId, versionId: result.profileVersionId }] });
    await expect(database.update(schema.targetProfileVersions).set({ limitations: "tampered" }).where(eq(schema.targetProfileVersions.id, result.profileVersionId))).rejects.toThrow();
    await expect(result.service.createProfileVersion(fixture.context, {
      profileId: result.profileId, effectiveFrom: "2026-09-01", changeSummary: "Missing predecessor.", limitations: "Bounded.", sourceVersionIds: [result.sourceVersionId],
      criteria: [{ code: "MIN-2", title: "Only minimum", targetLevel: "minimum", evidenceLevel: "documented", requirementText: "A", verificationMethod: "B" }], applicability: [{ field: "jurisdiction", operator: "equals", expectedValues: ["California"] }],
    })).rejects.toBeInstanceOf(ResiliencePlanningValidationError);
  });

  test("creates reviewed interventions and transparent applicable, inapplicable, insufficient, and no-path outcomes", async () => {
    const fixture = await createTenantFixture(db(), "m5-plans");
    const { service, profileVersionId } = await publishedProfile(fixture);
    const intervention = await service.createInterventionVersion(fixture.context, {
      canonicalKey: "evidence-recovery", name: "Evidence recovery", category: "evidence_recovery", description: "Recover exact property records.",
      technicalSpecification: "Reconcile permits, invoices, and building schedule.", evidenceLevel: "documented",
      typicalCostLowCents: 250000, typicalCostHighCents: 600000, typicalDurationDays: 30,
      dependencies: ["Archive access"], maintenanceRequirements: ["Annual currency review"],
      benefitStatement: "May close a documentation gap.", benefitBoundary: "Does not establish physical condition or insurer acceptance.",
    });
    await expect(service.reviewInterventionVersion(fixture.context, { interventionVersionId: intervention.interventionVersionId, decision: "approved", note: "Self review fails." })).rejects.toBeInstanceOf(ResiliencePlanningStateError);
    await service.reviewInterventionVersion(actor(fixture.context, "intervention-reviewer"), { interventionVersionId: intervention.interventionVersionId, decision: "approved", note: "Specification, evidence basis, range, and boundary reviewed." });
    const criteria = await database.select().from(schema.targetProfileCriteria).where(eq(schema.targetProfileCriteria.profileVersionId, profileVersionId));
    const gaps = criteria.map((criterion) => ({ criterionId: criterion.id, state: criterion.targetLevel === "minimum" ? "gap" as const : "not_applicable" as const, observedCondition: "Explicit fixture observation." }));
    const base = { propertyId: fixture.propertyId, profileVersionId, name: "2027 capital plan", gaps };
    const scenario = { name: "Evidence foundation", project: { name: "Recover records", description: "Recover and reconcile the exact property records.", interventionVersionIds: [intervention.interventionVersionId] }, totalCostLowCents: 250000, totalCostHighCents: 600000, durationDays: 30, dependencies: ["Archive access"], maintenanceRequirements: ["Annual currency review"], fundingEligibilityState: "unknown" as const, modeledBenefitState: "unavailable" as const, insurerTreatmentState: "no_commitment" as const, rationale: "Addresses the explicit documentation gap without inventing ROI.", assumptions: ["Archive access is granted"] };
    await expect(service.createCapitalPlan(fixture.context, { ...base, propertyFacts: { jurisdiction: "California", propertyClass: "condominium", perils: ["wildfire"] }, scenarios: [{ ...scenario, totalCostLowCents: 700000, totalCostHighCents: 600000 }] })).rejects.toBeInstanceOf(ResiliencePlanningValidationError);
    const applicable = await service.createCapitalPlan(fixture.context, { ...base, propertyFacts: { jurisdiction: "California", propertyClass: "condominium", perils: ["wildfire"] }, scenarios: [scenario] });
    expect(applicable).toMatchObject({ applicabilityState: "applicable", planningState: "options_available" });
    const inapplicable = await service.createCapitalPlan(fixture.context, { ...base, name: "Inapplicable path", propertyFacts: { jurisdiction: "Colorado", propertyClass: "condominium", perils: ["wildfire"] }, scenarios: [scenario] });
    expect(inapplicable).toMatchObject({ applicabilityState: "inapplicable", planningState: "inapplicable" });
    const insufficient = await service.createCapitalPlan(fixture.context, { ...base, name: "Insufficient path", propertyFacts: { jurisdiction: "California" }, scenarios: [scenario] });
    expect(insufficient).toMatchObject({ applicabilityState: "insufficient_property_data", planningState: "insufficient_evidence" });
    const noPath = await service.createCapitalPlan(fixture.context, { ...base, name: "No attractive path", propertyFacts: { jurisdiction: "California", propertyClass: "condominium", perils: ["wildfire"] }, scenarios: [] });
    expect(noPath).toMatchObject({ applicabilityState: "applicable", planningState: "no_attractive_path" });
    const workspace = await service.getWorkspace(fixture.context);
    expect(workspace.doctrine).toEqual({ riskScoresProduced: false, financialReturnModeled: false, insurerAcceptancePredicted: false, humanReviewRequired: true });
  });

  test("rejects cross-tenant profile and planning references at the database boundary", async () => {
    const alpha = await createTenantFixture(db(), "m5-alpha"); const beta = await createTenantFixture(db(), "m5-beta");
    const { profileVersionId } = await publishedProfile(alpha);
    await expect(database.insert(schema.baselineAssessments).values({ id: "cross-tenant-baseline", ...tenantRecord(beta.context, at), propertyId: beta.propertyId, profileVersionId, applicabilityState: "applicable", applicabilityReasons: ["Must fail"], assessedAt: at, assessedBy: beta.context.actorSubject })).rejects.toThrow();
  });
});

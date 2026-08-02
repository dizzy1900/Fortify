import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { FundingProjectService } from "@/lib/production/funding-project-service";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  ProgrammeAnalyticsService,
  ProgrammeAnalyticsStateError,
} from "@/lib/production/programme-analytics-service";
import { ResiliencePlanningService } from "@/lib/production/resilience-planning-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;
const baseTime = "2026-08-01T12:00:00.000Z";
const actor = (context: TenantContext, actorSubject: string): TenantContext => ({
  ...context,
  actorSubject,
});
const tickingClock = () => {
  let tick = 0;
  return () => new Date(Date.parse("2026-08-01T13:00:00.000Z") + tick++ * 1_000);
};

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
});

afterAll(async () => client.close());

async function governedProgramme(key: string) {
  const fixture = await createTenantFixture(db(), key);
  const sourceService = new GovernedSourceService(db(), tickingClock());
  const source = await sourceService.createSource(fixture.context, {
    canonicalKey: `programme-analytics-source-${key}`,
    sourceClass: "funding_programme",
    issuingAuthority: "Fictional programme sponsor",
    title: "Synthetic programme administration rules",
    jurisdiction: "Colorado",
    officialUrl: `https://example.test/${key}/programme-rules`,
    authorityTier: "primary",
    reviewOwnerSubject: "source-owner",
  });
  const sourceVersion = await sourceService.createVersion(fixture.context, {
    sourceId: source.sourceId,
    versionLabel: "2026.1",
    retrievalDate: "2026-08-01",
    sourceHash: "c".repeat(64),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Metadata-only synthetic fixture.",
    structuredSummary: { scope: "Programme analytics test" },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial synthetic fixture.",
  });
  await sourceService.reviewVersion(actor(fixture.context, "source-reviewer"), {
    sourceVersionId: sourceVersion.sourceVersionId,
    decision: "approved",
    note: "Exact fixture source and rights reviewed.",
    sourceCompared: true,
    rightsConfirmed: true,
  });
  await sourceService.publishVersion(actor(fixture.context, "source-publisher"), {
    sourceVersionId: sourceVersion.sourceVersionId,
    decision: "published",
    note: "Published as a bounded fixture.",
  });

  const planning = new ResiliencePlanningService(db(), tickingClock());
  const profile = await planning.createProfileVersion(fixture.context, {
    canonicalKey: `programme-profile-${key}`,
    name: "Colorado condominium evidence-readiness profile",
    description: "Synthetic evidence-readiness target for programme administration.",
    jurisdiction: "Colorado",
    peril: "wildfire",
    propertyClass: "condominium",
    effectiveFrom: "2026-08-01",
    changeSummary: "Initial fixture.",
    limitations: "Not a designation, score, or insurance commitment.",
    sourceVersionIds: [sourceVersion.sourceVersionId],
    criteria: [
      {
        code: "DOC-1",
        title: "Current evidence record",
        targetLevel: "minimum",
        evidenceLevel: "documented",
        requirementText: "A current property evidence record exists.",
        verificationMethod: "Human document review.",
      },
      {
        code: "VERIFY-2",
        title: "Independent verification",
        targetLevel: "preferred",
        evidenceLevel: "independent_verification",
        requirementText: "An independently reviewed property record exists.",
        verificationMethod: "Signed verification finding review.",
      },
    ],
    applicability: [
      { field: "jurisdiction", operator: "equals", expectedValues: ["Colorado"] },
      { field: "propertyClass", operator: "one_of", expectedValues: ["condominium"] },
    ],
  });
  await planning.reviewProfileVersion(actor(fixture.context, "profile-reviewer"), {
    profileVersionId: profile.profileVersionId,
    decision: "approved",
    note: "Criteria and source pins reviewed.",
    sourcePinsChecked: true,
  });
  await planning.publishProfileVersion(actor(fixture.context, "profile-publisher"), {
    profileVersionId: profile.profileVersionId,
    decision: "published",
    note: "Published for fixture administration.",
  });

  const funding = new FundingProjectService(db(), tickingClock());
  const programme = await funding.createProgrammeVersion(fixture.context, {
    canonicalKey: `programme-${key}`,
    name: "Fictional Colorado evidence programme",
    sponsorName: "Fictional programme sponsor",
    programmeType: "mixed",
    description: "Synthetic programme for deterministic analytics tests.",
    governedSourceVersionId: sourceVersion.sourceVersionId,
    targetProfileVersionId: profile.profileVersionId,
    jurisdiction: "Colorado",
    hazard: "wildfire",
    propertyClasses: ["condominium"],
    applicationOpensOn: "2026-07-01",
    applicationClosesOn: "2027-03-31",
    maximumAwardCents: 2_400_000,
    maximumCostShareBps: 5_000,
    evidenceRequirements: ["Human-confirmed property record"],
    paymentConditions: ["Approved milestone evidence"],
    maintenanceObligations: ["Annual evidence refresh"],
    limitations: "Candidate status does not guarantee funds, insurance, or recognition.",
    rules: [
      {
        code: "CLASS-1",
        field: "propertyClass",
        operator: "equals",
        expectedValues: ["condominium"],
      },
    ],
  });
  await funding.reviewProgrammeVersion(actor(fixture.context, "programme-reviewer"), {
    programmeVersionId: programme.programmeVersionId,
    decision: "approved",
    sourceAndRulesChecked: true,
    note: "Source, rules, and limits reviewed.",
  });
  await funding.publishProgrammeVersion(actor(fixture.context, "programme-publisher"), {
    programmeVersionId: programme.programmeVersionId,
    decision: "published",
    note: "Published for bounded fixture use.",
  });
  return { fixture, profile, programme, sourceService, source, sourceVersion };
}

async function governedAnalytics(key: string) {
  const setup = await governedProgramme(key);
  const storage = new DeterministicObjectStorageAdapter({ mode: "aws:kms", keyId: "fixture-key" });
  const service = new ProgrammeAnalyticsService(db(), storage, tickingClock());
  const cohort = await service.createCohort(setup.fixture.context, {
    canonicalKey: `cohort-${key}`,
    name: "2026 evidence-readiness cohort",
    sponsorName: "Fictional programme sponsor",
    description: "Synthetic tenant programme cohort.",
    programmeVersionId: setup.programme.programmeVersionId,
    profileVersionId: setup.profile.profileVersionId,
    geography: "Colorado",
    propertyClass: "condominium",
    effectiveFrom: "2026-08-01",
    limitations: "Descriptive administration only; no insurance or causal outcome claim.",
    humanConfirmed: true,
  });
  await service.recordMembershipEvent(setup.fixture.context, {
    cohortVersionId: cohort.cohortVersionId,
    propertyId: setup.fixture.propertyId,
    eventType: "applicant",
    reason: "Customer-confirmed programme application.",
    source: "Synthetic customer intake",
    humanConfirmed: true,
  });
  const policy = await service.createAnalyticsPolicy(setup.fixture.context, {
    mode: "tenant_only",
    minimumCohortSize: 10,
    deidentificationMethod: "No cross-tenant rows; identifiers retained only inside tenant boundary.",
    suppressionThreshold: 10,
    allowedMetricFamilies: ["workflow", "programme_operations", "recognition"],
    retentionDays: 365,
    deletionTreatment: "Tenant deletion removes future query eligibility while immutable receipts remain governed.",
    optInConfirmed: false,
    effectiveFrom: "2026-08-01",
  });
  await service.reviewAnalyticsPolicy(actor(setup.fixture.context, "analytics-reviewer"), {
    policyVersionId: policy.policyVersionId,
    decision: "approved",
    note: "Tenant scope, rights, and privacy controls reviewed.",
    rightsChecked: true,
    privacyChecked: true,
  });
  await service.publishAnalyticsPolicy(actor(setup.fixture.context, "analytics-publisher"), {
    policyVersionId: policy.policyVersionId,
    decision: "published",
    note: "Published for tenant-only descriptive analytics.",
    humanConfirmed: true,
  });
  return { ...setup, service, storage, cohort, policy };
}

describe("programme administration, descriptive analytics, and recognition graph", () => {
  test("generates tenant-only snapshots and exact-byte brokerage and programme reports without causal claims", async () => {
    const setup = await governedAnalytics("m10-report");
    const baseline = await setup.service.recordWorkflowBaseline(setup.fixture.context, {
      cohortVersionId: setup.cohort.cohortVersionId,
      baselineType: "brokerage_workflow",
      periodStart: "2026-01-01",
      periodEnd: "2026-06-30",
      caseCount: 12,
      manualMinutesPerCase: 180,
      manualTouchesPerCase: 9,
      externalCostCentsPerCase: 0,
      currency: "USD",
      source: "Customer-confirmed workflow interview",
      sourceVersion: "interview-2026-08-01",
      limitations: "Self-reported baseline; not a causal counterfactual.",
      humanConfirmed: true,
    });
    const snapshot = await setup.service.generateMetricSnapshot(setup.fixture.context, {
      cohortVersionId: setup.cohort.cohortVersionId,
      policyVersionId: setup.policy.policyVersionId,
      analyticsScope: "tenant_only",
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: baseTime,
    });
    expect(snapshot).toMatchObject({ replayed: false });
    expect(snapshot.metrics).toMatchObject({ applicants: 1, qualifiedProperties: 0 });
    expect(snapshot.denominators).toMatchObject({ qualifiedProperties: 1 });
    const roi = await setup.service.generateReport(setup.fixture.context, {
      metricSnapshotId: snapshot.snapshotId,
      baselineId: baseline.baselineId,
      reportType: "brokerage_roi",
      humanConfirmed: true,
    });
    const outcome = await setup.service.generateReport(setup.fixture.context, {
      metricSnapshotId: snapshot.snapshotId,
      reportType: "programme_outcome",
      humanConfirmed: true,
    });
    expect(roi.artifacts).toHaveLength(2);
    expect(outcome.artifacts).toHaveLength(2);
    const impact = await setup.sourceService.impactReport(setup.fixture.context, {
      sourceId: setup.source.sourceId,
      fromVersionId: setup.sourceVersion.sourceVersionId,
      toVersionId: setup.sourceVersion.sourceVersionId,
    });
    expect(impact.affected.reports).toMatchObject({
      state: "available",
      items: expect.arrayContaining([
        expect.objectContaining({ id: roi.reportId, reportType: "brokerage_roi" }),
        expect.objectContaining({ id: outcome.reportId, reportType: "programme_outcome" }),
      ]),
    });
    const exported = await setup.service.readReportArtifact(setup.fixture.context, roi.reportId, "json");
    const report = JSON.parse(new TextDecoder().decode(exported.body)) as {
      analyticsScope: string;
      interpretationBoundary: string;
    };
    expect(report.analyticsScope).toBe("tenant_only");
    expect(report.interpretationBoundary).toContain("No premium, claims, causal savings");
    const objects = await database.select().from(schema.storageObjects).where(eq(schema.storageObjects.organizationId, setup.fixture.organizationId));
    expect(objects.filter((item) => item.objectKey.includes("/generated/analytics/"))).toEqual(
      expect.arrayContaining([expect.objectContaining({ encryptionMode: "aws:kms", state: "clean" })]),
    );
    await expect(database.update(schema.analyticsReports).set({ title: "tampered" }).where(eq(schema.analyticsReports.id, roi.reportId))).rejects.toThrow();
  });

  test("enforces human separation, tenant isolation, graph lineage, and fail-closed cross-customer execution", async () => {
    const setup = await governedAnalytics("m10-boundaries");
    await expect(setup.service.generateMetricSnapshot(setup.fixture.context, {
      cohortVersionId: setup.cohort.cohortVersionId,
      policyVersionId: setup.policy.policyVersionId,
      analyticsScope: "cross_customer_opt_in",
      windowStart: "2026-01-01T00:00:00.000Z",
      windowEnd: baseTime,
    })).rejects.toBeInstanceOf(ProgrammeAnalyticsStateError);

    const authored = await setup.service.createAnalyticsPolicy(setup.fixture.context, {
      mode: "cross_customer_opt_in",
      contractReference: "synthetic-contract-opt-in-v1",
      minimumCohortSize: 10,
      deidentificationMethod: "Synthetic de-identification specification.",
      suppressionThreshold: 10,
      allowedMetricFamilies: ["programme_operations"],
      retentionDays: 90,
      deletionTreatment: "Exclude deleted tenant rows from any future eligible aggregate.",
      optInConfirmed: true,
      effectiveFrom: "2026-09-01",
    });
    await expect(setup.service.reviewAnalyticsPolicy(setup.fixture.context, {
      policyVersionId: authored.policyVersionId,
      decision: "approved",
      note: "Self-review must fail.",
      rightsChecked: true,
      privacyChecked: true,
    })).rejects.toBeInstanceOf(ProgrammeAnalyticsStateError);

    const audit = await database.select().from(schema.auditEvents).where(eq(schema.auditEvents.resourceId, setup.cohort.cohortVersionId)).limit(1);
    const graph = await setup.service.recordRecognitionGraphEvent(setup.fixture.context, {
      sourceAuditEventId: audit[0].id,
      eventType: "programme_cohort_activated",
      relationship: "administers",
      objectType: "programme_version",
      objectId: setup.programme.programmeVersionId,
      propertyId: setup.fixture.propertyId,
      programmeVersionId: setup.programme.programmeVersionId,
      dataRightClass: "software_telemetry",
      attributes: { causalClaim: false },
    });
    const replay = await setup.service.recordRecognitionGraphEvent(setup.fixture.context, {
      sourceAuditEventId: audit[0].id,
      eventType: "programme_cohort_activated",
      relationship: "administers",
      objectType: "programme_version",
      objectId: setup.programme.programmeVersionId,
      propertyId: setup.fixture.propertyId,
      programmeVersionId: setup.programme.programmeVersionId,
      dataRightClass: "software_telemetry",
      attributes: { causalClaim: false },
    });
    expect(replay).toMatchObject({ graphEventId: graph.graphEventId, replayed: true });

    const beta = await createTenantFixture(db(), "m10-beta");
    await expect(database.insert(schema.programmeCohortMembershipEvents).values({
      id: "cross-tenant-membership",
      ...tenantRecord(setup.fixture.context, baseTime),
      cohortVersionId: setup.cohort.cohortVersionId,
      propertyId: beta.propertyId,
      eventType: "applicant",
      reason: "Must fail at database boundary.",
      source: "attack fixture",
      humanConfirmed: true,
      decidedBy: setup.fixture.context.actorSubject,
      occurredAt: baseTime,
    })).rejects.toThrow();
    await expect(database.update(schema.recognitionGraphEvents).set({ relationship: "tampered" }).where(eq(schema.recognitionGraphEvents.id, graph.graphEventId))).rejects.toThrow();
  });
});

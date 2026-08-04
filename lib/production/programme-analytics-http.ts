import { getProductionDatabase } from "@/db/production/client";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { ProgrammeAnalyticsService } from "@/lib/production/programme-analytics-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export const getProductionProgrammeAnalyticsService = (
  database: ProductionDatabaseLike = getProductionDatabase(),
  storage: ObjectStorageAdapter = getProductionObjectStorage(),
) => new ProgrammeAnalyticsService(database, storage);

type Workspace = Awaited<ReturnType<ProgrammeAnalyticsService["getWorkspace"]>>;

const fields = <T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Pick<T, K> =>
  Object.fromEntries(keys.map((key) => [key, value[key]])) as Pick<T, K>;

export function presentProgrammeAnalyticsWorkspace(workspace: Workspace) {
  return {
    cohorts: workspace.cohorts.map((item) =>
      fields(item, [
        "id",
        "fundingProgrammeId",
        "canonicalKey",
        "name",
        "sponsorName",
        "description",
      ]),
    ),
    versions: workspace.versions.map((item) =>
      fields(item, [
        "id",
        "cohortId",
        "versionNumber",
        "programmeVersionId",
        "profileVersionId",
        "geography",
        "propertyClass",
        "effectiveFrom",
        "effectiveTo",
        "state",
        "methodologyVersion",
        "limitations",
        "activatedAt",
        "humanConfirmed",
        "supersedesVersionId",
      ]),
    ),
    memberships: workspace.memberships.map((item) =>
      fields(item, [
        "id",
        "cohortVersionId",
        "propertyId",
        "caseId",
        "projectId",
        "eventType",
        "reason",
        "source",
        "humanConfirmed",
        "occurredAt",
        "supersedesEventId",
      ]),
    ),
    policies: workspace.policies.map((item) =>
      fields(item, [
        "id",
        "versionNumber",
        "mode",
        "minimumCohortSize",
        "deidentificationMethod",
        "suppressionThreshold",
        "allowedMetricFamilies",
        "retentionDays",
        "deletionTreatment",
        "optInConfirmed",
        "effectiveFrom",
        "effectiveTo",
        "status",
        "supersedesVersionId",
      ]),
    ),
    reviews: workspace.reviews.map((item) =>
      fields(item, [
        "id",
        "policyVersionId",
        "decision",
        "rightsChecked",
        "privacyChecked",
        "note",
        "reviewedAt",
      ]),
    ),
    publications: workspace.publications.map((item) =>
      fields(item, [
        "id",
        "policyVersionId",
        "decision",
        "note",
        "publishedAt",
      ]),
    ),
    graphEvents: workspace.graphEvents.map((item) =>
      fields(item, [
        "id",
        "sourceAuditEventId",
        "eventType",
        "subjectType",
        "subjectId",
        "relationship",
        "objectType",
        "objectId",
        "propertyId",
        "caseId",
        "projectId",
        "programmeVersionId",
        "submissionVersionId",
        "evidenceLevel",
        "dataRightClass",
        "eventHash",
        "occurredAt",
      ]),
    ),
    baselines: workspace.baselines.map((item) =>
      fields(item, [
        "id",
        "cohortVersionId",
        "baselineType",
        "periodStart",
        "periodEnd",
        "caseCount",
        "manualMinutesPerCase",
        "manualTouchesPerCase",
        "externalCostCentsPerCase",
        "currency",
        "source",
        "sourceVersion",
        "limitations",
        "humanConfirmed",
        "confirmedAt",
      ]),
    ),
    snapshots: workspace.snapshots.map((item) =>
      fields(item, [
        "id",
        "cohortVersionId",
        "policyVersionId",
        "analyticsScope",
        "windowStart",
        "windowEnd",
        "methodologyVersion",
        "sourceDataThrough",
        "inputHash",
        "metrics",
        "denominators",
        "suppressedMetrics",
        "caveats",
        "generatedAt",
      ]),
    ),
    reports: workspace.reports.map((item) =>
      fields(item, [
        "id",
        "metricSnapshotId",
        "baselineId",
        "reportType",
        "title",
        "methodologyVersion",
        "caveats",
        "interpretationBoundary",
        "humanConfirmed",
        "generatedAt",
      ]),
    ),
    artifacts: workspace.artifacts.map((item) =>
      fields(item, [
        "id",
        "reportId",
        "format",
        "filename",
        "mimeType",
        "sizeBytes",
        "sha256",
        "generatedAt",
      ]),
    ),
    receipts: workspace.receipts.map((item) =>
      fields(item, [
        "id",
        "policyVersionId",
        "metricSnapshotId",
        "queryPurpose",
        "requestedScope",
        "distinctTenantCount",
        "distinctPropertyCount",
        "suppressionApplied",
        "suppressedFields",
        "payloadHash",
        "executedAt",
      ]),
    ),
    benefits: workspace.benefits.map((item) =>
      fields(item, [
        "id",
        "projectId",
        "stakeholderType",
        "stakeholderName",
        "expectedBenefitCategory",
        "expectedCostCents",
        "fundingContributionCents",
        "evidenceLevel",
        "timeframe",
        "uncertainty",
        "commitmentState",
        "realisedResponseState",
        "correctionOfId",
      ]),
    ),
    boundaries: workspace.boundaries,
  };
}

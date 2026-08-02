import { and, asc, desc, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import { appendAudit, digest, tenantRecord, type ProductionDatabaseLike, type TenantContext } from "@/lib/production/repository";

export class ProgrammeAnalyticsValidationError extends Error {
  constructor(message: string) { super(message); this.name = "ProgrammeAnalyticsValidationError"; }
}
export class ProgrammeAnalyticsStateError extends Error {
  constructor(message: string) { super(message); this.name = "ProgrammeAnalyticsStateError"; }
}

const required = (value: string, label: string) => {
  const normalized = value.trim();
  if (!normalized) throw new ProgrammeAnalyticsValidationError(`${label} is required.`);
  return normalized;
};
const human = (context: TenantContext, confirmed: boolean, action: string) => {
  if (context.principalType !== "membership" || !confirmed)
    throw new ProgrammeAnalyticsStateError(`${action} requires explicit confirmation by a human organization member.`);
};
const sha256 = (body: Uint8Array) => createHash("sha256").update(body).digest("hex");
const hoursBetween = (start?: string | null, end?: string | null) => start && end ? Math.max(0, (Date.parse(end) - Date.parse(start)) / 3_600_000) : null;
const average = (values: number[]) => values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
const csv = (value: unknown) => `"${String(value ?? "unavailable").replaceAll('"', '""')}"`;

export class ProgrammeAnalyticsService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createCohort(context: TenantContext, input: {
    canonicalKey: string; name: string; sponsorName: string; description: string;
    programmeVersionId: string; profileVersionId: string; geography: string; propertyClass: string;
    effectiveFrom: string; effectiveTo?: string; limitations: string; humanConfirmed: boolean;
  }) {
    assertAuthorized(context, { action: "create", resource: "programme_cohort", resourceOrganizationId: context.organizationId });
    human(context, input.humanConfirmed, "Programme cohort activation");
    const [programme] = await this.database.select({ version: schema.fundingProgrammeVersions, programme: schema.fundingProgrammes })
      .from(schema.fundingProgrammeVersions)
      .innerJoin(schema.fundingProgrammes, eq(schema.fundingProgrammes.id, schema.fundingProgrammeVersions.programmeId))
      .where(and(eq(schema.fundingProgrammeVersions.id, input.programmeVersionId), eq(schema.fundingProgrammeVersions.organizationId, context.organizationId))).limit(1);
    const publication = await this.database.select().from(schema.fundingProgrammePublications).where(and(eq(schema.fundingProgrammePublications.organizationId, context.organizationId), eq(schema.fundingProgrammePublications.programmeVersionId, input.programmeVersionId), eq(schema.fundingProgrammePublications.decision, "published"))).limit(1);
    const profile = await this.database.select().from(schema.targetProfileVersions).where(and(eq(schema.targetProfileVersions.organizationId, context.organizationId), eq(schema.targetProfileVersions.id, input.profileVersionId))).limit(1);
    const profilePublication = await this.database.select().from(schema.targetProfilePublications).where(and(eq(schema.targetProfilePublications.organizationId, context.organizationId), eq(schema.targetProfilePublications.profileVersionId, input.profileVersionId), eq(schema.targetProfilePublications.decision, "published"))).limit(1);
    if (!programme || !publication[0] || !profile[0] || !profilePublication[0]) throw new ProgrammeAnalyticsStateError("An active cohort requires an exact published funding-programme version and published target profile.");
    if (programme.version.targetProfileVersionId && programme.version.targetProfileVersionId !== input.profileVersionId)
      throw new ProgrammeAnalyticsStateError("The cohort profile must match the programme's exact target-profile pin.");
    if (!programme.version.propertyClasses.includes(input.propertyClass)) throw new ProgrammeAnalyticsStateError("The cohort property class is outside the published programme scope.");
    const existing = await this.database.select().from(schema.programmeCohorts).where(and(eq(schema.programmeCohorts.organizationId, context.organizationId), eq(schema.programmeCohorts.canonicalKey, required(input.canonicalKey, "Cohort key")))).limit(1);
    if (existing[0]) throw new ProgrammeAnalyticsStateError("Use an immutable successor version for an existing cohort.");
    const at = this.clock().toISOString(), cohortId = randomUUID(), cohortVersionId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.programmeCohorts).values({ id: cohortId, ...tenantRecord(context, at), fundingProgrammeId: programme.programme.id, canonicalKey: required(input.canonicalKey, "Cohort key"), name: required(input.name, "Cohort name"), sponsorName: required(input.sponsorName, "Sponsor"), description: required(input.description, "Description"), ownerSubject: context.actorSubject });
      await db.insert(schema.programmeCohortVersions).values({ id: cohortVersionId, ...tenantRecord(context, at), cohortId, versionNumber: 1, programmeVersionId: input.programmeVersionId, profileVersionId: input.profileVersionId, geography: required(input.geography, "Geography"), propertyClass: required(input.propertyClass, "Property class"), effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo, state: "active", methodologyVersion: "fortify-programme-cohort-1", limitations: required(input.limitations, "Limitations"), authorSubject: context.actorSubject, activatedBy: context.actorSubject, activatedAt: at, humanConfirmed: true });
      await appendAudit(db, context, { action: "programme_cohort.activated", resourceType: "programme_cohort_version", resourceId: cohortVersionId, detail: { cohortId, programmeVersionId: input.programmeVersionId, profileVersionId: input.profileVersionId, geography: input.geography, propertyClass: input.propertyClass, outcomeImplied: false }, occurredAt: at });
    });
    return { cohortId, cohortVersionId, state: "active" as const };
  }

  async recordMembershipEvent(context: TenantContext, input: {
    cohortVersionId: string; propertyId: string; caseId?: string; projectId?: string;
    eventType: "applicant" | "qualified" | "ineligible" | "insufficient_evidence" | "project_started" | "project_completed" | "removed" | "corrected";
    reason: string; source: string; supersedesEventId?: string; humanConfirmed: boolean;
  }) {
    assertAuthorized(context, { action: "create", resource: "programme_cohort_membership_event", resourceOrganizationId: context.organizationId, caseId: input.caseId, projectId: input.projectId });
    human(context, input.humanConfirmed, "Cohort membership decision");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.programmeCohortMembershipEvents).values({ id, ...tenantRecord(context, at), cohortVersionId: input.cohortVersionId, propertyId: input.propertyId, caseId: input.caseId, projectId: input.projectId, eventType: input.eventType, reason: required(input.reason, "Membership reason"), source: required(input.source, "Membership source"), humanConfirmed: true, decidedBy: context.actorSubject, occurredAt: at, supersedesEventId: input.supersedesEventId });
      await appendAudit(db, context, { action: `programme_cohort.${input.eventType}`, resourceType: "programme_cohort_membership_event", resourceId: id, detail: { cohortVersionId: input.cohortVersionId, propertyId: input.propertyId, caseId: input.caseId ?? null, projectId: input.projectId ?? null, source: input.source }, occurredAt: at });
    });
    return { membershipEventId: id, eventType: input.eventType };
  }

  async createAnalyticsPolicy(context: TenantContext, input: {
    mode: "tenant_only" | "cross_customer_opt_in"; contractReference?: string; minimumCohortSize: number;
    deidentificationMethod: string; suppressionThreshold: number; allowedMetricFamilies: string[];
    retentionDays: number; deletionTreatment: string; optInConfirmed: boolean; effectiveFrom: string;
  }) {
    assertAuthorized(context, { action: "create", resource: "analytics_policy_version", resourceOrganizationId: context.organizationId });
    human(context, input.optInConfirmed || input.mode === "tenant_only", "Analytics policy authoring");
    if (input.mode === "cross_customer_opt_in" && !input.contractReference?.trim()) throw new ProgrammeAnalyticsValidationError("Cross-customer policy requires an exact contractual permission reference.");
    if (input.minimumCohortSize < 10 || input.suppressionThreshold < 10) throw new ProgrammeAnalyticsValidationError("Cross-customer privacy thresholds cannot be lower than 10.");
    const prior = await this.database.select().from(schema.analyticsPolicyVersions).where(eq(schema.analyticsPolicyVersions.organizationId, context.organizationId)).orderBy(desc(schema.analyticsPolicyVersions.versionNumber)).limit(1);
    const at = this.clock().toISOString(), id = randomUUID(), versionNumber = (prior[0]?.versionNumber ?? 0) + 1;
    await this.database.insert(schema.analyticsPolicyVersions).values({ id, ...tenantRecord(context, at), versionNumber, mode: input.mode, contractReference: input.contractReference, minimumCohortSize: input.minimumCohortSize, deidentificationMethod: required(input.deidentificationMethod, "De-identification method"), suppressionThreshold: input.suppressionThreshold, allowedMetricFamilies: input.allowedMetricFamilies, retentionDays: input.retentionDays, deletionTreatment: required(input.deletionTreatment, "Deletion treatment"), optInConfirmed: input.mode === "tenant_only" ? false : input.optInConfirmed, authorSubject: context.actorSubject, effectiveFrom: input.effectiveFrom, status: "draft", supersedesVersionId: prior[0]?.id });
    await appendAudit(this.database, context, { action: "analytics_policy.authored", resourceType: "analytics_policy_version", resourceId: id, detail: { versionNumber, mode: input.mode, minimumCohortSize: input.minimumCohortSize, suppressionThreshold: input.suppressionThreshold, crossCustomerQueryEnabled: false }, occurredAt: at });
    return { policyVersionId: id, versionNumber, status: "draft" as const };
  }

  async reviewAnalyticsPolicy(context: TenantContext, input: { policyVersionId: string; decision: "approved" | "rejected" | "changes_requested"; note: string; rightsChecked: boolean; privacyChecked: boolean }) {
    assertAuthorized(context, { action: "create", resource: "analytics_policy_review", resourceOrganizationId: context.organizationId });
    human(context, true, "Analytics policy review");
    const version = await this.policy(context, input.policyVersionId);
    if (version.authorSubject === context.actorSubject) throw new ProgrammeAnalyticsStateError("Analytics policy author and reviewer must be different humans.");
    if (input.decision === "approved" && (!input.rightsChecked || !input.privacyChecked)) throw new ProgrammeAnalyticsStateError("Approval requires explicit rights and privacy checks.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.analyticsPolicyReviews).values({ id, ...tenantRecord(context, at), policyVersionId: input.policyVersionId, decision: input.decision, reviewerSubject: context.actorSubject, rightsChecked: input.rightsChecked, privacyChecked: input.privacyChecked, note: required(input.note, "Review note"), reviewedAt: at });
      await db.update(schema.analyticsPolicyVersions).set({ status: input.decision === "approved" ? "reviewed" : "draft", updatedBy: context.actorSubject, updatedAt: at, revision: version.revision + 1 }).where(and(eq(schema.analyticsPolicyVersions.id, version.id), eq(schema.analyticsPolicyVersions.organizationId, context.organizationId), eq(schema.analyticsPolicyVersions.revision, version.revision)));
      await appendAudit(db, context, { action: `analytics_policy.${input.decision}`, resourceType: "analytics_policy_review", resourceId: id, detail: { policyVersionId: input.policyVersionId, rightsChecked: input.rightsChecked, privacyChecked: input.privacyChecked }, occurredAt: at });
    });
    return { reviewId: id, decision: input.decision };
  }

  async publishAnalyticsPolicy(context: TenantContext, input: { policyVersionId: string; decision: "published" | "rejected"; note: string; humanConfirmed: boolean }) {
    assertAuthorized(context, { action: "create", resource: "analytics_policy_publication", resourceOrganizationId: context.organizationId });
    human(context, input.humanConfirmed, "Analytics policy publication");
    const version = await this.policy(context, input.policyVersionId);
    const review = await this.database.select().from(schema.analyticsPolicyReviews).where(and(eq(schema.analyticsPolicyReviews.organizationId, context.organizationId), eq(schema.analyticsPolicyReviews.policyVersionId, input.policyVersionId), eq(schema.analyticsPolicyReviews.decision, "approved"))).limit(1);
    if (!review[0] || version.status !== "reviewed") throw new ProgrammeAnalyticsStateError("Only an independently approved analytics policy can be published.");
    if ([version.authorSubject, review[0].reviewerSubject].includes(context.actorSubject)) throw new ProgrammeAnalyticsStateError("Policy author, reviewer, and publisher must be different humans.");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.analyticsPolicyPublications).values({ id, ...tenantRecord(context, at), policyVersionId: input.policyVersionId, decision: input.decision, publisherSubject: context.actorSubject, note: required(input.note, "Publication note"), publishedAt: at });
      await db.update(schema.analyticsPolicyVersions).set({ status: input.decision === "published" ? "published" : "withdrawn", updatedBy: context.actorSubject, updatedAt: at, revision: version.revision + 1 }).where(and(eq(schema.analyticsPolicyVersions.id, version.id), eq(schema.analyticsPolicyVersions.organizationId, context.organizationId), eq(schema.analyticsPolicyVersions.revision, version.revision)));
      await appendAudit(db, context, { action: `analytics_policy.${input.decision}`, resourceType: "analytics_policy_publication", resourceId: id, detail: { policyVersionId: input.policyVersionId, mode: version.mode, aggregateExecuted: false }, occurredAt: at });
    });
    return { publicationId: id, decision: input.decision };
  }

  async recordWorkflowBaseline(context: TenantContext, input: {
    cohortVersionId?: string; baselineType: "brokerage_workflow" | "programme_operations";
    periodStart: string; periodEnd: string; caseCount: number; manualMinutesPerCase: number;
    manualTouchesPerCase: number; externalCostCentsPerCase: number; currency: string;
    source: string; sourceVersion: string; limitations: string; humanConfirmed: boolean;
  }) {
    assertAuthorized(context, { action: "create", resource: "workflow_baseline", resourceOrganizationId: context.organizationId });
    human(context, input.humanConfirmed, "Workflow baseline confirmation");
    const at = this.clock().toISOString(), id = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.workflowBaselines).values({ id, ...tenantRecord(context, at), ...input, currency: required(input.currency, "Currency"), source: required(input.source, "Baseline source"), sourceVersion: required(input.sourceVersion, "Baseline source version"), limitations: required(input.limitations, "Baseline limitations"), humanConfirmed: true, confirmedBy: context.actorSubject, confirmedAt: at });
      await appendAudit(db, context, { action: "workflow_baseline.confirmed", resourceType: "workflow_baseline", resourceId: id, detail: { baselineType: input.baselineType, periodStart: input.periodStart, periodEnd: input.periodEnd, caseCount: input.caseCount, source: input.source, causalClaim: false }, occurredAt: at });
    });
    return { baselineId: id };
  }

  async recordRecognitionGraphEvent(context: TenantContext, input: {
    sourceAuditEventId: string; eventType: string; relationship: string; objectType: string; objectId: string;
    propertyId?: string; caseId?: string; projectId?: string; programmeVersionId?: string; submissionVersionId?: string;
    evidenceLevel?: string; dataRightClass: "software_telemetry" | "deidentified_derived_event" | "property_specific_data" | "customer_specific_playbook" | "carrier_confidential_material" | "model_provider_restricted";
    attributes?: Record<string, unknown>;
  }) {
    assertAuthorized(context, { action: "create", resource: "recognition_graph_event", resourceOrganizationId: context.organizationId, caseId: input.caseId, projectId: input.projectId });
    const source = await this.database.select().from(schema.auditEvents).where(and(eq(schema.auditEvents.organizationId, context.organizationId), eq(schema.auditEvents.id, input.sourceAuditEventId))).limit(1);
    if (!source[0]) throw new ProgrammeAnalyticsStateError("Recognition graph events require an exact same-tenant audit event.");
    await this.assertOptionalReferences(context, input);
    const at = source[0].occurredAt, id = randomUUID();
    const eventHash = digest({ organizationId: context.organizationId, sourceAuditEventHash: source[0].eventHash, eventType: required(input.eventType, "Graph event type"), subjectType: source[0].resourceType, subjectId: source[0].resourceId, relationship: required(input.relationship, "Graph relationship"), objectType: required(input.objectType, "Graph object type"), objectId: required(input.objectId, "Graph object"), propertyId: input.propertyId ?? null, caseId: input.caseId ?? null, projectId: input.projectId ?? null, programmeVersionId: input.programmeVersionId ?? null, submissionVersionId: input.submissionVersionId ?? null, evidenceLevel: input.evidenceLevel ?? null, dataRightClass: input.dataRightClass, attributes: input.attributes ?? {}, occurredAt: at });
    const existing = await this.database.select().from(schema.recognitionGraphEvents).where(and(eq(schema.recognitionGraphEvents.organizationId, context.organizationId), eq(schema.recognitionGraphEvents.eventHash, eventHash))).limit(1);
    if (existing[0]) return { graphEventId: existing[0].id, eventHash, replayed: true };
    await this.database.insert(schema.recognitionGraphEvents).values({ id, ...tenantRecord(context, at), sourceAuditEventId: input.sourceAuditEventId, eventType: input.eventType, subjectType: source[0].resourceType, subjectId: source[0].resourceId, relationship: input.relationship, objectType: input.objectType, objectId: input.objectId, propertyId: input.propertyId, caseId: input.caseId, projectId: input.projectId, programmeVersionId: input.programmeVersionId, submissionVersionId: input.submissionVersionId, evidenceLevel: input.evidenceLevel, dataRightClass: input.dataRightClass, attributes: input.attributes ?? {}, eventHash, occurredAt: at });
    return { graphEventId: id, eventHash, replayed: false };
  }

  async generateMetricSnapshot(context: TenantContext, input: { cohortVersionId: string; policyVersionId: string; analyticsScope: "tenant_only" | "cross_customer_opt_in"; windowStart: string; windowEnd: string }) {
    assertAuthorized(context, { action: "create", resource: "programme_metric_snapshot", resourceOrganizationId: context.organizationId });
    const [cohort] = await this.database.select().from(schema.programmeCohortVersions).where(and(eq(schema.programmeCohortVersions.organizationId, context.organizationId), eq(schema.programmeCohortVersions.id, input.cohortVersionId), eq(schema.programmeCohortVersions.state, "active"))).limit(1);
    const policy = await this.publishedPolicy(context, input.policyVersionId);
    if (!cohort) throw new ProgrammeAnalyticsStateError("Metrics require an active same-tenant cohort version.");
    if (input.analyticsScope !== "tenant_only" || policy.mode !== "tenant_only") throw new ProgrammeAnalyticsStateError("Cross-customer aggregation is fail-closed; a published opt-in policy does not grant this tenant-scoped service cross-tenant authority.");
    const dataset = await this.dataset(context, cohort.id, input.windowStart, input.windowEnd);
    const inputHash = digest(dataset.inputLineage);
    const existing = await this.database.select().from(schema.programmeMetricSnapshots).where(and(eq(schema.programmeMetricSnapshots.organizationId, context.organizationId), eq(schema.programmeMetricSnapshots.cohortVersionId, cohort.id), eq(schema.programmeMetricSnapshots.inputHash, inputHash))).limit(1);
    if (existing[0]) return { snapshotId: existing[0].id, metrics: existing[0].metrics, replayed: true };
    const at = this.clock().toISOString(), id = randomUUID(), receiptId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.programmeMetricSnapshots).values({ id, ...tenantRecord(context, at), cohortVersionId: cohort.id, policyVersionId: policy.id, analyticsScope: "tenant_only", windowStart: input.windowStart, windowEnd: input.windowEnd, methodologyVersion: "fortify-descriptive-analytics-1", sourceDataThrough: input.windowEnd, inputHash, metrics: dataset.metrics, denominators: dataset.denominators, suppressedMetrics: [], caveats: dataset.caveats, generatedBy: context.actorSubject, generatedAt: at });
      await db.insert(schema.analyticsQueryReceipts).values({ id: receiptId, ...tenantRecord(context, at), policyVersionId: policy.id, metricSnapshotId: id, queryPurpose: "Tenant programme operations and brokerage workflow reporting", requestedScope: "tenant_only", distinctTenantCount: 1, distinctPropertyCount: dataset.propertyCount, suppressionApplied: false, suppressedFields: [], payloadHash: digest({ inputHash, metrics: dataset.metrics, denominators: dataset.denominators }), executedBy: context.actorSubject, executedAt: at });
      await appendAudit(db, context, { action: "programme_metrics.snapshotted", resourceType: "programme_metric_snapshot", resourceId: id, detail: { cohortVersionId: cohort.id, analyticsScope: "tenant_only", propertyCount: dataset.propertyCount, inputHash, predictiveModel: false, causalClaim: false }, occurredAt: at });
    });
    return { snapshotId: id, metrics: dataset.metrics, denominators: dataset.denominators, caveats: dataset.caveats, replayed: false };
  }

  async generateReport(context: TenantContext, input: { metricSnapshotId: string; baselineId?: string; reportType: "brokerage_roi" | "programme_outcome"; humanConfirmed: boolean }) {
    assertAuthorized(context, { action: "create", resource: "analytics_report", resourceOrganizationId: context.organizationId });
    human(context, input.humanConfirmed, "Analytics report generation");
    const snapshot = await this.database.select().from(schema.programmeMetricSnapshots).where(and(eq(schema.programmeMetricSnapshots.organizationId, context.organizationId), eq(schema.programmeMetricSnapshots.id, input.metricSnapshotId), eq(schema.programmeMetricSnapshots.analyticsScope, "tenant_only"))).limit(1);
    if (!snapshot[0]) throw new ProgrammeAnalyticsStateError("Report generation requires an exact tenant-only metric snapshot.");
    const baseline = input.baselineId ? await this.database.select().from(schema.workflowBaselines).where(and(eq(schema.workflowBaselines.organizationId, context.organizationId), eq(schema.workflowBaselines.id, input.baselineId))).limit(1) : [];
    if (input.reportType === "brokerage_roi" && !baseline[0]) throw new ProgrammeAnalyticsStateError("Brokerage ROI reporting requires a human-confirmed workflow baseline.");
    const cohort = await this.database.select().from(schema.programmeCohortVersions).where(and(eq(schema.programmeCohortVersions.organizationId, context.organizationId), eq(schema.programmeCohortVersions.id, snapshot[0].cohortVersionId))).limit(1);
    const programme = cohort[0] ? await this.database.select().from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, cohort[0].programmeVersionId))).limit(1) : [];
    const profileDependencies = cohort[0] ? await this.database.select().from(schema.governedSourceDependencies).where(and(eq(schema.governedSourceDependencies.organizationId, context.organizationId), eq(schema.governedSourceDependencies.consumerType, "target_profile_version"), eq(schema.governedSourceDependencies.consumerId, cohort[0].profileVersionId))) : [];
    if (!cohort[0] || !programme[0]) throw new ProgrammeAnalyticsStateError("Report generation requires exact cohort and programme source lineage.");
    const sourceVersionIds = [...new Set([programme[0].governedSourceVersionId, ...profileDependencies.map((item) => item.sourceVersionId)])].sort();
    const existing = await this.database.select().from(schema.analyticsReports).where(and(eq(schema.analyticsReports.organizationId, context.organizationId), eq(schema.analyticsReports.metricSnapshotId, input.metricSnapshotId), eq(schema.analyticsReports.reportType, input.reportType))).limit(1);
    if (existing[0]) return { reportId: existing[0].id, replayed: true };
    const at = this.clock().toISOString(), reportId = randomUUID();
    const boundary = input.reportType === "brokerage_roi"
      ? "Operational baseline and observed workflow measures are shown separately. No premium, claims, causal savings, or return is attributed to Fortify."
      : "Descriptive programme counts do not establish caused loss reduction, insurance availability, funding efficacy, or counterfactual impact.";
    const payload = { schemaVersion: "fortify.analytics-report.1", reportId, reportType: input.reportType, metricSnapshotId: snapshot[0].id, generatedAt: at, methodologyVersion: snapshot[0].methodologyVersion, analyticsScope: snapshot[0].analyticsScope, sourceVersionIds, metrics: snapshot[0].metrics, denominators: snapshot[0].denominators, baseline: baseline[0] ? { id: baseline[0].id, source: baseline[0].source, sourceVersion: baseline[0].sourceVersion, caseCount: baseline[0].caseCount, manualMinutesPerCase: baseline[0].manualMinutesPerCase, manualTouchesPerCase: baseline[0].manualTouchesPerCase, externalCostCentsPerCase: baseline[0].externalCostCentsPerCase, limitations: baseline[0].limitations } : null, caveats: [...snapshot[0].caveats, boundary], interpretationBoundary: boundary };
    const title = input.reportType === "brokerage_roi" ? "Brokerage workflow value report" : "Programme outcome report";
    const jsonBody = new TextEncoder().encode(`${JSON.stringify(payload, null, 2)}\n`);
    const csvRows = [["metric", "value", "denominator"], ...Object.entries(snapshot[0].metrics).map(([key, value]) => [key, value, snapshot[0].denominators[key] ?? "not_applicable"]), ["interpretation_boundary", boundary, "not_applicable"]];
    const csvBody = new TextEncoder().encode(`${csvRows.map((row) => row.map(csv).join(",")).join("\n")}\n`);
    const artifacts = [{ format: "json" as const, mimeType: "application/json", filename: `${input.reportType}-${reportId}.json`, body: jsonBody }, { format: "csv" as const, mimeType: "text/csv", filename: `${input.reportType}-${reportId}.csv`, body: csvBody }].map((item) => ({ ...item, sha256: sha256(item.body), storageObjectId: randomUUID(), artifactId: randomUUID(), objectKey: `tenants/${context.organizationId}/generated/analytics/${reportId}/${item.filename}`, encryptionMode: "AES256" as "AES256" | "aws:kms" }));
    try {
      for (const artifact of artifacts) {
        await this.storage.put({ key: artifact.objectKey, body: artifact.body, mimeType: artifact.mimeType, sha256: artifact.sha256 });
        const [head, readback] = await Promise.all([this.storage.head(artifact.objectKey), this.storage.read(artifact.objectKey)]);
        if (!head || head.sha256 !== artifact.sha256 || head.sizeBytes !== artifact.body.byteLength || sha256(readback) !== artifact.sha256) throw new ProgrammeAnalyticsStateError("Generated report failed exact-byte readback.");
        artifact.encryptionMode = head.encryptionMode;
      }
      await this.database.transaction(async (transaction) => {
        const db = transaction as unknown as ProductionDatabaseLike;
        await db.insert(schema.analyticsReports).values({ id: reportId, ...tenantRecord(context, at), metricSnapshotId: snapshot[0].id, baselineId: baseline[0]?.id, reportType: input.reportType, title, methodologyVersion: snapshot[0].methodologyVersion, metricPayload: payload, caveats: payload.caveats, interpretationBoundary: boundary, humanConfirmed: true, generatedBy: context.actorSubject, generatedAt: at });
        await db.insert(schema.governedSourceDependencies).values(sourceVersionIds.map((sourceVersionId) => ({ id: randomUUID(), ...tenantRecord(context, at), sourceVersionId, consumerType: "analytics_report", consumerId: reportId, relationship: "input_lineage", rationale: "Exact source version pinned by generated analytics report.", pinnedAt: at, pinnedBy: context.actorSubject })));
        for (const artifact of artifacts) {
          await db.insert(schema.storageObjects).values({ id: artifact.storageObjectId, ...tenantRecord(context, at), provider: this.storage.provider, bucket: this.storage.bucket, objectKey: artifact.objectKey, originalFilename: artifact.filename, mimeType: artifact.mimeType, sizeBytes: artifact.body.byteLength, sha256: artifact.sha256, checksumAlgorithm: "sha256", encryptionMode: artifact.encryptionMode, state: "clean", scanStatus: "clean" });
          await db.insert(schema.malwareScanResults).values({ id: randomUUID(), ...tenantRecord(context, at), storageObjectId: artifact.storageObjectId, scanner: "fortify-internal-generator", engineVersion: "fortify-analytics-report-1", status: "clean", findings: [], scannedAt: at });
          await db.insert(schema.analyticsReportArtifacts).values({ id: artifact.artifactId, ...tenantRecord(context, at), reportId, storageObjectId: artifact.storageObjectId, format: artifact.format, filename: artifact.filename, mimeType: artifact.mimeType, sizeBytes: artifact.body.byteLength, sha256: artifact.sha256, generatedAt: at });
        }
        await appendAudit(db, context, { action: "analytics_report.generated", resourceType: "analytics_report", resourceId: reportId, detail: { reportType: input.reportType, metricSnapshotId: snapshot[0].id, baselineId: baseline[0]?.id ?? null, artifactHashes: artifacts.map(({ format, sha256: hash }) => ({ format, sha256: hash })), exactByteReadback: true, predictiveModel: false, causalClaim: false }, occurredAt: at });
      });
    } catch (error) {
      await Promise.allSettled(artifacts.map((artifact) => this.storage.delete(artifact.objectKey)));
      throw error;
    }
    return { reportId, reportType: input.reportType, artifacts: artifacts.map(({ format, filename, sha256: hash, body }) => ({ format, filename, sha256: hash, sizeBytes: body.byteLength })), replayed: false };
  }

  async readReportArtifact(context: TenantContext, reportId: string, format: "json" | "csv") {
    assertAuthorized(context, { action: "read", resource: "analytics_report_artifact", resourceOrganizationId: context.organizationId });
    const rows = await this.database.select({ artifact: schema.analyticsReportArtifacts, storage: schema.storageObjects }).from(schema.analyticsReportArtifacts).innerJoin(schema.storageObjects, eq(schema.storageObjects.id, schema.analyticsReportArtifacts.storageObjectId)).where(and(eq(schema.analyticsReportArtifacts.organizationId, context.organizationId), eq(schema.analyticsReportArtifacts.reportId, reportId), eq(schema.analyticsReportArtifacts.format, format))).limit(1);
    if (!rows[0]) throw new ProgrammeAnalyticsStateError("Report artifact was not found in the active tenant.");
    const body = await this.storage.read(rows[0].storage.objectKey);
    if (body.byteLength !== rows[0].artifact.sizeBytes || sha256(body) !== rows[0].artifact.sha256) throw new ProgrammeAnalyticsStateError("Report artifact failed exact-byte readback.");
    return { body, filename: rows[0].artifact.filename, mimeType: rows[0].artifact.mimeType, sha256: rows[0].artifact.sha256 };
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, { action: "read", resource: "programme_cohort", resourceOrganizationId: context.organizationId });
    const organizationId = context.organizationId;
    const [cohorts, versions, memberships, policies, reviews, publications, graphEvents, baselines, snapshots, reports, artifacts, receipts, benefits] = await Promise.all([
      this.database.select().from(schema.programmeCohorts).where(eq(schema.programmeCohorts.organizationId, organizationId)),
      this.database.select().from(schema.programmeCohortVersions).where(eq(schema.programmeCohortVersions.organizationId, organizationId)).orderBy(desc(schema.programmeCohortVersions.versionNumber)),
      this.database.select().from(schema.programmeCohortMembershipEvents).where(eq(schema.programmeCohortMembershipEvents.organizationId, organizationId)).orderBy(asc(schema.programmeCohortMembershipEvents.occurredAt)),
      this.database.select().from(schema.analyticsPolicyVersions).where(eq(schema.analyticsPolicyVersions.organizationId, organizationId)).orderBy(desc(schema.analyticsPolicyVersions.versionNumber)),
      this.database.select().from(schema.analyticsPolicyReviews).where(eq(schema.analyticsPolicyReviews.organizationId, organizationId)),
      this.database.select().from(schema.analyticsPolicyPublications).where(eq(schema.analyticsPolicyPublications.organizationId, organizationId)),
      this.database.select().from(schema.recognitionGraphEvents).where(eq(schema.recognitionGraphEvents.organizationId, organizationId)).orderBy(desc(schema.recognitionGraphEvents.occurredAt)),
      this.database.select().from(schema.workflowBaselines).where(eq(schema.workflowBaselines.organizationId, organizationId)).orderBy(desc(schema.workflowBaselines.confirmedAt)),
      this.database.select().from(schema.programmeMetricSnapshots).where(eq(schema.programmeMetricSnapshots.organizationId, organizationId)).orderBy(desc(schema.programmeMetricSnapshots.generatedAt)),
      this.database.select().from(schema.analyticsReports).where(eq(schema.analyticsReports.organizationId, organizationId)).orderBy(desc(schema.analyticsReports.generatedAt)),
      this.database.select().from(schema.analyticsReportArtifacts).where(eq(schema.analyticsReportArtifacts.organizationId, organizationId)),
      this.database.select().from(schema.analyticsQueryReceipts).where(eq(schema.analyticsQueryReceipts.organizationId, organizationId)).orderBy(desc(schema.analyticsQueryReceipts.executedAt)),
      this.database.select().from(schema.stakeholderBenefitLedgerEntries).where(eq(schema.stakeholderBenefitLedgerEntries.organizationId, organizationId)),
    ]);
    return { cohorts, versions, memberships, policies, reviews, publications, graphEvents, baselines, snapshots, reports, artifacts, receipts, benefits, boundaries: { scope: "tenant_only", crossCustomerAggregation: "disabled_without_separate_authority", predictiveAcceptance: false, premiumAttribution: false, causalLossReduction: false } };
  }

  private async policy(context: TenantContext, id: string) {
    const rows = await this.database.select().from(schema.analyticsPolicyVersions).where(and(eq(schema.analyticsPolicyVersions.organizationId, context.organizationId), eq(schema.analyticsPolicyVersions.id, id))).limit(1);
    if (!rows[0]) throw new ProgrammeAnalyticsStateError("Analytics policy version was not found in the active tenant.");
    return rows[0];
  }

  private async publishedPolicy(context: TenantContext, id: string) {
    const policy = await this.policy(context, id);
    const publication = await this.database.select().from(schema.analyticsPolicyPublications).where(and(eq(schema.analyticsPolicyPublications.organizationId, context.organizationId), eq(schema.analyticsPolicyPublications.policyVersionId, id), eq(schema.analyticsPolicyPublications.decision, "published"))).limit(1);
    if (policy.status !== "published" || !publication[0]) throw new ProgrammeAnalyticsStateError("Analytics requires an independently reviewed and published policy version.");
    return policy;
  }

  private async assertOptionalReferences(context: TenantContext, input: { propertyId?: string; caseId?: string; projectId?: string; programmeVersionId?: string; submissionVersionId?: string }) {
    const checks = await Promise.all([
      input.propertyId ? this.database.select({ id: schema.properties.id }).from(schema.properties).where(and(eq(schema.properties.organizationId, context.organizationId), eq(schema.properties.id, input.propertyId))).limit(1) : Promise.resolve([{ id: "none" }]),
      input.caseId ? this.database.select({ id: schema.renewalCases.id }).from(schema.renewalCases).where(and(eq(schema.renewalCases.organizationId, context.organizationId), eq(schema.renewalCases.id, input.caseId))).limit(1) : Promise.resolve([{ id: "none" }]),
      input.projectId ? this.database.select({ id: schema.resilienceProjects.id }).from(schema.resilienceProjects).where(and(eq(schema.resilienceProjects.organizationId, context.organizationId), eq(schema.resilienceProjects.id, input.projectId))).limit(1) : Promise.resolve([{ id: "none" }]),
      input.programmeVersionId ? this.database.select({ id: schema.fundingProgrammeVersions.id }).from(schema.fundingProgrammeVersions).where(and(eq(schema.fundingProgrammeVersions.organizationId, context.organizationId), eq(schema.fundingProgrammeVersions.id, input.programmeVersionId))).limit(1) : Promise.resolve([{ id: "none" }]),
      input.submissionVersionId ? this.database.select({ id: schema.submissionVersions.id }).from(schema.submissionVersions).where(and(eq(schema.submissionVersions.organizationId, context.organizationId), eq(schema.submissionVersions.id, input.submissionVersionId))).limit(1) : Promise.resolve([{ id: "none" }]),
    ]);
    if (checks.some((rows) => !rows[0])) throw new ProgrammeAnalyticsStateError("Recognition graph references must resolve inside the active tenant.");
  }

  private async dataset(context: TenantContext, cohortVersionId: string, windowStart: string, windowEnd: string) {
    const organizationId = context.organizationId;
    const [membershipEvents, projects, assessments, milestones, milestoneEvents, projectInterventions, findings, findingReviews, policies, cases, submissions, versions, deliveries, evidenceResponses, modelResponses, ratingResponses, underwritingResponses, placementResponses, maintenance, benefits, stacks, audit] = await Promise.all([
      this.database.select().from(schema.programmeCohortMembershipEvents).where(and(eq(schema.programmeCohortMembershipEvents.organizationId, organizationId), eq(schema.programmeCohortMembershipEvents.cohortVersionId, cohortVersionId))).orderBy(asc(schema.programmeCohortMembershipEvents.occurredAt), asc(schema.programmeCohortMembershipEvents.id)),
      this.database.select().from(schema.resilienceProjects).where(eq(schema.resilienceProjects.organizationId, organizationId)),
      this.database.select().from(schema.fundingEligibilityAssessments).where(eq(schema.fundingEligibilityAssessments.organizationId, organizationId)),
      this.database.select().from(schema.projectMilestones).where(eq(schema.projectMilestones.organizationId, organizationId)),
      this.database.select().from(schema.projectMilestoneEvents).where(eq(schema.projectMilestoneEvents.organizationId, organizationId)),
      this.database.select().from(schema.projectInterventions).where(eq(schema.projectInterventions.organizationId, organizationId)),
      this.database.select().from(schema.verificationFindings).where(eq(schema.verificationFindings.organizationId, organizationId)),
      this.database.select().from(schema.verificationFindingReviews).where(eq(schema.verificationFindingReviews.organizationId, organizationId)),
      this.database.select().from(schema.policies).where(eq(schema.policies.organizationId, organizationId)),
      this.database.select().from(schema.renewalCases).where(eq(schema.renewalCases.organizationId, organizationId)),
      this.database.select().from(schema.submissions).where(eq(schema.submissions.organizationId, organizationId)),
      this.database.select().from(schema.submissionVersions).where(eq(schema.submissionVersions.organizationId, organizationId)),
      this.database.select().from(schema.submissionDeliveries).where(eq(schema.submissionDeliveries.organizationId, organizationId)),
      this.database.select().from(schema.evidenceAcceptanceEvents).where(eq(schema.evidenceAcceptanceEvents.organizationId, organizationId)),
      this.database.select().from(schema.modelResponseEvents).where(eq(schema.modelResponseEvents.organizationId, organizationId)),
      this.database.select().from(schema.ratingTreatmentEvents).where(eq(schema.ratingTreatmentEvents.organizationId, organizationId)),
      this.database.select().from(schema.underwritingTreatmentEvents).where(eq(schema.underwritingTreatmentEvents.organizationId, organizationId)),
      this.database.select().from(schema.placementResponseEvents).where(eq(schema.placementResponseEvents.organizationId, organizationId)),
      this.database.select().from(schema.maintenanceRollForwards).where(eq(schema.maintenanceRollForwards.organizationId, organizationId)),
      this.database.select().from(schema.stakeholderBenefitLedgerEntries).where(eq(schema.stakeholderBenefitLedgerEntries.organizationId, organizationId)),
      this.database.select().from(schema.capitalStacks).where(eq(schema.capitalStacks.organizationId, organizationId)),
      this.database.select().from(schema.auditEvents).where(eq(schema.auditEvents.organizationId, organizationId)),
    ]);
    const latest = new Map<string, (typeof membershipEvents)[number]>();
    for (const event of membershipEvents) latest.set(event.propertyId, event);
    const includedStates = new Set(["applicant", "qualified", "project_started", "project_completed", "corrected"]);
    const propertyIds = new Set([...latest.values()].filter((event) => includedStates.has(event.eventType)).map((event) => event.propertyId));
    const scopedProjects = projects.filter((project) => propertyIds.has(project.propertyId));
    const projectIds = new Set(scopedProjects.map((project) => project.id));
    const scopedAssessments = assessments.filter((item) => projectIds.has(item.projectId));
    const scopedMilestones = milestones.filter((item) => projectIds.has(item.projectId));
    const milestoneIds = new Set(scopedMilestones.map((item) => item.id));
    const latestMilestone = new Map<string, (typeof milestoneEvents)[number]>();
    for (const event of milestoneEvents.filter((item) => milestoneIds.has(item.milestoneId)).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))) latestMilestone.set(event.milestoneId, event);
    const interventionIds = new Set(projectInterventions.filter((item) => projectIds.has(item.projectId)).map((item) => item.id));
    const approvedFindingIds = new Set(findingReviews.filter((review) => review.decision === "approved").map((review) => review.findingId));
    const scopedFindings = findings.filter((finding) => interventionIds.has(finding.projectInterventionId) && approvedFindingIds.has(finding.id));
    const policyProperty = new Map(policies.map((policy) => [policy.id, policy.propertyId]));
    const caseProperty = new Map(cases.map((item) => [item.id, policyProperty.get(item.policyId)]));
    const scopedCases = cases.filter((item) => propertyIds.has(caseProperty.get(item.id) ?? ""));
    const caseIds = new Set(scopedCases.map((item) => item.id));
    const scopedSubmissions = submissions.filter((item) => caseIds.has(item.caseId));
    const submissionIds = new Set(scopedSubmissions.map((item) => item.id));
    const scopedVersions = versions.filter((item) => submissionIds.has(item.submissionId));
    const versionIds = new Set(scopedVersions.map((item) => item.id));
    const delivered = deliveries.filter((item) => versionIds.has(item.submissionVersionId) && item.status === "delivered");
    const deliveryHours = delivered.flatMap((delivery) => {
      const version = scopedVersions.find((item) => item.id === delivery.submissionVersionId);
      const submission = scopedSubmissions.find((item) => item.id === version?.submissionId);
      const renewalCase = scopedCases.find((item) => item.id === submission?.caseId);
      const value = hoursBetween(renewalCase?.createdAt, delivery.deliveredAt);
      return value === null ? [] : [value];
    });
    const responseTimes = [...evidenceResponses, ...modelResponses, ...ratingResponses, ...underwritingResponses, ...placementResponses].filter((item) => versionIds.has(item.submissionVersionId)).map((item) => item.recordedAt);
    const reviewHours = delivered.flatMap((delivery) => {
      const first = responseTimes.filter((time) => time >= (delivery.deliveredAt ?? delivery.attemptedAt)).sort()[0];
      const value = hoursBetween(delivery.deliveredAt, first);
      return value === null ? [] : [value];
    });
    const windowedAudit = audit.filter((event) => event.occurredAt >= windowStart && event.occurredAt <= windowEnd);
    const projectCosts = stacks.filter((item) => projectIds.has(item.projectId)).reduce((sum, item) => sum + item.projectCostCents, 0);
    const contributions = benefits.filter((item) => projectIds.has(item.projectId)).reduce((sum, item) => sum + item.fundingContributionCents, 0);
    const metrics: Record<string, number | null> = {
      applicants: new Set(membershipEvents.map((event) => event.propertyId)).size,
      qualifiedProperties: [...latest.values()].filter((event) => ["qualified", "project_started", "project_completed"].includes(event.eventType)).length,
      projectsStarted: scopedProjects.filter((project) => ["in_progress", "complete"].includes(project.status) || [...latestMilestone.values()].some((event) => scopedMilestones.find((item) => item.id === event.milestoneId)?.projectId === project.id && ["started", "evidence_submitted", "approved", "corrected"].includes(event.eventType))).length,
      projectsCompleted: scopedProjects.filter((project) => project.status === "complete").length,
      eligibleAssessments: scopedAssessments.filter((item) => item.state === "eligible").length,
      verifiedFindings: scopedFindings.filter((item) => item.conclusion === "conforming").length,
      marketSubmissions: scopedVersions.length,
      deliveredSubmissions: new Set(delivered.map((item) => item.submissionVersionId)).size,
      evidenceAccepted: evidenceResponses.filter((item) => versionIds.has(item.submissionVersionId) && ["accepted", "partially_accepted"].includes(item.disposition)).length,
      modelMappingsAccepted: modelResponses.filter((item) => versionIds.has(item.submissionVersionId) && ["input_accepted", "input_modified"].includes(item.disposition)).length,
      ratingTreatmentsRecorded: ratingResponses.filter((item) => versionIds.has(item.submissionVersionId) && !["unknown", "insufficient_evidence"].includes(item.disposition)).length,
      underwritingResponses: underwritingResponses.filter((item) => versionIds.has(item.submissionVersionId)).length,
      placementResponses: placementResponses.filter((item) => versionIds.has(item.submissionVersionId)).length,
      maintenanceRollForwards: maintenance.filter((item) => caseIds.has(item.sourceCaseId)).length,
      projectCostCents: projectCosts,
      fundingContributionCents: contributions,
      averageCaseToDeliveryHours: average(deliveryHours),
      averageMarketReviewHours: average(reviewHours),
      workflowManualTouches: windowedAudit.filter((event) => !event.action.startsWith("programme_metrics") && !event.action.startsWith("analytics_")).length,
    };
    const denominators: Record<string, number> = { qualifiedProperties: Math.max(1, metrics.applicants ?? 0), projectsCompleted: Math.max(1, scopedProjects.length), evidenceAccepted: Math.max(1, evidenceResponses.filter((item) => versionIds.has(item.submissionVersionId)).length), deliveredSubmissions: Math.max(1, scopedVersions.length), maintenanceRollForwards: Math.max(1, scopedCases.length) };
    const inputLineage = { cohortVersionId, windowStart, windowEnd, membershipEventIds: membershipEvents.map((item) => item.id), projectIds: [...projectIds], caseIds: [...caseIds], submissionVersionIds: [...versionIds], deliveryIds: delivered.map((item) => item.id), responseIds: [...evidenceResponses, ...modelResponses, ...ratingResponses, ...underwritingResponses, ...placementResponses].filter((item) => versionIds.has(item.submissionVersionId)).map((item) => item.id), auditEventHashes: windowedAudit.map((item) => item.eventHash) };
    const caveats = ["Tenant-only descriptive analytics; no cross-customer benchmark was executed.", "Counts and elapsed-time measures do not establish causality, premium savings, loss reduction, insurance availability, or programme effectiveness.", "Missing external decisions remain absent; zero counts mean no matching governed record in this snapshot window."];
    return { metrics, denominators, inputLineage, caveats, propertyCount: propertyIds.size };
  }
}

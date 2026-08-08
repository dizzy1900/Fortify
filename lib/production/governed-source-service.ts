import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  type ResourceAction,
  type ResourceClass,
} from "@/lib/production/authorization";
import {
  appendAudit,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export const governedSourceClasses = [
  "statute_regulation",
  "regulator_guidance",
  "cal_fire_programme",
  "fair_plan_rule_form",
  "insurer_mga_material",
  "third_party_standard",
  "funding_programme",
  "local_authority_requirement",
  "external_model_documentation",
] as const;

export type GovernedSourceClass = (typeof governedSourceClasses)[number];
export type SourceImpactReport = {
  sourceId: string;
  fromVersionId: string;
  toVersionId: string;
  generatedAt: string;
  affected: {
    playbooks: Array<{ id: string; versionId: string; name: string }>;
    cases: Array<{ id: string; title: string; renewalDate: string }>;
    profiles: {
      state: "available";
      items: Array<{ id: string; versionId: string; name: string }>;
    };
    reports: {
      state: "available";
      items: Array<{ id: string; title: string; reportType: string }>;
    };
  };
  limitations: string[];
};

export type CreateGovernedSourceInput = {
  canonicalKey: string;
  sourceClass: GovernedSourceClass;
  issuingAuthority: string;
  title: string;
  jurisdiction: string;
  officialUrl: string;
  authorityTier:
    | "primary"
    | "officially_authorized"
    | "customer_supplied"
    | "recognized_third_party";
  reviewOwnerSubject: string;
};

export type CreateGovernedSourceVersionInput = {
  sourceId: string;
  versionLabel: string;
  publicationDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  retrievalDate: string;
  sourceHash: string;
  snapshotState:
    | "exact_bytes"
    | "approved_snapshot"
    | "metadata_only_restricted";
  storageObjectId?: string;
  rightsStatus: "approved" | "restricted" | "pending";
  redistributionAllowed: boolean;
  useRestrictions: string;
  structuredSummary: Record<string, string>;
  verifyCurrentStatus:
    | "verified_current"
    | "verification_due"
    | "unverified"
    | "withdrawn";
  nextReviewDate: string;
  extractionMethod:
    | "human_authored"
    | "deterministic_extraction"
    | "model_assisted";
  humanConfirmed: boolean;
  changeSummary: string;
  supersedesVersionId?: string;
};

export class GovernedSourceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernedSourceValidationError";
  }
}

export class GovernedSourceStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovernedSourceStateError";
  }
}

function requiredText(value: string | undefined, label: string) {
  if (!value?.trim())
    throw new GovernedSourceValidationError(`${label} is required.`);
  return value.trim();
}

function optionalIsoDate(value: string | undefined, label: string) {
  if (!value) return undefined;
  const normalized = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized))
    throw new GovernedSourceValidationError(`${label} must be an ISO date.`);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  )
    throw new GovernedSourceValidationError(
      `${label} is not a valid calendar date.`,
    );
  return normalized;
}

function requiredIsoDate(value: string | undefined, label: string) {
  return optionalIsoDate(requiredText(value, label), label)!;
}

function requiredHttpUrl(value: string | undefined, label: string) {
  const normalized = requiredText(value, label);
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new GovernedSourceValidationError(
      `${label} must be an HTTP or HTTPS URL.`,
    );
  }
  return normalized;
}

function requiredSha256(value: string | undefined) {
  const normalized = requiredText(value, "Source hash").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized))
    throw new GovernedSourceValidationError(
      "Source hash must be a 64-character SHA-256 digest.",
    );
  return normalized;
}

function assertResourceAccess(
  context: TenantContext,
  resources: ResourceClass[],
  action: ResourceAction = "read",
) {
  for (const resource of resources)
    assertAuthorized(context, {
      action,
      resource,
      resourceOrganizationId: context.organizationId,
    });
}

export class GovernedSourceService {
  constructor(
    readonly database: ProductionDatabaseLike,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createSource(context: TenantContext, input: CreateGovernedSourceInput) {
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source",
      resourceOrganizationId: context.organizationId,
    });
    if (context.principalType !== "membership")
      throw new GovernedSourceStateError(
        "A human organization member must register a governed source.",
      );
    if (!governedSourceClasses.includes(input.sourceClass))
      throw new GovernedSourceValidationError("Unsupported source class.");
    const sourceId = randomUUID();
    const at = this.clock().toISOString();
    const canonicalKey = requiredText(input.canonicalKey, "Canonical key")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!canonicalKey)
      throw new GovernedSourceValidationError("Canonical key is invalid.");
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      await database.insert(schema.governedSources).values({
        id: sourceId,
        ...tenantRecord(context, at),
        canonicalKey,
        sourceClass: input.sourceClass,
        issuingAuthority: requiredText(
          input.issuingAuthority,
          "Issuing authority",
        ),
        title: requiredText(input.title, "Source title"),
        jurisdiction: requiredText(input.jurisdiction, "Jurisdiction"),
        officialUrl: requiredHttpUrl(input.officialUrl, "Official URL"),
        authorityTier: input.authorityTier,
        reviewOwnerSubject: requiredText(
          input.reviewOwnerSubject,
          "Review owner",
        ),
      });
      await appendAudit(database, context, {
        action: "governed_source.registered",
        resourceType: "governed_source",
        resourceId: sourceId,
        detail: {
          canonicalKey,
          sourceClass: input.sourceClass,
          authorityTier: input.authorityTier,
          operative: false,
        },
        occurredAt: at,
      });
      return { sourceId, canonicalKey, operative: false as const };
    });
  }

  async createVersion(
    context: TenantContext,
    input: CreateGovernedSourceVersionInput,
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source_version",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, ["governed_source"]);
    if (context.principalType !== "membership")
      throw new GovernedSourceStateError(
        "A human organization member must author a source version.",
      );
    const retrievalDate = requiredIsoDate(
      input.retrievalDate,
      "Retrieval date",
    );
    const publicationDate = optionalIsoDate(
      input.publicationDate,
      "Publication date",
    );
    const effectiveFrom = optionalIsoDate(
      input.effectiveFrom,
      "Effective-from date",
    );
    const effectiveTo = optionalIsoDate(input.effectiveTo, "Effective-to date");
    const nextReviewDate = requiredIsoDate(
      input.nextReviewDate,
      "Next review date",
    );
    if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom)
      throw new GovernedSourceValidationError(
        "Effective-to cannot precede effective-from.",
      );
    if (
      input.snapshotState !== "metadata_only_restricted" &&
      !input.storageObjectId
    )
      throw new GovernedSourceValidationError(
        "Exact bytes and approved snapshots require a storage object.",
      );
    if (
      input.snapshotState === "metadata_only_restricted" &&
      input.redistributionAllowed
    )
      throw new GovernedSourceValidationError(
        "Metadata-only restricted sources cannot be marked redistributable.",
      );
    const sourceHash = requiredSha256(input.sourceHash);
    const structuredSummary = Object.fromEntries(
      Object.entries(input.structuredSummary ?? {})
        .map(([key, value]) => [key.trim(), value.trim()] as const)
        .filter(([key, value]) => key && value),
    );
    if (!Object.keys(structuredSummary).length)
      throw new GovernedSourceValidationError(
        "A short structured summary is required.",
      );

    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      const source = await database
        .select()
        .from(schema.governedSources)
        .where(
          and(
            eq(schema.governedSources.id, input.sourceId),
            eq(schema.governedSources.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!source[0]) throw new TenantResourceNotFoundError("Governed source");
      if (input.storageObjectId) {
        assertResourceAccess(context, ["storage_object"]);
        const object = await database
          .select()
          .from(schema.storageObjects)
          .where(
            and(
              eq(schema.storageObjects.id, input.storageObjectId),
              eq(schema.storageObjects.organizationId, context.organizationId),
            ),
          )
          .limit(1);
        if (
          !object[0] ||
          object[0].state !== "clean" ||
          object[0].scanStatus !== "clean"
        )
          throw new GovernedSourceStateError(
            "A source snapshot must be an in-tenant clean storage object.",
          );
        if (object[0].sha256 !== sourceHash)
          throw new GovernedSourceStateError(
            "The source hash must match the exact stored bytes.",
          );
      }
      const latest = await database
        .select({
          id: schema.governedSourceVersions.id,
          versionNumber: schema.governedSourceVersions.versionNumber,
        })
        .from(schema.governedSourceVersions)
        .where(
          and(
            eq(schema.governedSourceVersions.sourceId, input.sourceId),
            eq(
              schema.governedSourceVersions.organizationId,
              context.organizationId,
            ),
          ),
        )
        .orderBy(desc(schema.governedSourceVersions.versionNumber))
        .limit(1);
      const versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
      if (versionNumber > 1 && input.supersedesVersionId !== latest[0]?.id)
        throw new GovernedSourceValidationError(
          "A successor must reference the immediately prior source version.",
        );
      if (versionNumber === 1 && input.supersedesVersionId)
        throw new GovernedSourceValidationError(
          "An initial source version cannot supersede another version.",
        );
      const at = this.clock().toISOString();
      const sourceVersionId = randomUUID();
      await database.insert(schema.governedSourceVersions).values({
        id: sourceVersionId,
        ...tenantRecord(context, at),
        sourceId: input.sourceId,
        versionNumber,
        versionLabel: requiredText(input.versionLabel, "Version label"),
        publicationDate,
        effectiveFrom,
        effectiveTo,
        retrievalDate,
        sourceHash,
        snapshotState: input.snapshotState,
        storageObjectId: input.storageObjectId,
        rightsStatus: input.rightsStatus,
        redistributionAllowed: input.redistributionAllowed,
        useRestrictions: requiredText(
          input.useRestrictions,
          "Use restrictions",
        ),
        structuredSummary,
        verifyCurrentStatus: input.verifyCurrentStatus,
        nextReviewDate,
        extractionMethod: input.extractionMethod,
        humanConfirmed: input.humanConfirmed,
        authorSubject: context.actorSubject,
        changeSummary: requiredText(input.changeSummary, "Change summary"),
        supersedesVersionId: input.supersedesVersionId,
      });
      await appendAudit(database, context, {
        action: "governed_source.version_created",
        resourceType: "governed_source_version",
        resourceId: sourceVersionId,
        detail: {
          sourceId: input.sourceId,
          versionNumber,
          sourceHash,
          extractionMethod: input.extractionMethod,
          humanConfirmed: input.humanConfirmed,
          operative: false,
        },
        occurredAt: at,
      });
      return { sourceVersionId, versionNumber, operative: false as const };
    });
  }

  async reviewVersion(
    context: TenantContext,
    input: {
      sourceVersionId: string;
      decision: "approved" | "changes_requested";
      note: string;
      sourceCompared: boolean;
      rightsConfirmed: boolean;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source_review",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, ["governed_source_version"]);
    if (context.principalType !== "membership")
      throw new GovernedSourceStateError(
        "A human organization member must review a source version.",
      );
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      const version = await database
        .select()
        .from(schema.governedSourceVersions)
        .where(
          and(
            eq(schema.governedSourceVersions.id, input.sourceVersionId),
            eq(
              schema.governedSourceVersions.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (!version[0])
        throw new TenantResourceNotFoundError("Governed source version");
      if (version[0].authorSubject === context.actorSubject)
        throw new GovernedSourceStateError(
          "A source author cannot review the same version.",
        );
      if (
        input.decision === "approved" &&
        (!input.sourceCompared || !input.rightsConfirmed)
      )
        throw new GovernedSourceStateError(
          "Approval requires exact-source comparison and a rights decision.",
        );
      if (
        input.decision === "approved" &&
        version[0].rightsStatus === "pending"
      )
        throw new GovernedSourceStateError(
          "Rights must be approved or explicitly restricted before approval.",
        );
      const reviewedAt = this.clock().toISOString();
      const reviewId = randomUUID();
      await database.insert(schema.governedSourceReviews).values({
        id: reviewId,
        ...tenantRecord(context, reviewedAt),
        sourceVersionId: input.sourceVersionId,
        decision: input.decision,
        reviewerSubject: context.actorSubject,
        note: requiredText(input.note, "Review note"),
        sourceCompared: input.sourceCompared,
        rightsConfirmed: input.rightsConfirmed,
        reviewedAt,
      });
      await appendAudit(database, context, {
        action: `governed_source.version_${input.decision}`,
        resourceType: "governed_source_version",
        resourceId: input.sourceVersionId,
        detail: {
          reviewId,
          sourceCompared: input.sourceCompared,
          rightsConfirmed: input.rightsConfirmed,
        },
        occurredAt: reviewedAt,
      });
      return { reviewId, decision: input.decision, reviewedAt };
    });
  }

  private async buildImpactReport(
    database: ProductionDatabaseLike,
    context: TenantContext,
    sourceId: string,
    fromVersionId: string,
    toVersionId: string,
    generatedAt: string,
  ): Promise<SourceImpactReport> {
    const dependencies = await database
      .select()
      .from(schema.governedSourceDependencies)
      .where(
        and(
          eq(
            schema.governedSourceDependencies.organizationId,
            context.organizationId,
          ),
          eq(schema.governedSourceDependencies.sourceVersionId, fromVersionId),
          inArray(schema.governedSourceDependencies.relationship, [
            "relied_on",
            "input_lineage",
          ]),
        ),
      )
      .orderBy(asc(schema.governedSourceDependencies.pinnedAt));
    const playbookIds = dependencies
      .filter((item) => item.consumerType === "playbook_version")
      .map((item) => item.consumerId);
    const caseIds = dependencies
      .filter((item) => item.consumerType === "renewal_case")
      .map((item) => item.consumerId);
    const profileVersionIds = dependencies
      .filter((item) => item.consumerType === "target_profile_version")
      .map((item) => item.consumerId);
    const reportIds = dependencies
      .filter((item) => item.consumerType === "analytics_report")
      .map((item) => item.consumerId);
    const playbooks = playbookIds.length
      ? await database
          .select({
            id: schema.marketPlaybooks.id,
            versionId: schema.playbookVersions.id,
            name: schema.marketPlaybooks.name,
          })
          .from(schema.playbookVersions)
          .innerJoin(
            schema.marketPlaybooks,
            and(
              eq(schema.marketPlaybooks.id, schema.playbookVersions.playbookId),
              eq(schema.marketPlaybooks.organizationId, context.organizationId),
            ),
          )
          .where(
            and(
              eq(
                schema.playbookVersions.organizationId,
                context.organizationId,
              ),
              inArray(schema.playbookVersions.id, playbookIds),
            ),
          )
      : [];
    const cases = caseIds.length
      ? await database
          .select({
            id: schema.renewalCases.id,
            title: schema.renewalCases.title,
            renewalDate: schema.renewalCases.renewalDate,
          })
          .from(schema.renewalCases)
          .where(
            and(
              eq(schema.renewalCases.organizationId, context.organizationId),
              inArray(schema.renewalCases.id, caseIds),
            ),
          )
      : [];
    const profiles = profileVersionIds.length
      ? await database
          .select({
            id: schema.targetProfiles.id,
            versionId: schema.targetProfileVersions.id,
            name: schema.targetProfiles.name,
          })
          .from(schema.targetProfileVersions)
          .innerJoin(
            schema.targetProfiles,
            and(
              eq(
                schema.targetProfiles.id,
                schema.targetProfileVersions.profileId,
              ),
              eq(schema.targetProfiles.organizationId, context.organizationId),
            ),
          )
          .where(
            and(
              eq(
                schema.targetProfileVersions.organizationId,
                context.organizationId,
              ),
              inArray(schema.targetProfileVersions.id, profileVersionIds),
            ),
          )
      : [];
    const reports = reportIds.length
      ? await database
          .select({
            id: schema.analyticsReports.id,
            title: schema.analyticsReports.title,
            reportType: schema.analyticsReports.reportType,
          })
          .from(schema.analyticsReports)
          .where(
            and(
              eq(
                schema.analyticsReports.organizationId,
                context.organizationId,
              ),
              inArray(schema.analyticsReports.id, reportIds),
            ),
          )
      : [];
    return {
      sourceId,
      fromVersionId,
      toVersionId,
      generatedAt,
      affected: {
        playbooks,
        cases,
        profiles: { state: "available", items: profiles },
        reports: { state: "available", items: reports },
      },
      limitations: [
        "Profile impact identifies exact source reliance; it never changes a published profile automatically.",
        "Report impact identifies exact source lineage; it never mutates or republishes a generated report automatically.",
        "Impact identifies reliance; it does not automatically change an operative playbook or case.",
      ],
    };
  }

  async publishVersion(
    context: TenantContext,
    input: {
      sourceVersionId: string;
      decision: "published" | "rejected";
      note: string;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source_publication",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, [
      "governed_source_version",
      "governed_source_review",
    ]);
    if (context.principalType !== "membership")
      throw new GovernedSourceStateError(
        "A human organization member must publish a source version.",
      );
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      const version = await database
        .select({
          id: schema.governedSourceVersions.id,
          sourceId: schema.governedSourceVersions.sourceId,
          authorSubject: schema.governedSourceVersions.authorSubject,
          verifyCurrentStatus:
            schema.governedSourceVersions.verifyCurrentStatus,
          rightsStatus: schema.governedSourceVersions.rightsStatus,
          humanConfirmed: schema.governedSourceVersions.humanConfirmed,
          supersedesVersionId:
            schema.governedSourceVersions.supersedesVersionId,
        })
        .from(schema.governedSourceVersions)
        .where(
          and(
            eq(schema.governedSourceVersions.id, input.sourceVersionId),
            eq(
              schema.governedSourceVersions.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (!version[0])
        throw new TenantResourceNotFoundError("Governed source version");
      if (version[0].authorSubject === context.actorSubject)
        throw new GovernedSourceStateError(
          "A source author cannot publish the same version.",
        );
      const review = await database
        .select()
        .from(schema.governedSourceReviews)
        .where(
          and(
            eq(
              schema.governedSourceReviews.sourceVersionId,
              input.sourceVersionId,
            ),
            eq(
              schema.governedSourceReviews.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (
        input.decision === "published" &&
        (!review[0] ||
          review[0].decision !== "approved" ||
          !review[0].sourceCompared ||
          !review[0].rightsConfirmed ||
          version[0].verifyCurrentStatus !== "verified_current" ||
          version[0].rightsStatus === "pending" ||
          !version[0].humanConfirmed)
      )
        throw new GovernedSourceStateError(
          "Publication requires independent approval, exact-source comparison, a rights decision, verified-current state, and human confirmation.",
        );
      if (
        input.decision === "published" &&
        review[0]?.reviewerSubject === context.actorSubject
      )
        throw new GovernedSourceStateError(
          "A source reviewer cannot publish the same version.",
        );
      const publishedAt = this.clock().toISOString();
      const publicationId = randomUUID();
      await database.insert(schema.governedSourcePublications).values({
        id: publicationId,
        ...tenantRecord(context, publishedAt),
        sourceVersionId: input.sourceVersionId,
        decision: input.decision,
        publisherSubject: context.actorSubject,
        note: requiredText(input.note, "Publication note"),
        publishedAt,
      });
      let alertId: string | null = null;
      let impact: SourceImpactReport | null = null;
      if (input.decision === "published" && version[0].supersedesVersionId) {
        impact = await this.buildImpactReport(
          database,
          context,
          version[0].sourceId,
          version[0].supersedesVersionId,
          input.sourceVersionId,
          publishedAt,
        );
        const affectedCount =
          impact.affected.playbooks.length + impact.affected.cases.length;
        if (affectedCount > 0) {
          assertResourceAccess(context, ["source_change_alert"], "create");
          alertId = randomUUID();
          const source = await database
            .select({ ownerSubject: schema.governedSources.reviewOwnerSubject })
            .from(schema.governedSources)
            .where(
              and(
                eq(schema.governedSources.id, version[0].sourceId),
                eq(
                  schema.governedSources.organizationId,
                  context.organizationId,
                ),
              ),
            )
            .limit(1);
          await database.insert(schema.sourceChangeAlerts).values({
            id: alertId,
            ...tenantRecord(context, publishedAt),
            sourceId: version[0].sourceId,
            fromVersionId: version[0].supersedesVersionId,
            toVersionId: input.sourceVersionId,
            impactSnapshot: impact,
            ownerSubject: source[0]?.ownerSubject ?? context.actorSubject,
            createdAtEvent: publishedAt,
          });
        }
      }
      await appendAudit(database, context, {
        action: `governed_source.version_${input.decision}`,
        resourceType: "governed_source_version",
        resourceId: input.sourceVersionId,
        detail: {
          publicationId,
          alertId,
          affectedPlaybookCount: impact?.affected.playbooks.length ?? 0,
          affectedCaseCount: impact?.affected.cases.length ?? 0,
          extractedRuleAutomaticallyOperative: false,
        },
        occurredAt: publishedAt,
      });
      return {
        publicationId,
        decision: input.decision,
        publishedAt,
        alertId,
        impact,
      };
    });
  }

  async registerDependency(
    context: TenantContext,
    input: {
      sourceVersionId: string;
      consumerType:
        | "playbook_version"
        | "renewal_case"
        | "target_profile_version";
      consumerId: string;
      relationship: "relied_on" | "reference_only";
      rationale: string;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source_dependency",
      resourceOrganizationId: context.organizationId,
    });
    const pinnedAt = this.clock().toISOString();
    const dependencyId = randomUUID();
    await this.database.insert(schema.governedSourceDependencies).values({
      id: dependencyId,
      ...tenantRecord(context, pinnedAt),
      sourceVersionId: input.sourceVersionId,
      consumerType: input.consumerType,
      consumerId: input.consumerId,
      relationship: input.relationship,
      rationale: requiredText(input.rationale, "Dependency rationale"),
      pinnedAt,
      pinnedBy: context.actorSubject,
    });
    return { dependencyId, pinnedAt };
  }

  async impactReport(
    context: TenantContext,
    input: { sourceId: string; fromVersionId: string; toVersionId: string },
  ) {
    assertResourceAccess(context, [
      "governed_source",
      "governed_source_version",
      "governed_source_dependency",
    ]);
    return this.buildImpactReport(
      this.database,
      context,
      input.sourceId,
      input.fromVersionId,
      input.toVersionId,
      this.clock().toISOString(),
    );
  }
}

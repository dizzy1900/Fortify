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
  digest,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export const applicabilityFields = [
  "market_id",
  "program_id",
  "jurisdiction",
  "peril",
  "property_class",
  "policy_form",
] as const;
export const applicabilityOperators = [
  "equals",
  "not_equals",
  "one_of",
  "not_one_of",
] as const;

export type ApplicabilityField = (typeof applicabilityFields)[number];
export type ApplicabilityOperator = (typeof applicabilityOperators)[number];
export type RequirementState =
  | "ready"
  | "missing"
  | "stale"
  | "scope_mismatch"
  | "contradiction"
  | "unreviewed"
  | "insufficient"
  | "not_applicable";

export class PlaybookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookValidationError";
  }
}

export class PlaybookStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaybookStateError";
  }
}

export class PlaybookApplicabilityError extends Error {
  readonly code: "no_match" | "ambiguous";

  constructor(code: "no_match" | "ambiguous", message: string) {
    super(message);
    this.name = "PlaybookApplicabilityError";
    this.code = code;
  }
}

type ConditionInput = {
  field: ApplicabilityField;
  operator: ApplicabilityOperator;
  expectedValues: string[];
};

type RequirementInput = {
  requirementVersionId: string;
  importance: "required" | "recommended";
  blocking: boolean;
  acceptedEvidenceTypes: string[];
  freshnessDays?: number;
  requiredScopeType: string;
  acceptedSourceTypes: string[];
  requiredReviewStatus?: string;
  deadlineDaysBefore?: number;
  templateKey?: string;
  deliveryRequirement?: string;
  caveat?: string;
  conditions?: ConditionInput[];
};

export type CreatePlaybookVersionInput = {
  playbookId?: string;
  name: string;
  description?: string;
  marketId: string;
  programId?: string;
  jurisdiction: string;
  peril: string;
  propertyClass: string;
  policyForm?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  governedSourceVersionId: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceVersion?: string;
  sourceCitation?: string;
  verifyCurrent?: boolean;
  changeSummary: string;
  supersedesVersionId?: string;
  requirements: RequirementInput[];
};

type DestinationContext = {
  marketId: string;
  programId?: string;
  jurisdiction: string;
  peril: string;
  propertyClass: string;
  policyForm?: string;
};

function requiredText(value: string | undefined, label: string) {
  if (!value?.trim()) throw new PlaybookValidationError(`${label} is required.`);
  return value.trim();
}

function requiredIsoDate(value: string | undefined, label: string) {
  const normalized = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized))
    throw new PlaybookValidationError(`${label} must be an ISO date.`);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== normalized
  )
    throw new PlaybookValidationError(`${label} is not a valid calendar date.`);
  return normalized;
}

function requiredHttpUrl(value: string | undefined, label: string) {
  const normalized = requiredText(value, label);
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
  } catch {
    throw new PlaybookValidationError(`${label} must be an HTTP or HTTPS URL.`);
  }
  return normalized;
}

function uniqueText(values: string[], label: string) {
  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (normalized.length !== values.length)
    throw new PlaybookValidationError(`${label} must contain unique non-empty values.`);
  return normalized;
}

function validateRequirements(requirements: RequirementInput[]) {
  if (!requirements.length)
    throw new PlaybookValidationError("A playbook version requires at least one requirement.");
  if (new Set(requirements.map((item) => item.requirementVersionId)).size !== requirements.length)
    throw new PlaybookValidationError("A requirement version can appear only once.");
  return requirements.map((requirement) => {
    if (requirement.blocking && requirement.importance !== "required")
      throw new PlaybookValidationError("Only required items may be blocking.");
    if (
      requirement.freshnessDays !== undefined &&
      (!Number.isInteger(requirement.freshnessDays) || requirement.freshnessDays < 0)
    )
      throw new PlaybookValidationError("Freshness days must be a non-negative integer.");
    if (
      requirement.deadlineDaysBefore !== undefined &&
      (!Number.isInteger(requirement.deadlineDaysBefore) ||
        requirement.deadlineDaysBefore < 0)
    )
      throw new PlaybookValidationError(
        "Deadline days must be a non-negative integer.",
      );
    if (
      requirement.requiredReviewStatus &&
      !["human_confirmed", "confirmed", "approved"].includes(
        requirement.requiredReviewStatus,
      )
    )
      throw new PlaybookValidationError("Unsupported required review status.");
    const conditions = requirement.conditions ?? [];
    conditions.forEach((condition) => {
      if (!applicabilityFields.includes(condition.field))
        throw new PlaybookValidationError("Unsupported applicability field.");
      if (!applicabilityOperators.includes(condition.operator))
        throw new PlaybookValidationError("Unsupported applicability operator.");
      uniqueText(condition.expectedValues, "Condition values");
      if (!condition.expectedValues.length)
        throw new PlaybookValidationError("A bounded condition requires at least one value.");
      if (["equals", "not_equals"].includes(condition.operator) && condition.expectedValues.length !== 1)
        throw new PlaybookValidationError("Equality conditions require exactly one value.");
    });
    return {
      ...requirement,
      acceptedEvidenceTypes: uniqueText(
        requirement.acceptedEvidenceTypes,
        "Accepted evidence types",
      ),
      acceptedSourceTypes: uniqueText(
        requirement.acceptedSourceTypes,
        "Accepted source types",
      ),
      requiredScopeType: requiredText(
        requirement.requiredScopeType,
        "Required scope",
      ),
      conditions,
    };
  });
}

function conditionMatches(condition: ConditionInput, context: DestinationContext) {
  const value = {
    market_id: context.marketId,
    program_id: context.programId ?? "",
    jurisdiction: context.jurisdiction,
    peril: context.peril,
    property_class: context.propertyClass,
    policy_form: context.policyForm ?? "",
  }[condition.field];
  const includes = condition.expectedValues.includes(value);
  return condition.operator === "equals" || condition.operator === "one_of"
    ? includes
    : !includes;
}

function reviewSatisfied(actual: string, required: string) {
  if (required === "human_confirmed")
    return ["human_confirmed", "confirmed", "approved"].includes(actual);
  return actual === required;
}

function ageInDays(from: string, to: string) {
  return Math.floor(
    (new Date(`${to.slice(0, 10)}T00:00:00.000Z`).getTime() -
      new Date(`${from.slice(0, 10)}T00:00:00.000Z`).getTime()) /
      86_400_000,
  );
}

function assertResourceAccess(
  context: TenantContext,
  resources: ResourceClass[],
  action: ResourceAction = "read",
  caseId?: string,
) {
  for (const resource of resources)
    assertAuthorized(context, {
      action,
      resource,
      resourceOrganizationId: context.organizationId,
      caseId,
    });
}

export class MarketPlaybookService {
  constructor(
    readonly database: ProductionDatabaseLike,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createVersion(context: TenantContext, input: CreatePlaybookVersionInput) {
    assertAuthorized(context, {
      action: "create",
      resource: "playbook_version",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, [
      "market",
      "program",
      "requirement_version",
      "governed_source",
      "governed_source_version",
      "governed_source_publication",
      "market_playbook",
    ]);
    assertResourceAccess(
      context,
      [
        "playbook_requirement",
        "playbook_applicability_rule",
        "governed_source_dependency",
      ],
      "create",
    );
    const name = requiredText(input.name, "Playbook name");
    const normalizedRequirements = validateRequirements(input.requirements);
    const jurisdiction = requiredText(input.jurisdiction, "Jurisdiction");
    const peril = requiredText(input.peril, "Peril");
    const propertyClass = requiredText(input.propertyClass, "Property class");
    const policyForm = input.policyForm?.trim() || undefined;
    const effectiveFrom = requiredIsoDate(input.effectiveFrom, "Effective-from date");
    const effectiveTo = input.effectiveTo
      ? requiredIsoDate(input.effectiveTo, "Effective-to date")
      : undefined;
    const changeSummary = requiredText(input.changeSummary, "Change summary");
    if (effectiveTo && effectiveTo < effectiveFrom)
      throw new PlaybookValidationError("Effective-to cannot precede effective-from.");
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      const parents = await database
        .select({
          marketId: schema.markets.id,
          programId: schema.programs.id,
          programMarketId: schema.programs.marketId,
        })
        .from(schema.markets)
        .leftJoin(
          schema.programs,
          and(
            eq(schema.programs.id, input.programId ?? "__none__"),
            eq(schema.programs.organizationId, context.organizationId),
          ),
        )
        .where(
          and(
            eq(schema.markets.id, input.marketId),
            eq(schema.markets.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!parents[0]) throw new TenantResourceNotFoundError("Market");
      if (input.programId && !parents[0].programId)
        throw new TenantResourceNotFoundError("Program");
      if (parents[0].programMarketId && parents[0].programMarketId !== input.marketId)
        throw new PlaybookValidationError("The program does not belong to the selected market.");

      const governedSource = await database
        .select({
          sourceVersion: schema.governedSourceVersions,
          source: schema.governedSources,
          publication: schema.governedSourcePublications,
        })
        .from(schema.governedSourceVersions)
        .innerJoin(
          schema.governedSources,
          and(
            eq(schema.governedSources.id, schema.governedSourceVersions.sourceId),
            eq(schema.governedSources.organizationId, context.organizationId),
          ),
        )
        .innerJoin(
          schema.governedSourcePublications,
          and(
            eq(
              schema.governedSourcePublications.sourceVersionId,
              schema.governedSourceVersions.id,
            ),
            eq(
              schema.governedSourcePublications.organizationId,
              context.organizationId,
            ),
            eq(schema.governedSourcePublications.decision, "published"),
          ),
        )
        .where(
          and(
            eq(
              schema.governedSourceVersions.id,
              input.governedSourceVersionId,
            ),
            eq(
              schema.governedSourceVersions.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (!governedSource[0])
        throw new TenantResourceNotFoundError(
          "Published governed source version",
        );
      if (
        governedSource[0].sourceVersion.verifyCurrentStatus !==
        "verified_current"
      )
        throw new PlaybookStateError(
          "The governed source must be verified current before a playbook can rely on it.",
        );
      const sourceName = governedSource[0].source.title;
      const sourceUrl = requiredHttpUrl(
        governedSource[0].source.officialUrl,
        "Source URL",
      );
      const sourceVersion = governedSource[0].sourceVersion.versionLabel;
      const sourceCitation = `${governedSource[0].source.issuingAuthority} — ${governedSource[0].source.title} (${sourceVersion})`;

      const requirementIds = normalizedRequirements.map(
        (item) => item.requirementVersionId,
      );
      const requirementVersions = await database
        .select({ id: schema.requirementVersions.id })
        .from(schema.requirementVersions)
        .where(
          and(
            eq(schema.requirementVersions.organizationId, context.organizationId),
            inArray(schema.requirementVersions.id, requirementIds),
          ),
        );
      if (requirementVersions.length !== requirementIds.length)
        throw new TenantResourceNotFoundError("Requirement version");

      const playbookId = input.playbookId ?? randomUUID();
      let versionNumber = 1;
      if (input.playbookId) {
        const playbook = await database
          .select()
          .from(schema.marketPlaybooks)
          .where(
            and(
              eq(schema.marketPlaybooks.id, input.playbookId),
              eq(schema.marketPlaybooks.organizationId, context.organizationId),
            ),
        )
          .limit(1);
        if (!playbook[0]) throw new TenantResourceNotFoundError("Market playbook");
        if (playbook[0].name !== name)
          throw new PlaybookValidationError(
            "A successor must retain the stable playbook name.",
          );
        const latest = await database
          .select({ versionNumber: schema.playbookVersions.versionNumber })
          .from(schema.playbookVersions)
          .where(
            and(
              eq(schema.playbookVersions.playbookId, playbookId),
              eq(schema.playbookVersions.organizationId, context.organizationId),
            ),
          )
          .orderBy(desc(schema.playbookVersions.versionNumber))
          .limit(1);
        versionNumber = (latest[0]?.versionNumber ?? 0) + 1;
      } else {
        assertAuthorized(context, {
          action: "create",
          resource: "market_playbook",
          resourceOrganizationId: context.organizationId,
        });
        await database.insert(schema.marketPlaybooks).values({
          id: playbookId,
          ...tenantRecord(context, this.clock().toISOString()),
          name,
          description: input.description?.trim() ?? "",
        });
      }

      if (versionNumber > 1 && !input.supersedesVersionId)
        throw new PlaybookValidationError("A successor must identify the prior version.");
      if (input.supersedesVersionId) {
        const prior = await database
          .select({
            id: schema.playbookVersions.id,
            playbookId: schema.playbookVersions.playbookId,
            versionNumber: schema.playbookVersions.versionNumber,
          })
          .from(schema.playbookVersions)
          .where(
            and(
              eq(schema.playbookVersions.id, input.supersedesVersionId),
              eq(schema.playbookVersions.organizationId, context.organizationId),
            ),
          )
          .limit(1);
        if (!prior[0] || prior[0].playbookId !== playbookId)
          throw new PlaybookValidationError("The prior version must belong to this playbook.");
        if (prior[0].versionNumber !== versionNumber - 1)
          throw new PlaybookValidationError("A successor must reference the immediately prior version.");
      }

      const canonical = {
        scope: {
          marketId: input.marketId,
          programId: input.programId ?? null,
          jurisdiction,
          peril,
          propertyClass,
          policyForm: policyForm ?? null,
          effectiveFrom,
          effectiveTo: effectiveTo ?? null,
        },
        source: {
          governedSourceVersionId: input.governedSourceVersionId,
          name: sourceName,
          url: sourceUrl,
          version: sourceVersion,
          citation: sourceCitation,
          verifyCurrent: input.verifyCurrent,
        },
        requirements: normalizedRequirements,
      };
      const at = this.clock().toISOString();
      const versionId = randomUUID();
      await database.insert(schema.playbookVersions).values({
        id: versionId,
        ...tenantRecord(context, at),
        playbookId,
        versionNumber,
        marketId: input.marketId,
        programId: input.programId,
        jurisdiction,
        peril,
        propertyClass,
        policyForm,
        effectiveFrom,
        effectiveTo,
        governedSourceVersionId: input.governedSourceVersionId,
        sourceName,
        sourceUrl,
        sourceVersion,
        sourceCitation,
        verifyCurrent: true,
        changeSummary,
        contentHash: digest(canonical),
        authorSubject: context.actorSubject,
        supersedesVersionId: input.supersedesVersionId,
      });
      for (const [index, requirement] of normalizedRequirements.entries()) {
        const playbookRequirementId = randomUUID();
        await database.insert(schema.playbookRequirements).values({
          id: playbookRequirementId,
          ...tenantRecord(context, at),
          playbookVersionId: versionId,
          requirementVersionId: requirement.requirementVersionId,
          position: index + 1,
          importance: requirement.importance,
          blocking: requirement.blocking,
          acceptedEvidenceTypes: requirement.acceptedEvidenceTypes,
          freshnessDays: requirement.freshnessDays,
          requiredScopeType: requirement.requiredScopeType,
          acceptedSourceTypes: requirement.acceptedSourceTypes,
          requiredReviewStatus: requirement.requiredReviewStatus ?? "human_confirmed",
          deadlineDaysBefore: requirement.deadlineDaysBefore,
          templateKey: requirement.templateKey?.trim() || undefined,
          deliveryRequirement: requirement.deliveryRequirement?.trim() || undefined,
          caveat: requirement.caveat?.trim() || undefined,
        });
        for (const [conditionIndex, condition] of requirement.conditions.entries())
          await database.insert(schema.playbookApplicabilityRules).values({
            id: randomUUID(),
            ...tenantRecord(context, at),
            playbookRequirementId,
            position: conditionIndex + 1,
            field: condition.field,
            operator: condition.operator,
            expectedValues: condition.expectedValues,
          });
      }
      await database.insert(schema.governedSourceDependencies).values({
        id: randomUUID(),
        ...tenantRecord(context, at),
        sourceVersionId: input.governedSourceVersionId,
        consumerType: "playbook_version",
        consumerId: versionId,
        relationship: "relied_on",
        rationale:
          "The playbook version pins this exact published source version for deterministic applicability.",
        pinnedAt: at,
        pinnedBy: context.actorSubject,
      });
      await appendAudit(database, context, {
        action: "playbook.version_created",
        resourceType: "playbook_version",
        resourceId: versionId,
        detail: {
          playbookId,
          versionNumber,
          contentHash: digest(canonical),
          requirementCount: normalizedRequirements.length,
          governedSourceVersionId: input.governedSourceVersionId,
          sourceVerifiedCurrent: true,
        },
        occurredAt: at,
      });
      return { playbookId, versionId, versionNumber, contentHash: digest(canonical) };
    });
  }

  async reviewVersion(
    context: TenantContext,
    input: { versionId: string; decision: "approved" | "changes_requested"; note: string },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "playbook_version_review",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, [
      "playbook_version",
      "governed_source_version",
      "governed_source_publication",
    ]);
    if (context.principalType !== "membership")
      throw new PlaybookStateError("A human organization member must review a playbook version.");
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      const version = await database
        .select()
        .from(schema.playbookVersions)
        .where(
          and(
            eq(schema.playbookVersions.id, input.versionId),
            eq(schema.playbookVersions.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!version[0]) throw new TenantResourceNotFoundError("Playbook version");
      if (version[0].authorSubject === context.actorSubject)
        throw new PlaybookStateError("A playbook author cannot review the same version.");
      const governedSource = version[0].governedSourceVersionId
        ? await database
            .select({
              verifyCurrentStatus:
                schema.governedSourceVersions.verifyCurrentStatus,
              decision: schema.governedSourcePublications.decision,
            })
            .from(schema.governedSourceVersions)
            .innerJoin(
              schema.governedSourcePublications,
              and(
                eq(
                  schema.governedSourcePublications.sourceVersionId,
                  schema.governedSourceVersions.id,
                ),
                eq(
                  schema.governedSourcePublications.organizationId,
                  context.organizationId,
                ),
              ),
            )
            .where(
              and(
                eq(
                  schema.governedSourceVersions.id,
                  version[0].governedSourceVersionId,
                ),
                eq(
                  schema.governedSourceVersions.organizationId,
                  context.organizationId,
                ),
              ),
            )
            .limit(1)
        : [];
      if (
        input.decision === "approved" &&
        (!governedSource[0] ||
          governedSource[0].decision !== "published" ||
          governedSource[0].verifyCurrentStatus !== "verified_current")
      )
        throw new PlaybookStateError(
          "A playbook requires a published, verified-current governed source before approval.",
        );
      const at = this.clock().toISOString();
      const reviewId = randomUUID();
      await database.insert(schema.playbookVersionReviews).values({
        id: reviewId,
        ...tenantRecord(context, at),
        playbookVersionId: input.versionId,
        decision: input.decision,
        reviewerSubject: context.actorSubject,
        note: requiredText(input.note, "Review note"),
        reviewedAt: at,
      });
      await appendAudit(database, context, {
        action: `playbook.version_${input.decision}`,
        resourceType: "playbook_version",
        resourceId: input.versionId,
        detail: { reviewId, reviewerSubject: context.actorSubject },
        occurredAt: at,
      });
      return { reviewId, decision: input.decision, reviewedAt: at };
    });
  }

  async getWorkspace(context: TenantContext) {
    assertAuthorized(context, {
      action: "read",
      resource: "market_playbook",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, [
      "market",
      "program",
      "requirement_version",
      "requirement",
      "governed_source",
      "governed_source_version",
      "governed_source_publication",
      "playbook_version",
      "playbook_requirement",
      "playbook_applicability_rule",
      "playbook_version_review",
      "renewal_case",
      "case_playbook_link",
    ]);
    const organization = eq(schema.marketPlaybooks.organizationId, context.organizationId);
    const assignedCaseIds = context.assignedCaseIds;
    const scopedCaseIds = assignedCaseIds?.length
      ? assignedCaseIds
      : ["__no_assigned_cases__"];
    const [
      markets,
      programs,
      requirementVersions,
      publishedSourceVersions,
      playbooks,
      versions,
      requirements,
      rules,
      reviews,
      cases,
      links,
    ] =
      await Promise.all([
        this.database.select().from(schema.markets).where(eq(schema.markets.organizationId, context.organizationId)).orderBy(schema.markets.name),
        this.database.select().from(schema.programs).where(eq(schema.programs.organizationId, context.organizationId)).orderBy(schema.programs.name),
        this.database.select({
          id: schema.requirementVersions.id,
          version: schema.requirementVersions.version,
          summary: schema.requirementVersions.summary,
          sourceUrl: schema.requirementVersions.sourceUrl,
          requirementId: schema.requirements.id,
          code: schema.requirements.code,
          title: schema.requirements.title,
          scopeType: schema.requirements.scopeType,
        }).from(schema.requirementVersions).innerJoin(schema.requirements, and(eq(schema.requirements.id, schema.requirementVersions.requirementId), eq(schema.requirements.organizationId, context.organizationId))).where(eq(schema.requirementVersions.organizationId, context.organizationId)).orderBy(schema.requirements.title),
        this.database
          .select({
            id: schema.governedSourceVersions.id,
            sourceId: schema.governedSources.id,
            title: schema.governedSources.title,
            issuingAuthority: schema.governedSources.issuingAuthority,
            officialUrl: schema.governedSources.officialUrl,
            versionLabel: schema.governedSourceVersions.versionLabel,
            verifyCurrentStatus:
              schema.governedSourceVersions.verifyCurrentStatus,
            publishedAt: schema.governedSourcePublications.publishedAt,
          })
          .from(schema.governedSourceVersions)
          .innerJoin(
            schema.governedSources,
            and(
              eq(
                schema.governedSources.id,
                schema.governedSourceVersions.sourceId,
              ),
              eq(
                schema.governedSources.organizationId,
                context.organizationId,
              ),
            ),
          )
          .innerJoin(
            schema.governedSourcePublications,
            and(
              eq(
                schema.governedSourcePublications.sourceVersionId,
                schema.governedSourceVersions.id,
              ),
              eq(
                schema.governedSourcePublications.organizationId,
                context.organizationId,
              ),
              eq(schema.governedSourcePublications.decision, "published"),
            ),
          )
          .where(
            and(
              eq(
                schema.governedSourceVersions.organizationId,
                context.organizationId,
              ),
              eq(
                schema.governedSourceVersions.verifyCurrentStatus,
                "verified_current",
              ),
            ),
          )
          .orderBy(schema.governedSources.title),
        this.database.select().from(schema.marketPlaybooks).where(organization).orderBy(schema.marketPlaybooks.name),
        this.database.select().from(schema.playbookVersions).where(eq(schema.playbookVersions.organizationId, context.organizationId)).orderBy(desc(schema.playbookVersions.createdAt)),
        this.database.select().from(schema.playbookRequirements).where(eq(schema.playbookRequirements.organizationId, context.organizationId)).orderBy(schema.playbookRequirements.position),
        this.database.select().from(schema.playbookApplicabilityRules).where(eq(schema.playbookApplicabilityRules.organizationId, context.organizationId)).orderBy(schema.playbookApplicabilityRules.position),
        this.database.select().from(schema.playbookVersionReviews).where(eq(schema.playbookVersionReviews.organizationId, context.organizationId)).orderBy(desc(schema.playbookVersionReviews.reviewedAt)),
        this.database.select({ id: schema.renewalCases.id, title: schema.renewalCases.title, renewalDate: schema.renewalCases.renewalDate, peril: schema.renewalCases.peril, jurisdiction: schema.renewalCases.jurisdiction, propertyClass: schema.renewalCases.propertyClass }).from(schema.renewalCases).where(and(eq(schema.renewalCases.organizationId, context.organizationId), assignedCaseIds ? inArray(schema.renewalCases.id, scopedCaseIds) : undefined)).orderBy(schema.renewalCases.renewalDate),
        this.database.select().from(schema.casePlaybookLinks).where(and(eq(schema.casePlaybookLinks.organizationId, context.organizationId), assignedCaseIds ? inArray(schema.casePlaybookLinks.caseId, scopedCaseIds) : undefined)).orderBy(desc(schema.casePlaybookLinks.linkedAt)),
      ]);
    return {
      markets,
      programs,
      requirementVersions,
      publishedSourceVersions,
      playbooks,
      versions,
      requirements,
      rules,
      reviews,
      cases,
      links,
    };
  }

  private async caseContext(context: TenantContext, caseId: string) {
    assertResourceAccess(context, ["renewal_case"], "read", caseId);
    const rows = await this.database
      .select({
        id: schema.renewalCases.id,
        renewalDate: schema.renewalCases.renewalDate,
        jurisdiction: schema.renewalCases.jurisdiction,
        peril: schema.renewalCases.peril,
        propertyClass: schema.renewalCases.propertyClass,
      })
      .from(schema.renewalCases)
      .where(
        and(
          eq(schema.renewalCases.id, caseId),
          eq(schema.renewalCases.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Renewal case");
    return rows[0];
  }

  async resolveApplicableVersion(
    context: TenantContext,
    input: { caseId: string; marketId: string; programId?: string; policyForm?: string },
  ) {
    assertAuthorized(context, {
      action: "read",
      resource: "playbook_version",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    assertResourceAccess(
      context,
      [
        "playbook_version_review",
        "governed_source_version",
        "governed_source_publication",
        "renewal_case",
      ],
      "read",
      input.caseId,
    );
    const renewalCase = await this.caseContext(context, input.caseId);
    const approved = await this.database
      .select({ version: schema.playbookVersions, review: schema.playbookVersionReviews })
      .from(schema.playbookVersions)
      .innerJoin(
        schema.playbookVersionReviews,
        and(
          eq(schema.playbookVersionReviews.playbookVersionId, schema.playbookVersions.id),
          eq(schema.playbookVersionReviews.organizationId, context.organizationId),
          eq(schema.playbookVersionReviews.decision, "approved"),
        ),
      )
      .innerJoin(
        schema.governedSourceVersions,
        and(
          eq(
            schema.governedSourceVersions.id,
            schema.playbookVersions.governedSourceVersionId,
          ),
          eq(
            schema.governedSourceVersions.organizationId,
            context.organizationId,
          ),
          eq(
            schema.governedSourceVersions.verifyCurrentStatus,
            "verified_current",
          ),
        ),
      )
      .innerJoin(
        schema.governedSourcePublications,
        and(
          eq(
            schema.governedSourcePublications.sourceVersionId,
            schema.governedSourceVersions.id,
          ),
          eq(
            schema.governedSourcePublications.organizationId,
            context.organizationId,
          ),
          eq(schema.governedSourcePublications.decision, "published"),
        ),
      )
      .where(
        and(
          eq(schema.playbookVersions.organizationId, context.organizationId),
          eq(schema.playbookVersions.marketId, input.marketId),
          eq(schema.playbookVersions.jurisdiction, renewalCase.jurisdiction),
          eq(schema.playbookVersions.peril, renewalCase.peril),
          eq(schema.playbookVersions.propertyClass, renewalCase.propertyClass),
        ),
      );
    const matches = approved.filter(({ version }) =>
      (version.programId ?? undefined) === input.programId &&
      (!version.policyForm || version.policyForm === input.policyForm) &&
      version.effectiveFrom <= renewalCase.renewalDate &&
      (!version.effectiveTo || version.effectiveTo >= renewalCase.renewalDate),
    );
    if (!matches.length)
      throw new PlaybookApplicabilityError(
        "no_match",
        "No approved playbook version matches this destination, case scope, and renewal date.",
      );
    if (matches.length > 1)
      throw new PlaybookApplicabilityError(
        "ambiguous",
        "Multiple approved playbook versions match. An administrator must resolve the overlapping scope.",
      );
    return { renewalCase, ...matches[0] };
  }

  async linkCase(
    context: TenantContext,
    input: { caseId: string; marketId: string; programId?: string; policyForm?: string },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "case_playbook_link",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    assertAuthorized(context, {
      action: "create",
      resource: "governed_source_dependency",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    const resolved = await this.resolveApplicableVersion(context, input);
    const prior = await this.database
      .select()
      .from(schema.casePlaybookLinks)
      .where(
        and(
          eq(schema.casePlaybookLinks.organizationId, context.organizationId),
          eq(schema.casePlaybookLinks.caseId, input.caseId),
          eq(schema.casePlaybookLinks.destinationMarketId, input.marketId),
        ),
      )
      .orderBy(desc(schema.casePlaybookLinks.linkedAt), desc(schema.casePlaybookLinks.id));
    const priorLink = prior.find(
      (item) => (item.destinationProgramId ?? undefined) === input.programId,
    );
    const at = this.clock().toISOString();
    const linkId = randomUUID();
    return this.database.transaction(async (transaction) => {
      const database = transaction as unknown as ProductionDatabaseLike;
      await database.insert(schema.casePlaybookLinks).values({
        id: linkId,
        ...tenantRecord(context, at),
        caseId: input.caseId,
        playbookVersionId: resolved.version.id,
        destinationMarketId: input.marketId,
        destinationProgramId: input.programId,
        linkedAt: at,
        linkedBy: context.actorSubject,
        supersedesLinkId: priorLink?.id,
      });
      if (resolved.version.governedSourceVersionId)
        await database
          .insert(schema.governedSourceDependencies)
          .values({
            id: randomUUID(),
            ...tenantRecord(context, at),
            sourceVersionId: resolved.version.governedSourceVersionId,
            consumerType: "renewal_case",
            consumerId: input.caseId,
            relationship: "relied_on",
            rationale:
              "The case pins a playbook that relies on this exact published source version.",
            pinnedAt: at,
            pinnedBy: context.actorSubject,
          })
          .onConflictDoNothing();
      await appendAudit(database, context, {
        action: "case.playbook_version_linked",
        resourceType: "case_playbook_link",
        resourceId: linkId,
        detail: {
          caseId: input.caseId,
          playbookVersionId: resolved.version.id,
          supersedesLinkId: priorLink?.id ?? null,
        },
        occurredAt: at,
      });
      return { linkId, playbookVersionId: resolved.version.id, supersedesLinkId: priorLink?.id ?? null };
    });
  }

  async evaluateCase(
    context: TenantContext,
    input: { caseId: string; marketId: string; programId?: string; policyForm?: string },
  ) {
    assertAuthorized(context, {
      action: "read",
      resource: "case_playbook_link",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    assertResourceAccess(
      context,
      [
        "playbook_requirement",
        "requirement_version",
        "requirement",
        "playbook_applicability_rule",
        "evidence_requirement_link",
        "evidence_version",
        "evidence_item",
        "contradiction",
      ],
      "read",
      input.caseId,
    );
    const resolved = await this.resolveApplicableVersion(context, input);
    const destination: DestinationContext = {
      marketId: input.marketId,
      programId: input.programId,
      jurisdiction: resolved.renewalCase.jurisdiction,
      peril: resolved.renewalCase.peril,
      propertyClass: resolved.renewalCase.propertyClass,
      policyForm: input.policyForm,
    };
    const requirements = await this.database
      .select({
        rule: schema.playbookRequirements,
        requirement: schema.requirements,
        requirementVersion: schema.requirementVersions,
      })
      .from(schema.playbookRequirements)
      .innerJoin(
        schema.requirementVersions,
        eq(schema.requirementVersions.id, schema.playbookRequirements.requirementVersionId),
      )
      .innerJoin(
        schema.requirements,
        eq(schema.requirements.id, schema.requirementVersions.requirementId),
      )
      .where(
        and(
          eq(schema.playbookRequirements.organizationId, context.organizationId),
          eq(schema.playbookRequirements.playbookVersionId, resolved.version.id),
        ),
      )
      .orderBy(asc(schema.playbookRequirements.position));
    const ruleIds = requirements.map((entry) => entry.rule.id);
    const conditions = ruleIds.length
      ? await this.database
          .select()
          .from(schema.playbookApplicabilityRules)
          .where(
            and(
              eq(schema.playbookApplicabilityRules.organizationId, context.organizationId),
              inArray(schema.playbookApplicabilityRules.playbookRequirementId, ruleIds),
            ),
          )
          .orderBy(asc(schema.playbookApplicabilityRules.position))
      : [];
    const requirementVersionIds = requirements.map(
      (entry) => entry.rule.requirementVersionId,
    );
    const linkedEvidence = requirementVersionIds.length
      ? await this.database
          .select({
            link: schema.evidenceRequirementLinks,
            version: schema.evidenceVersions,
            item: schema.evidenceItems,
          })
          .from(schema.evidenceRequirementLinks)
          .innerJoin(
            schema.evidenceVersions,
            eq(schema.evidenceVersions.id, schema.evidenceRequirementLinks.evidenceVersionId),
          )
          .innerJoin(
            schema.evidenceItems,
            eq(schema.evidenceItems.id, schema.evidenceVersions.evidenceItemId),
          )
          .where(
            and(
              eq(schema.evidenceRequirementLinks.organizationId, context.organizationId),
              eq(schema.evidenceRequirementLinks.caseId, input.caseId),
              inArray(schema.evidenceRequirementLinks.requirementVersionId, requirementVersionIds),
            ),
          )
      : [];
    const contradictions = await this.database
      .select()
      .from(schema.contradictions)
      .where(
        and(
          eq(schema.contradictions.organizationId, context.organizationId),
          eq(schema.contradictions.caseId, input.caseId),
          eq(schema.contradictions.status, "open"),
        ),
      );
    const contradictoryEvidenceIds = new Set(
      contradictions.flatMap((item) => [
        item.leftEvidenceVersionId,
        item.rightEvidenceVersionId,
      ]),
    );
    const asOf = resolved.renewalCase.renewalDate;
    const results = requirements.map(({ rule, requirement, requirementVersion }) => {
      const requirementConditions = conditions
        .filter((condition) => condition.playbookRequirementId === rule.id)
        .map((condition) => ({
          field: condition.field as ApplicabilityField,
          operator: condition.operator as ApplicabilityOperator,
          expectedValues: condition.expectedValues,
        }));
      if (!requirementConditions.every((condition) => conditionMatches(condition, destination)))
        return {
          requirementId: rule.id,
          code: requirement.code,
          title: requirement.title,
          importance: rule.importance,
          blocking: rule.blocking,
          state: "not_applicable" as RequirementState,
          explanation: "The bounded applicability conditions do not match this destination.",
          evidenceVersionIds: [],
          caveat: rule.caveat,
        };
      const evidence = linkedEvidence.filter(
        (entry) => entry.link.requirementVersionId === requirementVersion.id,
      );
      let state: RequirementState = "ready";
      let explanation = "At least one linked evidence version satisfies every configured check.";
      const checks = evidence.map((entry) => {
        const date = entry.version.captureDate ?? entry.version.receivedAt;
        const age = ageInDays(date, asOf);
        return {
          accepted:
            (!rule.acceptedEvidenceTypes.length ||
              rule.acceptedEvidenceTypes.includes(entry.item.evidenceType)) &&
            (!rule.acceptedSourceTypes.length ||
              rule.acceptedSourceTypes.includes(entry.version.sourceType)) &&
            !["rejected", "insufficient"].includes(entry.link.disposition),
          scope:
            entry.link.scopeStatus === "matched" &&
            entry.version.scopeType === rule.requiredScopeType,
          fresh:
            entry.link.freshnessStatus === "current" &&
            (!entry.version.expiresAt || entry.version.expiresAt.slice(0, 10) >= asOf) &&
            age >= 0 &&
            (rule.freshnessDays === null || age <= rule.freshnessDays),
          reviewed:
            reviewSatisfied(entry.link.reviewStatus, rule.requiredReviewStatus) &&
            reviewSatisfied(entry.version.reviewStatus, rule.requiredReviewStatus),
        };
      });
      if (!evidence.length) {
        state = "missing";
        explanation = "No evidence version is linked to this requirement version.";
      } else if (
        evidence.some((entry) => contradictoryEvidenceIds.has(entry.version.id))
      ) {
        state = "contradiction";
        explanation = "Linked evidence participates in an unresolved contradiction.";
      } else if (!checks.some((check) => check.accepted)) {
        state = "insufficient";
        explanation = "Linked evidence does not meet the configured type, source, or disposition rules.";
      } else if (
        !checks.some((check) => check.accepted && check.scope)
      ) {
        state = "scope_mismatch";
        explanation = `No linked evidence matches the required ${rule.requiredScopeType} scope.`;
      } else if (
        !checks.some((check) => check.accepted && check.scope && check.fresh)
      ) {
        state = "stale";
        explanation = `No linked evidence meets the ${rule.freshnessDays ?? "configured"}-day freshness policy.`;
      } else if (
        !checks.some(
          (check) => check.accepted && check.scope && check.fresh && check.reviewed,
        )
      ) {
        state = "unreviewed";
        explanation = `No linked evidence has the required ${rule.requiredReviewStatus} review state.`;
      }
      return {
        requirementId: rule.id,
        code: requirement.code,
        title: requirement.title,
        importance: rule.importance,
        blocking: rule.blocking,
        state,
        explanation,
        evidenceVersionIds: evidence.map((entry) => entry.version.id),
        caveat: rule.caveat,
      };
    });
    const blocking = results.filter(
      (item) => item.blocking && !["ready", "not_applicable"].includes(item.state),
    );
    const requiredGaps = results.filter(
      (item) => item.importance === "required" && !["ready", "not_applicable"].includes(item.state),
    );
    const recommendedGaps = results.filter(
      (item) => item.importance === "recommended" && !["ready", "not_applicable"].includes(item.state),
    );
    const status = blocking.length
      ? "blocked"
      : requiredGaps.length
        ? "review_required"
        : recommendedGaps.length
          ? "ready_with_caveats"
          : "ready_for_human_confirmation";
    const pinned = await this.database
      .select({ id: schema.casePlaybookLinks.id })
      .from(schema.casePlaybookLinks)
      .where(
        and(
          eq(schema.casePlaybookLinks.organizationId, context.organizationId),
          eq(schema.casePlaybookLinks.caseId, input.caseId),
          eq(schema.casePlaybookLinks.playbookVersionId, resolved.version.id),
          eq(schema.casePlaybookLinks.destinationMarketId, input.marketId),
        ),
      )
      .limit(1);
    return {
      status,
      label: "Submission evidence readiness",
      playbookVersion: {
        id: resolved.version.id,
        versionNumber: resolved.version.versionNumber,
        contentHash: resolved.version.contentHash,
        sourceName: resolved.version.sourceName,
        sourceVersion: resolved.version.sourceVersion,
        sourceCitation: resolved.version.sourceCitation,
        verifyCurrent: resolved.version.verifyCurrent,
      },
      destination,
      pinned: Boolean(pinned[0]),
      requirements: results,
      blockers: blocking.map((item) => item.code),
      caveats: [
        ...results.filter((item) => item.caveat).map((item) => item.caveat as string),
        ...(!pinned[0] ? ["This exact playbook version is not yet pinned to the case destination."] : []),
        "Evidence readiness is not an underwriting risk score, compliance finding, acceptance probability, or insurance outcome prediction.",
      ],
      calculation: {
        method: "deterministic_requirement_states_v1",
        averageUsed: false,
        rule: "Any unresolved blocking requirement makes the destination blocked; averages cannot offset blockers.",
      },
    };
  }

  async diffVersions(context: TenantContext, fromVersionId: string, toVersionId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "playbook_version",
      resourceOrganizationId: context.organizationId,
    });
    assertResourceAccess(context, [
      "playbook_requirement",
      "playbook_applicability_rule",
    ]);
    const versions = await this.database
      .select()
      .from(schema.playbookVersions)
      .where(
        and(
          eq(schema.playbookVersions.organizationId, context.organizationId),
          inArray(schema.playbookVersions.id, [fromVersionId, toVersionId]),
        ),
      );
    if (versions.length !== 2) throw new TenantResourceNotFoundError("Playbook version");
    const requirementRows = await this.database
      .select()
      .from(schema.playbookRequirements)
      .where(
        and(
          eq(schema.playbookRequirements.organizationId, context.organizationId),
          inArray(schema.playbookRequirements.playbookVersionId, [fromVersionId, toVersionId]),
        ),
      );
    const applicabilityRows = requirementRows.length
      ? await this.database
          .select()
          .from(schema.playbookApplicabilityRules)
          .where(
            and(
              eq(schema.playbookApplicabilityRules.organizationId, context.organizationId),
              inArray(
                schema.playbookApplicabilityRules.playbookRequirementId,
                requirementRows.map((item) => item.id),
              ),
            ),
          )
      : [];
    const from = versions.find((item) => item.id === fromVersionId)!;
    const to = versions.find((item) => item.id === toVersionId)!;
    const fromMap = new Map(requirementRows.filter((item) => item.playbookVersionId === fromVersionId).map((item) => [item.requirementVersionId, item]));
    const toMap = new Map(requirementRows.filter((item) => item.playbookVersionId === toVersionId).map((item) => [item.requirementVersionId, item]));
    return {
      from: { id: from.id, versionNumber: from.versionNumber, contentHash: from.contentHash },
      to: { id: to.id, versionNumber: to.versionNumber, contentHash: to.contentHash },
      scopeChanged: ["marketId", "programId", "jurisdiction", "peril", "propertyClass", "policyForm", "effectiveFrom", "effectiveTo"].filter(
        (key) => from[key as keyof typeof from] !== to[key as keyof typeof to],
      ),
      added: [...toMap.keys()].filter((id) => !fromMap.has(id)),
      removed: [...fromMap.keys()].filter((id) => !toMap.has(id)),
      changed: [...toMap.keys()].filter((id) => {
        const previous = fromMap.get(id);
        const current = toMap.get(id);
        const configuration = (item: typeof previous) =>
          item
            ? {
                position: item.position,
                importance: item.importance,
                blocking: item.blocking,
                acceptedEvidenceTypes: item.acceptedEvidenceTypes,
                freshnessDays: item.freshnessDays,
                requiredScopeType: item.requiredScopeType,
                acceptedSourceTypes: item.acceptedSourceTypes,
                requiredReviewStatus: item.requiredReviewStatus,
                deadlineDaysBefore: item.deadlineDaysBefore,
                templateKey: item.templateKey,
                deliveryRequirement: item.deliveryRequirement,
                caveat: item.caveat,
                conditions: applicabilityRows
                  .filter((rule) => rule.playbookRequirementId === item.id)
                  .toSorted((left, right) => left.position - right.position)
                  .map((rule) => ({
                    position: rule.position,
                    field: rule.field,
                    operator: rule.operator,
                    expectedValues: rule.expectedValues,
                  })),
              }
            : null;
        return (
          previous &&
          current &&
          digest(configuration(previous)) !== digest(configuration(current))
        );
      }),
    };
  }
}

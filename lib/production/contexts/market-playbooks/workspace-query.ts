import { and, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  type ResourceClass,
} from "@/lib/production/authorization";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";

export type MarketPlaybookWorkspaceQuery = QueryOperation<
  "market_playbooks.workspace",
  TenantContext
>;

export function marketPlaybookWorkspaceQuery(
  context: TenantContext,
): MarketPlaybookWorkspaceQuery {
  return defineQuery({
    boundedContext: "market_playbooks",
    name: "market_playbooks.workspace",
    context,
    input: undefined,
  });
}

export interface MarketPlaybookWorkspaceQueryPort {
  execute(
    query: MarketPlaybookWorkspaceQuery,
  ): Promise<MarketPlaybookWorkspace>;
}

function assertWorkspaceAccess(
  context: TenantContext,
  resources: ResourceClass[],
) {
  for (const resource of resources)
    assertAuthorized(context, {
      action: "read",
      resource,
      resourceOrganizationId: context.organizationId,
    });
}

export class MarketPlaybookWorkspaceQueryService
  implements MarketPlaybookWorkspaceQueryPort
{
  constructor(private readonly database: ProductionDatabaseLike) {}

  async execute(query: MarketPlaybookWorkspaceQuery) {
    const { context } = query;
    assertAuthorized(context, {
      action: "read",
      resource: "market_playbook",
      resourceOrganizationId: context.organizationId,
    });
    assertWorkspaceAccess(context, [
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

    const organizationId = context.organizationId;
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
    ] = await Promise.all([
      this.database
        .select()
        .from(schema.markets)
        .where(eq(schema.markets.organizationId, organizationId))
        .orderBy(schema.markets.name),
      this.database
        .select()
        .from(schema.programs)
        .where(eq(schema.programs.organizationId, organizationId))
        .orderBy(schema.programs.name),
      this.database
        .select({
          id: schema.requirementVersions.id,
          version: schema.requirementVersions.version,
          summary: schema.requirementVersions.summary,
          sourceUrl: schema.requirementVersions.sourceUrl,
          requirementId: schema.requirements.id,
          code: schema.requirements.code,
          title: schema.requirements.title,
          scopeType: schema.requirements.scopeType,
        })
        .from(schema.requirementVersions)
        .innerJoin(
          schema.requirements,
          and(
            eq(
              schema.requirements.id,
              schema.requirementVersions.requirementId,
            ),
            eq(schema.requirements.organizationId, organizationId),
          ),
        )
        .where(eq(schema.requirementVersions.organizationId, organizationId))
        .orderBy(schema.requirements.title),
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
            eq(schema.governedSources.organizationId, organizationId),
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
              organizationId,
            ),
            eq(schema.governedSourcePublications.decision, "published"),
          ),
        )
        .where(
          and(
            eq(schema.governedSourceVersions.organizationId, organizationId),
            eq(
              schema.governedSourceVersions.verifyCurrentStatus,
              "verified_current",
            ),
          ),
        )
        .orderBy(schema.governedSources.title),
      this.database
        .select()
        .from(schema.marketPlaybooks)
        .where(eq(schema.marketPlaybooks.organizationId, organizationId))
        .orderBy(schema.marketPlaybooks.name),
      this.database
        .select()
        .from(schema.playbookVersions)
        .where(eq(schema.playbookVersions.organizationId, organizationId))
        .orderBy(desc(schema.playbookVersions.createdAt)),
      this.database
        .select()
        .from(schema.playbookRequirements)
        .where(eq(schema.playbookRequirements.organizationId, organizationId))
        .orderBy(schema.playbookRequirements.position),
      this.database
        .select()
        .from(schema.playbookApplicabilityRules)
        .where(
          eq(schema.playbookApplicabilityRules.organizationId, organizationId),
        )
        .orderBy(schema.playbookApplicabilityRules.position),
      this.database
        .select()
        .from(schema.playbookVersionReviews)
        .where(eq(schema.playbookVersionReviews.organizationId, organizationId))
        .orderBy(desc(schema.playbookVersionReviews.reviewedAt)),
      this.database
        .select({
          id: schema.renewalCases.id,
          title: schema.renewalCases.title,
          renewalDate: schema.renewalCases.renewalDate,
          peril: schema.renewalCases.peril,
          jurisdiction: schema.renewalCases.jurisdiction,
          propertyClass: schema.renewalCases.propertyClass,
        })
        .from(schema.renewalCases)
        .where(
          and(
            eq(schema.renewalCases.organizationId, organizationId),
            assignedCaseIds
              ? inArray(schema.renewalCases.id, scopedCaseIds)
              : undefined,
          ),
        )
        .orderBy(schema.renewalCases.renewalDate),
      this.database
        .select()
        .from(schema.casePlaybookLinks)
        .where(
          and(
            eq(schema.casePlaybookLinks.organizationId, organizationId),
            assignedCaseIds
              ? inArray(schema.casePlaybookLinks.caseId, scopedCaseIds)
              : undefined,
          ),
        )
        .orderBy(desc(schema.casePlaybookLinks.linkedAt)),
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
}

export type MarketPlaybookWorkspace = Awaited<
  ReturnType<MarketPlaybookWorkspaceQueryService["execute"]>
>;

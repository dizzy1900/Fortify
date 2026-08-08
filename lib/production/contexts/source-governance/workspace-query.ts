import { desc, eq } from "drizzle-orm";
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

const workspaceReadResources = [
  "governed_source",
  "governed_source_version",
  "governed_source_review",
  "governed_source_publication",
  "governed_source_dependency",
  "source_change_alert",
] as const satisfies readonly ResourceClass[];

export type SourceGovernanceWorkspaceQuery = QueryOperation<
  "source_governance.workspace",
  TenantContext
>;

export function sourceGovernanceWorkspaceQuery(
  context: TenantContext,
): SourceGovernanceWorkspaceQuery {
  return defineQuery({
    boundedContext: "source_governance",
    name: "source_governance.workspace",
    context,
    input: undefined,
  });
}

export interface SourceGovernanceWorkspaceQueryPort {
  execute(
    query: SourceGovernanceWorkspaceQuery,
  ): Promise<SourceGovernanceWorkspace>;
}

function assertWorkspaceRead(context: TenantContext) {
  for (const resource of workspaceReadResources)
    assertAuthorized(context, {
      action: "read",
      resource,
      resourceOrganizationId: context.organizationId,
    });
}

export class SourceGovernanceWorkspaceQueryService
  implements SourceGovernanceWorkspaceQueryPort
{
  constructor(private readonly database: ProductionDatabaseLike) {}

  async execute(query: SourceGovernanceWorkspaceQuery) {
    const { context } = query;
    assertWorkspaceRead(context);
    const organizationId = context.organizationId;
    const [sources, versions, reviews, publications, dependencies, alerts] =
      await Promise.all([
        this.database
          .select()
          .from(schema.governedSources)
          .where(eq(schema.governedSources.organizationId, organizationId))
          .orderBy(
            schema.governedSources.issuingAuthority,
            schema.governedSources.title,
          ),
        this.database
          .select()
          .from(schema.governedSourceVersions)
          .where(
            eq(schema.governedSourceVersions.organizationId, organizationId),
          )
          .orderBy(desc(schema.governedSourceVersions.createdAt)),
        this.database
          .select()
          .from(schema.governedSourceReviews)
          .where(
            eq(schema.governedSourceReviews.organizationId, organizationId),
          )
          .orderBy(desc(schema.governedSourceReviews.reviewedAt)),
        this.database
          .select()
          .from(schema.governedSourcePublications)
          .where(
            eq(
              schema.governedSourcePublications.organizationId,
              organizationId,
            ),
          )
          .orderBy(desc(schema.governedSourcePublications.publishedAt)),
        this.database
          .select()
          .from(schema.governedSourceDependencies)
          .where(
            eq(
              schema.governedSourceDependencies.organizationId,
              organizationId,
            ),
          )
          .orderBy(desc(schema.governedSourceDependencies.pinnedAt)),
        this.database
          .select()
          .from(schema.sourceChangeAlerts)
          .where(eq(schema.sourceChangeAlerts.organizationId, organizationId))
          .orderBy(desc(schema.sourceChangeAlerts.createdAtEvent)),
      ]);

    return {
      sources,
      versions,
      reviews,
      publications,
      dependencies,
      alerts,
      unavailableImpactTargets: {
        reports:
          "Generated analytics reports preserve exact source-version lineage and require explicit regeneration after source change.",
      },
      doctrine: {
        extractedRulesAutomaticallyOperative: false as const,
        publicationRequiresHumanConfirmation: true as const,
        publicationRequiresIndependentReview: true as const,
      },
    };
  }
}

export type SourceGovernanceWorkspace = Awaited<
  ReturnType<SourceGovernanceWorkspaceQueryService["execute"]>
>;

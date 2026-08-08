import { asc, desc, eq } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import { providerBoundaryCatalog } from "@/lib/production/integration-providers";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";

export type IntegrationWorkspaceQuery = QueryOperation<
  "integrations.workspace",
  TenantContext
>;

export function integrationWorkspaceQuery(
  context: TenantContext,
): IntegrationWorkspaceQuery {
  return defineQuery({
    boundedContext: "integrations",
    name: "integrations.workspace",
    context,
    input: undefined,
  });
}

export interface IntegrationWorkspaceQueryPort {
  execute(query: IntegrationWorkspaceQuery): Promise<IntegrationWorkspace>;
}

export class IntegrationWorkspaceQueryService
  implements IntegrationWorkspaceQueryPort
{
  constructor(private readonly database: ProductionDatabaseLike) {}

  async execute(query: IntegrationWorkspaceQuery) {
    const { context } = query;
    assertAuthorized(context, {
      action: "read",
      resource: "integration_connection",
      resourceOrganizationId: context.organizationId,
    });
    const organization = eq(
      schema.integrationConnections.organizationId,
      context.organizationId,
    );
    const [
      connections,
      events,
      schemas,
      jobs,
      attempts,
      receipts,
      endpoints,
      deliveries,
      healthChecks,
    ] = await Promise.all([
      this.database
        .select()
        .from(schema.integrationConnections)
        .where(organization)
        .orderBy(asc(schema.integrationConnections.name)),
      this.database
        .select()
        .from(schema.integrationConnectionEvents)
        .where(
          eq(
            schema.integrationConnectionEvents.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationConnectionEvents.occurredAt)),
      this.database
        .select()
        .from(schema.integrationSchemaVersions)
        .where(
          eq(
            schema.integrationSchemaVersions.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationSchemaVersions.versionNumber)),
      this.database
        .select()
        .from(schema.integrationSyncJobs)
        .where(
          eq(schema.integrationSyncJobs.organizationId, context.organizationId),
        )
        .orderBy(desc(schema.integrationSyncJobs.requestedAt)),
      this.database
        .select()
        .from(schema.integrationSyncAttempts)
        .where(
          eq(
            schema.integrationSyncAttempts.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationSyncAttempts.startedAt)),
      this.database
        .select()
        .from(schema.integrationSyncReceipts)
        .where(
          eq(
            schema.integrationSyncReceipts.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationSyncReceipts.completedAt)),
      this.database
        .select()
        .from(schema.integrationWebhookEndpoints)
        .where(
          eq(
            schema.integrationWebhookEndpoints.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(asc(schema.integrationWebhookEndpoints.endpointKey)),
      this.database
        .select()
        .from(schema.integrationWebhookDeliveries)
        .where(
          eq(
            schema.integrationWebhookDeliveries.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationWebhookDeliveries.receivedAt)),
      this.database
        .select()
        .from(schema.integrationProviderHealthChecks)
        .where(
          eq(
            schema.integrationProviderHealthChecks.organizationId,
            context.organizationId,
          ),
        )
        .orderBy(desc(schema.integrationProviderHealthChecks.checkedAt)),
    ]);
    return {
      connections,
      events,
      schemas,
      jobs,
      attempts,
      receipts,
      endpoints,
      deliveries,
      healthChecks,
      providerCatalog: providerBoundaryCatalog,
      boundaries: {
        liveCredentialsAvailable: false,
        fixtureModeExplicit: true,
        inlineSecretsAllowed: false,
        signedWebhooksRequired: true,
        externalAcceptanceImplied: false,
        providerRecordsRequireHumanReview: true,
      },
    };
  }
}

export type IntegrationWorkspace = Awaited<
  ReturnType<IntegrationWorkspaceQueryService["execute"]>
>;

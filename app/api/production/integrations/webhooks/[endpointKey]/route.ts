import { NextRequest } from "next/server";
import { authenticationFailure } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";
import { getProductionDatabase } from "@/db/production/client";
import { consumeRequestRateLimit } from "@/lib/production/rate-limit";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { resolveTenantBootstrap } from "@/lib/production/tenant-bootstrap";
import {
  setApplicationTransactionRole,
  setTenantTransactionContext,
  type TenantTransaction,
} from "@/lib/production/tenant-transaction";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointKey: string }> },
) {
  try {
    requireProductionRuntime();
    const database =
      getProductionDatabase() as unknown as ProductionDatabaseLike;
    await consumeRequestRateLimit(database, request, {
      scope: "integration-webhook",
      limit: 300,
      windowSeconds: 60,
    });
    const { endpointKey } = await params;
    const body = new Uint8Array(await request.arrayBuffer());
    return database.transaction(async (rawTransaction) => {
      const transaction = rawTransaction as unknown as TenantTransaction;
      await setApplicationTransactionRole(transaction);
      const organizationId = await resolveTenantBootstrap(transaction, {
        kind: "webhook_endpoint",
        lookupHash: endpointKey,
      });
      await setTenantTransactionContext(transaction, {
        organizationId,
        actorSubject: `webhook:${endpointKey}`,
        principalType: "service_account",
        grantedScopes: ["integration_sync_job:create"],
      });
      return Response.json(
        await getProductionIntegrationService(transaction).receiveWebhook({
          endpointKey,
          externalEventId: request.headers.get("x-fortify-event-id") ?? "",
          eventType: request.headers.get("x-fortify-event-type") ?? "",
          timestamp: request.headers.get("x-fortify-timestamp") ?? "",
          signature: request.headers.get("x-fortify-signature") ?? "",
          body,
        }),
        { status: 202 },
      );
    });
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import type { IntegrationService } from "@/lib/production/integration-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  try {
    requireProductionRuntime();
    const { connectionId } = await params;
    const body = (await request.json()) as Omit<
      Parameters<IntegrationService["transitionConnection"]>[1],
      "connectionId"
    >;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionIntegrationService(
            transaction,
          ).transitionConnection(principal.authorization, {
            ...body,
            connectionId,
          }),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

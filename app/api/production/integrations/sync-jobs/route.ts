import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import type { IntegrationService } from "@/lib/production/integration-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as Parameters<
      IntegrationService["queueSync"]
    >[1];
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionIntegrationService(transaction).queueSync(
            principal.authorization,
            body,
          ),
          { status: 202, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionIntegrationService,
  presentIntegrationWorkspace,
} from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentIntegrationWorkspace(
            await getProductionIntegrationService(transaction).getWorkspace(
              principal.authorization,
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

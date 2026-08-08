import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionIntegrationWorkspaceQuery,
  presentIntegrationWorkspace,
} from "@/lib/production/integration-http";
import { integrationWorkspaceQuery } from "@/lib/production/contexts/integrations/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentIntegrationWorkspace(
            await getProductionIntegrationWorkspaceQuery(transaction).execute(
              integrationWorkspaceQuery(principal.authorization),
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

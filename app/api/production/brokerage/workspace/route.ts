import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionBrokerageWorkspaceQuery,
  presentBrokerageWorkspace,
} from "@/lib/production/brokerage-case-http";
import { brokerageWorkspaceQuery } from "@/lib/production/contexts/case-workflow/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentBrokerageWorkspace(
            await getProductionBrokerageWorkspaceQuery(transaction).execute(
              brokerageWorkspaceQuery(principal.authorization),
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

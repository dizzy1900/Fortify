import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionMarketPlaybookWorkspaceQuery,
  presentMarketPlaybookWorkspace,
} from "@/lib/production/market-playbook-http";
import { marketPlaybookWorkspaceQuery } from "@/lib/production/contexts/market-playbooks/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentMarketPlaybookWorkspace(
            await getProductionMarketPlaybookWorkspaceQuery(
              transaction,
            ).execute(marketPlaybookWorkspaceQuery(principal.authorization)),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

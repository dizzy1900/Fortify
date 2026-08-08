import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionSourceGovernanceWorkspaceQuery,
  presentGovernedSourceWorkspace,
} from "@/lib/production/governed-source-http";
import { sourceGovernanceWorkspaceQuery } from "@/lib/production/contexts/source-governance/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentGovernedSourceWorkspace(
            await getProductionSourceGovernanceWorkspaceQuery(
              transaction,
            ).execute(sourceGovernanceWorkspaceQuery(principal.authorization)),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

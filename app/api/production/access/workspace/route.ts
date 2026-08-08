import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionIdentityAccessWorkspaceQuery,
  presentIdentityAccessWorkspace,
} from "@/lib/production/access-control-http";
import { identityAccessWorkspaceQuery } from "@/lib/production/contexts/identity-access/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentIdentityAccessWorkspace(
            await getProductionIdentityAccessWorkspaceQuery(
              transaction,
            ).execute(identityAccessWorkspaceQuery(principal.authorization)),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

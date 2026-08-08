import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionPropertyGraphService,
  presentPropertyGraphWorkspace,
} from "@/lib/production/property-graph-http";
import { propertyGraphWorkspaceQuery } from "@/lib/production/property-graph-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPropertyGraphWorkspace(
            await getProductionPropertyGraphService(transaction).getWorkspace(
              propertyGraphWorkspaceQuery(principal.authorization),
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionGovernedSourceService,
  presentGovernedSourceWorkspace,
} from "@/lib/production/governed-source-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentGovernedSourceWorkspace(
            await getProductionGovernedSourceService(transaction).getWorkspace(
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

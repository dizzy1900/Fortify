import { NextRequest } from "next/server";
import {
  getProductionTenantRepository,
  presentCommunity,
} from "@/lib/production/community-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          (
            await getProductionTenantRepository(transaction).listCommunities(
              principal.authorization,
            )
          ).map(presentCommunity),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import type { CreateGovernedSourceInput } from "@/lib/production/governed-source-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as CreateGovernedSourceInput;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionGovernedSourceService(transaction).createSource(
            principal.authorization,
            body,
          ),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

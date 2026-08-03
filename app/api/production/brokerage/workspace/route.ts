import { NextRequest } from "next/server";
import { getProductionBrokerageCaseService } from "@/lib/production/brokerage-case-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionBrokerageCaseService(transaction).getWorkspace(
            principal.authorization,
          ),
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

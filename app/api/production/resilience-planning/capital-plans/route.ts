import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionResiliencePlanningService } from "@/lib/production/resilience-planning-http";
import type { CreateCapitalPlanInput } from "@/lib/production/resilience-planning-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as CreateCapitalPlanInput;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionResiliencePlanningService(
            transaction,
          ).createCapitalPlan(principal.authorization, body),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

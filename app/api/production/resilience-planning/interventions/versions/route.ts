import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionResiliencePlanningService } from "@/lib/production/resilience-planning-http";
import type { CreateInterventionVersionInput } from "@/lib/production/resilience-planning-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request);
    return Response.json(await getProductionResiliencePlanningService().createInterventionVersion(principal.authorization, await request.json() as CreateInterventionVersionInput), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request);
    const body = await request.json() as { projectId: string; programmeVersionId: string; facts: Record<string, string | string[] | number> };
    return Response.json(await getProductionFundingProjectService().assessEligibility(principal.authorization, body), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

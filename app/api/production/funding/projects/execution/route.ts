import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import type { ProjectExecutionInput } from "@/lib/production/funding-project-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request);
    return Response.json(await getProductionFundingProjectService().createProjectExecution(principal.authorization, await request.json() as ProjectExecutionInput), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

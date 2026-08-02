import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { projectId } = await params;
    return Response.json(await getProductionFundingProjectService().getProjectWorkspace(principal.authorization, projectId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authenticationFailure(error); }
}

import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ milestoneId: string }> }) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { milestoneId } = await params;
    return Response.json(await getProductionFundingProjectService().recordMilestoneEvent(principal.authorization, { milestoneId, ...await request.json() }), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

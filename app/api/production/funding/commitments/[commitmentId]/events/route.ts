import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ commitmentId: string }> }) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { commitmentId } = await params;
    return Response.json(await getProductionFundingProjectService().recordCommitmentEvent(principal.authorization, { commitmentId, ...await request.json() }), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

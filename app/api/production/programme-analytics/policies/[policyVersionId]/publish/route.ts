import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionProgrammeAnalyticsService } from "@/lib/production/programme-analytics-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ policyVersionId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { policyVersionId } = await params; return Response.json(await getProductionProgrammeAnalyticsService().publishAnalyticsPolicy(principal.authorization, { ...(await request.json()), policyVersionId }), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

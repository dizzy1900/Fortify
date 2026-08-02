import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionResiliencePlanningService } from "@/lib/production/resilience-planning-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { versionId } = await params;
    const body = await request.json() as { decision: "approved" | "changes_requested"; note: string };
    return Response.json(await getProductionResiliencePlanningService().reviewInterventionVersion(principal.authorization, { interventionVersionId: versionId, ...body }), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

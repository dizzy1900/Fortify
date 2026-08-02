import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { versionId } = await params;
    const body = await request.json() as { decision: "approved" | "changes_requested"; sourceAndRulesChecked: boolean; note: string };
    return Response.json(await getProductionFundingProjectService().reviewProgrammeVersion(principal.authorization, { programmeVersionId: versionId, ...body }), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

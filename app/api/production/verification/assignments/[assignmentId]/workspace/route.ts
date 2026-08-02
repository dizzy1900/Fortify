import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const { assignmentId } = await params; return Response.json(await getProductionVerificationService().getAssignmentWorkspace(principal.authorization, assignmentId), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return authenticationFailure(error); }
}

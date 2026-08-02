import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    requireProductionRuntime();
    const [principal, { sessionId }] = await Promise.all([resolveRequestPrincipal(request), params]);
    return Response.json(await getProductionRecognitionSubmissionService().getReviewerWorkspace(principal.authorization, sessionId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authenticationFailure(error); }
}

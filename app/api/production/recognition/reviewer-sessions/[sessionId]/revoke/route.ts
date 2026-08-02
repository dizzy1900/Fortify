import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    requireProductionRuntime();
    const [principal, body, { sessionId }] = await Promise.all([resolveRequestPrincipal(request), request.json(), params]);
    return Response.json(await getProductionRecognitionSubmissionService().revokeReviewerSession(principal.authorization, sessionId, body));
  } catch (error) { return authenticationFailure(error); }
}

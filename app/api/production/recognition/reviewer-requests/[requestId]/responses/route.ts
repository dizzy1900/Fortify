import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    requireProductionRuntime();
    const [principal, body, { requestId }] = await Promise.all([resolveRequestPrincipal(request), request.json(), params]);
    return Response.json(await getProductionRecognitionSubmissionService().respondToRequest(principal.authorization, { ...body, reviewerRequestId: requestId }), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

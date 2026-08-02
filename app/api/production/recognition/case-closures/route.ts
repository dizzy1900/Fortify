import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const [principal, body] = await Promise.all([resolveRequestPrincipal(request), request.json()]);
    return Response.json(await getProductionRecognitionSubmissionService().closeRecognitionCase(principal.authorization, body), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

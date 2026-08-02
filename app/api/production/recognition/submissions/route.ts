import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const [principal, body] = await Promise.all([resolveRequestPrincipal(request), request.json()]);
    if (!body.idempotencyKey) return Response.json({ error: "idempotencyKey is required." }, { status: 400 });
    return Response.json(await getProductionRecognitionSubmissionService().prepareSubmission(principal.authorization, body.idempotencyKey, body), { status: 201 });
  } catch (error) { return authenticationFailure(error); }
}

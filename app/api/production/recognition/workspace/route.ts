import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(await getProductionRecognitionSubmissionService().getWorkspace(principal.authorization), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return authenticationFailure(error); }
}

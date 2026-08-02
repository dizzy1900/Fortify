import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionModelRecognitionService } from "@/lib/production/model-recognition-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionModelRecognitionService(); return Response.json(await service.proposeMapping(principal.authorization, await request.json() as Parameters<typeof service.proposeMapping>[1]), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

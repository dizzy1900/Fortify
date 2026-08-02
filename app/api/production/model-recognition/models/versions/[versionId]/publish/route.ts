import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionModelRecognitionService } from "@/lib/production/model-recognition-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionModelRecognitionService(); const { versionId } = await params; const body = await request.json() as Omit<Parameters<typeof service.publishModelVersion>[1], "modelVersionId">; return Response.json(await service.publishModelVersion(principal.authorization, { ...body, modelVersionId: versionId }), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

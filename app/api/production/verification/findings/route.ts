import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionVerificationService(); return Response.json(await service.recordFinding(principal.authorization, await request.json() as Parameters<typeof service.recordFinding>[1]), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ findingId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionVerificationService(); const { findingId } = await params; const body = await request.json() as Omit<Parameters<typeof service.reviewFinding>[1], "findingId">; return Response.json(await service.reviewFinding(principal.authorization, { ...body, findingId }), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

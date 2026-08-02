import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ credentialId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionVerificationService(); const { credentialId } = await params; const body = await request.json() as Omit<Parameters<typeof service.reviewCredential>[1], "credentialId">; return Response.json(await service.reviewCredential(principal.authorization, { ...body, credentialId }), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

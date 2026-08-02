import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest, { params }: { params: Promise<{ certificateId: string }> }) {
  try { requireProductionRuntime(); const principal = await resolveRequestPrincipal(request); const service = getProductionVerificationService(); const { certificateId } = await params; const body = await request.json() as Omit<Parameters<typeof service.recordCertificateEvent>[1], "certificateId">; return Response.json(await service.recordCertificateEvent(principal.authorization, { ...body, certificateId }), { status: 201 }); }
  catch (error) { return authenticationFailure(error); }
}

import { NextRequest } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { invitationId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      reason?: unknown;
    };
    await new IdentityService(getProductionDatabase()).revokeInvitation(
      principal.authorization,
      invitationId,
      typeof body.reason === "string" ? body.reason : "administrator_revocation",
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionIdentityService } from "@/lib/production/identity-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    requireProductionRuntime();
    const { invitationId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      reason?: unknown;
    };
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "administrator_revocation";
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        await getProductionIdentityService(transaction).revokeInvitation(
          principal.authorization,
          invitationId,
          reason,
        );
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

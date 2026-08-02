import { NextRequest } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { organizationRoles, type OrganizationRole } from "@/lib/production/authorization";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as {
      email?: unknown;
      role?: unknown;
    };
    if (
      typeof body.email !== "string" ||
      typeof body.role !== "string" ||
      !organizationRoles.includes(body.role as OrganizationRole)
    )
      return Response.json(
        { error: "A valid email and organization role are required." },
        { status: 400 },
      );
    const invitation = await new IdentityService(
      getProductionDatabase(),
    ).inviteMembership(principal.authorization, {
      email: body.email,
      role: body.role as OrganizationRole,
    });
    const origin = process.env.FORTIFY_APP_ORIGIN;
    return Response.json(
      {
        invitationId: invitation.invitationId,
        membershipId: invitation.membershipId,
        expiresAt: invitation.expiresAt,
        acceptanceUrl: origin
          ? new URL(
              `/api/auth/oidc/start?invitation=${encodeURIComponent(invitation.token)}`,
              origin,
            ).href
          : null,
        deliveryStatus: origin
          ? "ready_for_out_of_band_delivery"
          : "blocked_missing_app_origin",
      },
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  organizationRoles,
  type OrganizationRole,
} from "@/lib/production/authorization";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionIdentityService,
  presentMembershipInvitation,
} from "@/lib/production/identity-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
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
    const email = body.email;
    const role = body.role as OrganizationRole;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const invitation = await getProductionIdentityService(
          transaction,
        ).inviteMembership(principal.authorization, { email, role });
        return Response.json(
          presentMembershipInvitation(
            invitation,
            process.env.FORTIFY_APP_ORIGIN,
          ),
          {
            status: 201,
            headers: { "Cache-Control": "no-store" },
          },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

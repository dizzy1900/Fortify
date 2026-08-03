import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return withAuthenticatedTenantRequest(request, async (principal) =>
      Response.json({
        organizationId: principal.authorization.organizationId,
        principalType: principal.authorization.principalType,
        role: principal.authorization.role ?? null,
        subject: principal.authorization.actorSubject,
        expiresAt: principal.expiresAt,
      }),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

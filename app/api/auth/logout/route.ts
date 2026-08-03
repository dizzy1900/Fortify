import { NextRequest, NextResponse } from "next/server";
import {
  authenticationFailure,
  clearSessionCookie,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        if (principal.authorization.sessionId)
          await new IdentityService(transaction).revokeSession(
            principal.authorization,
            principal.authorization.sessionId,
            "user_logout",
          );
        const response = NextResponse.json({ ok: true });
        clearSessionCookie(response);
        return response;
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  authenticationFailure,
  clearSessionCookie,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  AuthenticationError,
  IdentityService,
} from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        if (!principal.authorization.sessionId)
          throw new AuthenticationError("A Fortify session is required.");
        await new IdentityService(transaction).revokeSession(
          principal.authorization,
          principal.authorization.sessionId,
          "user_logout",
        );
        const response = NextResponse.json({ ok: true });
        response.headers.set("Cache-Control", "no-store");
        clearSessionCookie(response);
        return response;
      },
    );
  } catch (error) {
    const response = authenticationFailure(error);
    if (response.status === 401 && response instanceof NextResponse)
      clearSessionCookie(response);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  authenticationFailure,
  clearSessionCookie,
  setSessionCookie,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  AuthenticationError,
  IdentityService,
} from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

function noStore(response: Response) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function requireSessionId(sessionId: string | undefined) {
  if (!sessionId)
    throw new AuthenticationError("A Fortify session is required.");
  return sessionId;
}

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(request, async (principal) => {
      requireSessionId(principal.authorization.sessionId);
      return noStore(
        Response.json({
          role: principal.authorization.role ?? null,
          expiresAt: principal.expiresAt,
        }),
      );
    });
  } catch (error) {
    const response = authenticationFailure(error);
    if (response.status === 401 && response instanceof NextResponse)
      clearSessionCookie(response);
    return noStore(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const sessionId = requireSessionId(principal.authorization.sessionId);
        const session = await new IdentityService(transaction).rotateSession(
          principal.authorization,
          sessionId,
          { userAgent: request.headers.get("user-agent") ?? undefined },
        );
        const response = NextResponse.json({
          ok: true,
          expiresAt: session.expiresAt,
        });
        setSessionCookie(response, session.token, session.expiresAt);
        return noStore(response);
      },
    );
  } catch (error) {
    const response = authenticationFailure(error);
    if (response.status === 401 && response instanceof NextResponse)
      clearSessionCookie(response);
    return noStore(response);
  }
}

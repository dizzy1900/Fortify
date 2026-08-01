import type { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import {
  AuthenticationError,
  IdentityService,
  type ResolvedPrincipal,
} from "@/lib/production/identity-service";
import { AuthorizationDeniedError } from "@/lib/production/authorization";
import {
  OptimisticConcurrencyError,
  TenantResourceNotFoundError,
} from "@/lib/production/repository";

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-fortify_session"
    : "fortify_session";

export async function resolveRequestPrincipal(
  request: NextRequest,
): Promise<ResolvedPrincipal | { authorization: Awaited<ReturnType<IdentityService["resolveApiCredential"]>>; expiresAt: string }> {
  const service = new IdentityService(getProductionDatabase());
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token.startsWith("fapi_"))
      return {
        authorization: await service.resolveApiCredential(token),
        expiresAt: "credential-managed",
      };
    if (token.startsWith("fexternal_"))
      return {
        authorization: await service.resolveExternalAccess(token),
        expiresAt: "grant-managed",
      };
    throw new AuthenticationError();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new AuthenticationError("A Fortify session is required.");
  return service.resolveSession(token);
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: string,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function authenticationFailure(error: unknown) {
  if (error instanceof AuthorizationDeniedError)
    return Response.json({ error: error.message }, { status: 403 });
  if (error instanceof TenantResourceNotFoundError)
    return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof OptimisticConcurrencyError)
    return Response.json({ error: error.message }, { status: 409 });
  const message =
    error instanceof AuthenticationError
      ? error.message
      : "Authentication failed closed.";
  return Response.json(
    { error: message },
    { status: error instanceof AuthenticationError ? 401 : 500 },
  );
}

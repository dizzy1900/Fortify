import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { IdentityService } from "@/lib/production/identity-service";
import { loadOidcProvider } from "@/lib/production/identity-provider";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  requireProductionRuntime();
  const applicationOrigin = process.env.FORTIFY_APP_ORIGIN;
  if (!applicationOrigin)
    return Response.json(
      { error: "FORTIFY_APP_ORIGIN is required for OIDC redirects." },
      { status: 503 },
    );
  const origin = new URL(applicationOrigin);
  if (origin.protocol !== "https:" && process.env.NODE_ENV === "production")
    return Response.json(
      { error: "FORTIFY_APP_ORIGIN must use HTTPS in production." },
      { status: 503 },
    );
  const provider = loadOidcProvider();
  const identity = new IdentityService(getProductionDatabase());
  const invitationToken =
    request.nextUrl.searchParams.get("invitation") ?? undefined;
  const invitation = invitationToken
    ? await identity.resolveInvitationForAuthentication(invitationToken)
    : undefined;
  const organizationId =
    invitation?.organizationId ??
    request.nextUrl.searchParams.get("organization") ??
    undefined;
  const returnTo = request.nextUrl.searchParams.get("returnTo") ?? "/portfolio";
  const started = await provider.begin({
    redirectUri: new URL("/api/auth/oidc/callback", origin).href,
    returnTo,
    activeOrganizationId: organizationId,
  });
  await identity.registerAuthenticationAttempt(provider.key, {
    ...started.attempt,
    invitationId: invitation?.invitationId,
  });
  return NextResponse.redirect(started.authorizationUrl);
}

import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { setSessionCookie } from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import { loadOidcProvider } from "@/lib/production/identity-provider";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  requireProductionRuntime();
  const state = request.nextUrl.searchParams.get("state");
  if (!state)
    return Response.json({ error: "OIDC state is required." }, { status: 400 });
  const provider = loadOidcProvider();
  const identity = new IdentityService(getProductionDatabase());
  const attempt = await identity.consumeAuthenticationAttempt(provider.key, state);
  const profile = await provider.complete({
    callbackUrl: request.nextUrl,
    attempt,
  });
  const accepted = attempt.invitationId
    ? await identity.acceptInvitationById(attempt.invitationId, profile)
    : undefined;
  const session = await identity.issueSession({
    profile,
    activeOrganizationId:
      accepted?.membership.organizationId ?? attempt.activeOrganizationId,
    userAgent: request.headers.get("user-agent") ?? undefined,
  });
  const applicationOrigin = new URL(process.env.FORTIFY_APP_ORIGIN!);
  const response = NextResponse.redirect(
    new URL(attempt.returnTo, applicationOrigin),
  );
  setSessionCookie(response, session.token, session.expiresAt);
  return response;
}

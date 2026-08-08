import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import {
  authenticationFailure,
  setSessionCookie,
} from "@/lib/production/http-auth";
import {
  consumeOidcAttemptForRequest,
  issueIdentitySession,
  resolveVerifiedIdentityOrganization,
} from "@/lib/production/identity-http";
import { loadOidcProvider } from "@/lib/production/identity-provider";
import { consumeRequestRateLimit } from "@/lib/production/rate-limit";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const state = request.nextUrl.searchParams.get("state")?.trim();
    if (!state)
      return Response.json(
        { error: "OIDC state is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    const applicationOriginValue = process.env.FORTIFY_APP_ORIGIN;
    if (!applicationOriginValue)
      return Response.json(
        { error: "FORTIFY_APP_ORIGIN is required for OIDC redirects." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    const applicationOrigin = new URL(applicationOriginValue);
    if (
      applicationOrigin.protocol !== "https:" &&
      process.env.NODE_ENV === "production"
    )
      return Response.json(
        { error: "FORTIFY_APP_ORIGIN must use HTTPS in production." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    const database = getProductionDatabase();
    await consumeRequestRateLimit(database, request, {
      scope: "oidc-callback",
      limit: 30,
      windowSeconds: 60,
    });
    const provider = loadOidcProvider();
    const consumed = await consumeOidcAttemptForRequest(
      provider.key,
      state,
      database,
    );
    const profile = await provider.complete({
      callbackUrl: request.nextUrl,
      attempt: consumed.attempt,
    });
    const organizationId =
      consumed.organizationId ??
      (await resolveVerifiedIdentityOrganization(profile, database));
    const { session } = await issueIdentitySession(
      {
        organizationId,
        profile,
        invitationId: consumed.attempt.invitationId,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
      database,
    );
    const response = NextResponse.redirect(
      new URL(consumed.attempt.returnTo, applicationOrigin),
    );
    response.headers.set("Cache-Control", "no-store");
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return authenticationFailure(error);
  }
}

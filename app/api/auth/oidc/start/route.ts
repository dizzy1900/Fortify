import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { authenticationFailure } from "@/lib/production/http-auth";
import {
  getProductionIdentityService,
  resolveInvitationForOidc,
} from "@/lib/production/identity-http";
import { loadOidcProvider } from "@/lib/production/identity-provider";
import { consumeRequestRateLimit } from "@/lib/production/rate-limit";
import { withApplicationTransaction } from "@/lib/production/tenant-transaction";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const database = getProductionDatabase();
    await consumeRequestRateLimit(database, request, {
      scope: "oidc-start",
      limit: 20,
      windowSeconds: 60,
    });
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
    const invitationToken =
      request.nextUrl.searchParams.get("invitation")?.trim() || undefined;
    const invitation = invitationToken
      ? await resolveInvitationForOidc(invitationToken, database)
      : undefined;
    const organizationId =
      invitation?.organizationId ??
      (request.nextUrl.searchParams.get("organization")?.trim() || undefined);
    const returnTo =
      request.nextUrl.searchParams.get("returnTo") ?? "/portfolio";
    const started = await provider.begin({
      redirectUri: new URL("/api/auth/oidc/callback", origin).href,
      returnTo,
      activeOrganizationId: organizationId,
    });
    await withApplicationTransaction(
      (transaction) =>
        getProductionIdentityService(transaction).registerAuthenticationAttempt(
          provider.key,
          {
            ...started.attempt,
            invitationId: invitation?.invitationId,
          },
        ),
      database,
    );
    const response = NextResponse.redirect(started.authorizationUrl);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return authenticationFailure(error);
  }
}

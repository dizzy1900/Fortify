import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import {
  authenticationFailure,
  setSessionCookie,
} from "@/lib/production/http-auth";
import { issueIdentitySession } from "@/lib/production/identity-http";
import { AuthenticationError } from "@/lib/production/identity-service";
import { LocalDevelopmentIdentityProvider } from "@/lib/production/identity-provider";
import { requireProductionRuntime } from "@/lib/runtime";
import { consumeRequestRateLimit } from "@/lib/production/rate-limit";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const database = getProductionDatabase();
    await consumeRequestRateLimit(database, request, {
      scope: "local-auth",
      limit: 10,
      windowSeconds: 60,
    });
    const contentType = request.headers.get("content-type") ?? "";
    const values = contentType.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries(await request.formData());
    const profile = new LocalDevelopmentIdentityProvider().authenticate({
      subject: String(values.subject ?? ""),
      email: String(values.email ?? ""),
      displayName: String(values.displayName ?? ""),
    });
    const organizationId = String(values.organizationId ?? "").trim();
    if (!organizationId)
      throw new AuthenticationError(
        "An organization is required for local development sign-in.",
      );
    const { session } = await issueIdentitySession(
      {
        organizationId,
        profile,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
      database,
    );
    const response = NextResponse.json({
      ok: true,
      expiresAt: session.expiresAt,
    });
    response.headers.set("Cache-Control", "no-store");
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return authenticationFailure(error);
  }
}

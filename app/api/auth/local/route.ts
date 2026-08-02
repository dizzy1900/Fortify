import { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { authenticationFailure, setSessionCookie } from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import { LocalDevelopmentIdentityProvider } from "@/lib/production/identity-provider";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const contentType = request.headers.get("content-type") ?? "";
    const values = contentType.includes("application/json")
      ? ((await request.json()) as Record<string, unknown>)
      : Object.fromEntries(await request.formData());
    const profile = new LocalDevelopmentIdentityProvider().authenticate({
      subject: String(values.subject ?? ""),
      email: String(values.email ?? ""),
      displayName: String(values.displayName ?? ""),
    });
    const identity = new IdentityService(getProductionDatabase());
    const session = await identity.issueSession({
      profile,
      activeOrganizationId: String(values.organizationId ?? ""),
      userAgent: request.headers.get("user-agent") ?? undefined,
    });
    const response = NextResponse.json({
      ok: true,
      expiresAt: session.expiresAt,
    });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return authenticationFailure(error);
  }
}

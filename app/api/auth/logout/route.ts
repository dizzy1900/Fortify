import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionDatabase } from "@/db/production/client";
import { IdentityService } from "@/lib/production/identity-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  requireProductionRuntime();
  const principal = await resolveRequestPrincipal(request);
  if (principal.authorization.sessionId)
    await new IdentityService(getProductionDatabase()).revokeSession(
      principal.authorization,
      principal.authorization.sessionId,
      "user_logout",
    );
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

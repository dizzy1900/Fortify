import { randomBytes, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function contentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function csrfAllowed(request: NextRequest) {
  const hasSession =
    request.cookies.has("fortify_session") ||
    request.cookies.has("__Host-fortify_session");
  if (!UNSAFE_METHODS.has(request.method) || !hasSession) return true;
  const fetchSite = request.headers.get("sec-fetch-site");
  return Boolean(
    process.env.FORTIFY_APP_ORIGIN &&
      request.headers.get("origin") === process.env.FORTIFY_APP_ORIGIN &&
      (!fetchSite || fetchSite === "same-origin"),
  );
}

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const nonce = randomBytes(16).toString("base64");
  const requestIdentifier = request.headers.get("x-request-id") ?? randomUUID();
  const csp = contentSecurityPolicy(nonce);
  requestHeaders.set("content-security-policy", csp);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-request-id", requestIdentifier);
  if (
    process.env.FORTIFY_RUNTIME_MODE === "production" &&
    !csrfAllowed(request)
  )
    return Response.json(
      { error: "Cross-site request rejected." },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "x-request-id": requestIdentifier,
        },
      },
    );
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("x-request-id", requestIdentifier);
  if (process.env.NODE_ENV === "production")
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

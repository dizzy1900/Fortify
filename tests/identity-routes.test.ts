import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import {
  IdentityService,
  RevokedCredentialError,
} from "@/lib/production/identity-service";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/production/http-auth";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { withTenantTransaction } from "@/lib/production/tenant-transaction";
import { proxy } from "@/proxy";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

const routeState = vi.hoisted(() => ({
  database: undefined as ProductionDatabaseLike | undefined,
  begin: vi.fn(),
  complete: vi.fn(),
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return {
    ...original,
    getProductionDatabase: () => routeState.database,
  };
});

vi.mock("@/lib/production/identity-provider", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/production/identity-provider")>();
  return {
    ...original,
    loadOidcProvider: () => ({
      key: "test-oidc",
      begin: routeState.begin,
      complete: routeState.complete,
    }),
  };
});

import { POST as localSignIn } from "@/app/api/auth/local/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as oidcCallback } from "@/app/api/auth/oidc/callback/route";
import { GET as oidcStart } from "@/app/api/auth/oidc/start/route";
import {
  GET as readSession,
  POST as rotateSession,
} from "@/app/api/auth/session/route";

describe("identity route request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;

  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FORTIFY_RUNTIME_MODE", "production");
    vi.stubEnv("DATABASE_URL", "postgres://migration.example.test/fortify");
    vi.stubEnv(
      "FORTIFY_APP_DATABASE_URL",
      "postgres://application.example.test/fortify",
    );
    vi.stubEnv("FORTIFY_LOCAL_IDENTITY_ENABLED", "true");
    vi.stubEnv("FORTIFY_APP_ORIGIN", "https://fortify.test");
    vi.stubEnv(
      "FORTIFY_REQUEST_HASH_KEY",
      "fixture-request-hash-key-32-characters",
    );
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
    routeState.database = database as unknown as ProductionDatabaseLike;
    routeState.begin.mockReset();
    routeState.complete.mockReset();
  });

  afterEach(async () => {
    routeState.database = undefined;
    await client.close();
    vi.unstubAllEnvs();
  });

  test("issues a minimized local-development session inside the selected tenant", async () => {
    const tenant = await createTenantFixture(
      routeState.database!,
      "local-route",
    );
    const at = "2026-08-01T12:00:00.000Z";
    await routeState.database!.insert(schema.identities).values({
      id: "identity-local-route",
      providerKey: "local-development",
      providerSubject: "local-route-user",
      email: "local-route@example.test",
      emailVerified: true,
      displayName: "Local Route User",
      mfaCapable: false,
      lastAuthenticatedAt: at,
      createdAt: at,
      updatedAt: at,
      createdBy: "local-route-user",
      updatedBy: "local-route-user",
      revision: 1,
      lifecycleStatus: "active",
    });
    await routeState.database!.insert(schema.memberships).values({
      id: "membership-local-route",
      organizationId: tenant.organizationId,
      identityId: "identity-local-route",
      identitySubject: "local-development:local-route-user",
      role: "organization_owner",
      status: "active",
      acceptedAt: at,
      createdAt: at,
      updatedAt: at,
      createdBy: "local-route-user",
      updatedBy: "local-route-user",
      revision: 1,
      lifecycleStatus: "active",
    });

    const response = await localSignIn(
      new NextRequest("https://fortify.test/api/auth/local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: "local-route-user",
          email: "local-route@example.test",
          displayName: "Local Route User",
          organizationId: tenant.organizationId,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      expiresAt: expect.any(String),
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toMatch(
      /fortify_session=fsess_[^;]+;.*HttpOnly.*SameSite=Strict.*Priority=high/i,
    );
  });

  test("completes tenant-bound OIDC once and redirects only to the stored safe path", async () => {
    const tenant = await createTenantFixture(
      routeState.database!,
      "oidc-route",
    );
    const owner = await createActiveMembership(routeState.database!, {
      organizationId: tenant.organizationId,
      subject: tenant.context.actorSubject,
      role: "organization_owner",
    });
    routeState.begin.mockImplementation(
      async (input: {
        redirectUri: string;
        returnTo: string;
        activeOrganizationId?: string;
      }) => ({
        authorizationUrl: new URL("https://identity.example.test/authorize"),
        attempt: {
          state: "route-state",
          nonce: "route-nonce",
          pkceVerifier: "route-pkce",
          redirectUri: input.redirectUri,
          returnTo: input.returnTo,
          activeOrganizationId: input.activeOrganizationId,
        },
      }),
    );
    routeState.complete.mockResolvedValue(owner.profile);

    const started = await oidcStart(
      new NextRequest(
        `https://fortify.test/api/auth/oidc/start?organization=${tenant.organizationId}&returnTo=${encodeURIComponent("//attacker.example.test")}`,
      ),
    );
    expect(started.status).toBe(307);
    expect(started.headers.get("location")).toBe(
      "https://identity.example.test/authorize",
    );
    expect(started.headers.get("cache-control")).toBe("no-store");

    const callbackRequest = () =>
      new NextRequest(
        "https://fortify.test/api/auth/oidc/callback?state=route-state&code=fixture-code",
        { headers: { "user-agent": "identity-route-test" } },
      );
    vi.stubEnv("FORTIFY_APP_ORIGIN", "");
    const misconfigured = await oidcCallback(callbackRequest());
    expect(misconfigured.status).toBe(503);
    expect(misconfigured.headers.get("cache-control")).toBe("no-store");
    vi.stubEnv("FORTIFY_APP_ORIGIN", "https://fortify.test");
    const completed = await oidcCallback(callbackRequest());
    expect(completed.status).toBe(307);
    expect(completed.headers.get("location")).toBe(
      "https://fortify.test/portfolio",
    );
    expect(completed.headers.get("cache-control")).toBe("no-store");
    expect(completed.headers.get("set-cookie")).toMatch(
      /fortify_session=fsess_[^;]+;.*HttpOnly.*SameSite=Strict.*Priority=high/i,
    );
    const replay = await oidcCallback(callbackRequest());
    expect(replay.status).toBe(401);
    expect(await replay.json()).toEqual({
      error: "Authentication failed.",
    });
  });

  test("minimizes, rotates, and revokes only interactive sessions", async () => {
    const tenant = await createTenantFixture(
      routeState.database!,
      "session-route",
    );
    const owner = await createActiveMembership(routeState.database!, {
      organizationId: tenant.organizationId,
      subject: tenant.context.actorSubject,
      role: "organization_owner",
    });
    const identity = new IdentityService(routeState.database!);
    const original = await identity.issueSession({
      profile: owner.profile,
      activeOrganizationId: tenant.organizationId,
      ttlSeconds: 3_600,
      userAgent: "original-session-agent",
      ipAddress: "198.51.100.24",
    });
    const sessionRequest = (token: string, method = "GET") =>
      new NextRequest("https://fortify.test/api/auth/session", {
        method,
        headers: {
          cookie: `fortify_session=${token}`,
          "user-agent": "rotated-session-agent",
        },
      });

    const read = await readSession(sessionRequest(original.token));
    expect(read.status).toBe(200);
    expect(read.headers.get("cache-control")).toBe("no-store");
    expect(await read.json()).toEqual({
      role: "organization_owner",
      expiresAt: original.expiresAt,
    });

    const rotated = await rotateSession(sessionRequest(original.token, "POST"));
    expect(rotated.status).toBe(200);
    expect(rotated.headers.get("cache-control")).toBe("no-store");
    expect(await rotated.clone().json()).toEqual({
      ok: true,
      expiresAt: original.expiresAt,
    });
    const setCookie = rotated.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(
      /fortify_session=fsess_[^;]+;.*HttpOnly.*SameSite=Strict.*Priority=high/i,
    );
    expect(setCookie).not.toContain(original.token);
    const rotatedToken = /fortify_session=([^;]+)/i.exec(setCookie)?.[1];
    expect(rotatedToken).toMatch(/^fsess_/);
    if (!rotatedToken) throw new Error("Rotated session cookie is required.");
    await expect(
      identity.resolveSession(original.token),
    ).rejects.toBeInstanceOf(RevokedCredentialError);
    await expect(identity.resolveSession(rotatedToken)).resolves.toMatchObject({
      authorization: {
        organizationId: tenant.organizationId,
        role: "organization_owner",
      },
      expiresAt: original.expiresAt,
    });

    const apiCredential = await identity.createServiceAccount(tenant.context, {
      name: "Session endpoint attack",
      scopes: ["community:read"],
    });
    for (const handler of [readSession, rotateSession, logout]) {
      const denied = await handler(
        new NextRequest("https://fortify.test/api/auth/session", {
          method: handler === readSession ? "GET" : "POST",
          headers: { authorization: `Bearer ${apiCredential.token}` },
        }),
      );
      expect(denied.status).toBe(401);
      expect(denied.headers.get("cache-control")).toBe("no-store");
      expect(await denied.json()).toEqual({ error: "Authentication failed." });
    }

    const loggedOut = await logout(
      new NextRequest("https://fortify.test/api/auth/logout", {
        method: "POST",
        headers: { cookie: `fortify_session=${rotatedToken}` },
      }),
    );
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.headers.get("cache-control")).toBe("no-store");
    expect(loggedOut.headers.get("set-cookie")).toMatch(
      /fortify_session=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT.*HttpOnly.*SameSite=Strict.*Priority=high/i,
    );
    await expect(identity.resolveSession(rotatedToken)).rejects.toBeInstanceOf(
      RevokedCredentialError,
    );

    const stale = await readSession(sessionRequest(rotatedToken));
    expect(stale.status).toBe(401);
    expect(stale.headers.get("cache-control")).toBe("no-store");
    expect(stale.headers.get("set-cookie")).toMatch(
      /fortify_session=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT.*HttpOnly.*SameSite=Strict.*Priority=high/i,
    );
    expect(await stale.json()).toEqual({ error: "Authentication failed." });
  });

  test("rejects cross-site browser-session mutations while allowing exact same-origin and bearer requests", async () => {
    const mutate = (headers: Record<string, string>) =>
      proxy(
        new NextRequest("https://fortify.test/api/production/communities", {
          method: "POST",
          headers,
        }),
      );

    for (const cookieName of ["fortify_session", "__Host-fortify_session"]) {
      const attackHeaders: Array<Record<string, string>> = [
        { cookie: `${cookieName}=fsess_fixture` },
        {
          cookie: `${cookieName}=fsess_fixture`,
          origin: "https://attacker.example.test",
          "sec-fetch-site": "cross-site",
        },
        {
          cookie: `${cookieName}=fsess_fixture`,
          origin: "https://fortify.test",
          "sec-fetch-site": "same-site",
        },
      ];
      for (const headers of attackHeaders) {
        const denied = mutate(headers);
        expect(denied.status).toBe(403);
        expect(denied.headers.get("cache-control")).toBe("no-store");
        expect(denied.headers.get("x-content-type-options")).toBe("nosniff");
        expect(await denied.json()).toEqual({
          error: "Cross-site request rejected.",
        });
      }
    }

    const allowed = mutate({
      cookie: "fortify_session=fsess_fixture",
      origin: "https://fortify.test",
      "sec-fetch-site": "same-origin",
    });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("x-middleware-next")).toBe("1");

    const bearer = mutate({ authorization: "Bearer fapi_fixture" });
    expect(bearer.status).toBe(200);
    expect(bearer.headers.get("x-middleware-next")).toBe("1");

    const safeRead = proxy(
      new NextRequest("https://fortify.test/api/auth/session", {
        headers: { cookie: "fortify_session=fsess_fixture" },
      }),
    );
    expect(safeRead.status).toBe(200);
  });

  test("uses a secure host-only cookie in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const issued = NextResponse.json({ ok: true });
    setSessionCookie(
      issued,
      "fsess_production-cookie",
      "2026-08-02T12:00:00.000Z",
    );
    expect(issued.headers.get("set-cookie")).toMatch(
      /__Host-fortify_session=fsess_production-cookie;.*Secure;.*HttpOnly;.*SameSite=Strict;.*Priority=high/i,
    );
    expect(issued.headers.get("set-cookie")).not.toMatch(/Domain=/i);

    const cleared = NextResponse.json({ ok: true });
    clearSessionCookie(cleared);
    expect(cleared.headers.get("set-cookie")).toMatch(
      /__Host-fortify_session=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT;.*Secure;.*HttpOnly;.*SameSite=Strict;.*Priority=high/i,
    );
    expect(cleared.headers.get("set-cookie")).not.toMatch(/Domain=/i);
  });

  test("binds invitation OIDC start to the invitation tenant and omits raw credential fields", async () => {
    const tenant = await createTenantFixture(
      routeState.database!,
      "invitation-route",
    );
    const invitation = await (await import("@/lib/production/identity-http"))
      .getProductionIdentityService(routeState.database!)
      .inviteMembership(tenant.context, {
        email: "invitation-route@example.test",
        role: "underwriter_reviewer",
      });
    routeState.begin.mockImplementation(
      async (input: {
        redirectUri: string;
        returnTo: string;
        activeOrganizationId?: string;
      }) => ({
        authorizationUrl: new URL("https://identity.example.test/authorize"),
        attempt: {
          state: "invitation-route-state",
          nonce: "invitation-route-nonce",
          pkceVerifier: "invitation-route-pkce",
          redirectUri: input.redirectUri,
          returnTo: input.returnTo,
          activeOrganizationId: input.activeOrganizationId,
        },
      }),
    );

    const response = await oidcStart(
      new NextRequest(
        `https://fortify.test/api/auth/oidc/start?invitation=${encodeURIComponent(invitation.token)}`,
      ),
    );
    expect(response.status).toBe(307);
    expect(routeState.begin).toHaveBeenCalledWith(
      expect.objectContaining({
        activeOrganizationId: tenant.organizationId,
      }),
    );
    const attempts = await routeState
      .database!.select()
      .from(schema.authenticationAttempts);
    expect(attempts).toEqual([
      expect.objectContaining({
        activeOrganizationId: tenant.organizationId,
        invitationId: invitation.invitationId,
      }),
    ]);
    expect(attempts[0].stateHash).not.toContain("invitation-route-state");
    const tenantRows = await withTenantTransaction(
      tenant.context,
      (transaction) => transaction.select().from(schema.invitations),
      routeState.database!,
    );
    expect(tenantRows[0]).not.toHaveProperty("token");
    expect(tenantRows[0].tokenHash).not.toBe(invitation.token);
  });
});

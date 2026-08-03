import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import {
  encryptBackup,
  restoreBackup,
} from "@/lib/production/encrypted-backup";
import {
  inspectProductionEnvironment,
  validateProductionEnvironment,
} from "@/lib/production/environment";
import { redactLogValue } from "@/lib/production/observability";
import { withAuthenticatedTenantRequest } from "@/lib/production/http-auth";
import { IdentityService } from "@/lib/production/identity-service";
import {
  consumeRequestRateLimit,
  RequestRateLimitError,
} from "@/lib/production/rate-limit";
import { withTenantTransaction } from "@/lib/production/tenant-transaction";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

describe("M12 operational hardening", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  beforeEach(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });
  afterEach(async () => {
    await client.close();
    vi.unstubAllEnvs();
  });

  test("enables RLS policies across every tenant-owned table", async () => {
    const tenantTables = await client.query<{ table_name: string }>(
      "select distinct table_name from information_schema.columns where table_schema = 'public' and column_name = 'organization_id'",
    );
    const policies = await client.query<{ tablename: string }>(
      "select tablename from pg_policies where schemaname = 'public' and policyname = 'fortify_tenant_isolation'",
    );
    expect(new Set(policies.rows.map((row) => row.tablename))).toEqual(
      new Set(tenantTables.rows.map((row) => row.table_name)),
    );
    const bootstrapFunctions = await client.query<{
      security_definer: boolean;
      configuration: string;
    }>(`
      select
        procedure.prosecdef as security_definer,
        array_to_string(procedure.proconfig, ',') as configuration
      from pg_proc as procedure
      inner join pg_namespace as namespace
        on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname = 'fortify_resolve_request_tenant'
    `);
    expect(bootstrapFunctions.rows).toEqual([
      {
        security_definer: true,
        configuration: "search_path=pg_catalog, public",
      },
    ]);
    const bootstrapPrivileges = await client.query<{ grantee: string }>(`
      select grantee
      from information_schema.routine_privileges
      where specific_schema = 'public'
        and routine_name = 'fortify_resolve_request_tenant'
        and privilege_type = 'EXECUTE'
    `);
    expect(bootstrapPrivileges.rows.map((row) => row.grantee)).toContain(
      "fortify_app",
    );
    expect(bootstrapPrivileges.rows.map((row) => row.grantee)).not.toContain(
      "PUBLIC",
    );
  });

  test("enforces non-owner RLS with request-local context and no pooled leakage", async () => {
    const productionDatabase = database as unknown as ProductionDatabaseLike;
    const alpha = await createTenantFixture(productionDatabase, "rls-alpha");
    const beta = await createTenantFixture(productionDatabase, "rls-beta");

    const alphaRows = await withTenantTransaction(
      alpha.context,
      async (transaction) => transaction.select().from(schema.communities),
      productionDatabase,
    );
    expect(alphaRows.map((row) => row.organizationId)).toEqual([
      alpha.organizationId,
    ]);

    await expect(
      withTenantTransaction(
        alpha.context,
        async (transaction) =>
          transaction.insert(schema.communities).values({
            id: "community-rls-cross-tenant",
            organizationId: beta.organizationId,
            clientId: beta.clientId,
            name: "Must be rejected by RLS",
            propertyClass: "condominium",
            summary: "",
            createdAt: "2026-08-03T12:00:00.000Z",
            updatedAt: "2026-08-03T12:00:00.000Z",
            createdBy: alpha.context.actorSubject,
            updatedBy: alpha.context.actorSubject,
            revision: 1,
            lifecycleStatus: "active",
          }),
        productionDatabase,
      ),
    ).rejects.toThrow();

    const betaRows = await withTenantTransaction(
      beta.context,
      async (transaction) => transaction.select().from(schema.communities),
      productionDatabase,
    );
    expect(betaRows.map((row) => row.organizationId)).toEqual([
      beta.organizationId,
    ]);

    await client.exec("begin; set local role fortify_app;");
    const leaked = await client.query<{ organization_id: string }>(
      "select organization_id from communities",
    );
    const tenantSetting = await client.query<{ tenant: string | null }>(
      "select nullif(current_setting('fortify.organization_id', true), '') as tenant",
    );
    await client.exec("rollback");
    expect(leaked.rows).toEqual([]);
    expect(tenantSetting.rows[0]?.tenant).toBeNull();
  });

  test("resolves an opaque session and runs brokerage work in one tenant transaction", async () => {
    vi.stubEnv(
      "FORTIFY_REQUEST_HASH_KEY",
      "fixture-request-hash-key-32-characters",
    );
    const productionDatabase = database as unknown as ProductionDatabaseLike;
    const alpha = await createTenantFixture(
      productionDatabase,
      "request-alpha",
    );
    const beta = await createTenantFixture(productionDatabase, "request-beta");
    const owner = await createActiveMembership(productionDatabase, {
      organizationId: alpha.organizationId,
      subject: alpha.context.actorSubject,
    });
    const session = await new IdentityService(productionDatabase).issueSession({
      profile: owner.profile,
      activeOrganizationId: alpha.organizationId,
      ttlSeconds: 3_600,
    });
    const request = new NextRequest(
      "https://fortify.test/api/production/brokerage/workspace",
      {
        headers: { cookie: `fortify_session=${session.token}` },
      },
    );

    const observed = await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const communities = await transaction.select().from(schema.communities);
        const contextResult = await transaction.execute(sql`
          select
            current_user as role,
            nullif(current_setting('fortify.organization_id', true), '') as tenant,
            nullif(current_setting('fortify.actor_subject', true), '') as actor
        `);
        const contextRows = Array.isArray(contextResult)
          ? contextResult
          : (contextResult as unknown as { rows: unknown[] }).rows;
        return {
          principal: principal.authorization,
          communities,
          context: contextRows[0] as {
            role: string;
            tenant: string;
            actor: string;
          },
        };
      },
      productionDatabase,
    );

    expect(observed.principal.organizationId).toBe(alpha.organizationId);
    expect(observed.communities.map((row) => row.organizationId)).toEqual([
      alpha.organizationId,
    ]);
    expect(observed.communities).not.toContainEqual(
      expect.objectContaining({ organizationId: beta.organizationId }),
    );
    expect(observed.context).toEqual({
      role: "fortify_app",
      tenant: alpha.organizationId,
      actor: observed.principal.actorSubject,
    });

    const apiCredential = await new IdentityService(
      productionDatabase,
    ).createServiceAccount(alpha.context, {
      name: "Brokerage workspace reader",
      scopes: ["community:read"],
    });
    const apiObserved = await withAuthenticatedTenantRequest(
      new NextRequest(
        "https://fortify.test/api/production/brokerage/workspace",
        {
          headers: { authorization: `Bearer ${apiCredential.token}` },
        },
      ),
      async (principal, transaction) => ({
        principal: principal.authorization,
        communities: await transaction.select().from(schema.communities),
      }),
      productionDatabase,
    );
    expect(apiObserved.principal).toMatchObject({
      organizationId: alpha.organizationId,
      principalType: "service_account",
      grantedScopes: ["community:read"],
    });
    expect(apiObserved.communities.map((row) => row.organizationId)).toEqual([
      alpha.organizationId,
    ]);

    let invalidOperationRan = false;
    await expect(
      withAuthenticatedTenantRequest(
        new NextRequest(
          "https://fortify.test/api/production/brokerage/workspace",
          { headers: { cookie: "fortify_session=fsess_invalid" } },
        ),
        async () => {
          invalidOperationRan = true;
        },
        productionDatabase,
      ),
    ).rejects.toThrow("Authentication failed");
    expect(invalidOperationRan).toBe(false);
  });

  test("rate limits with HMAC buckets and no raw identifier persistence", async () => {
    vi.stubEnv(
      "FORTIFY_REQUEST_HASH_KEY",
      "fixture-request-hash-key-32-characters",
    );
    const database = drizzle(client, { schema });
    const request = new Request("https://fortify.test/api", {
      headers: {
        "x-forwarded-for": "203.0.113.8",
        authorization: "Bearer secret-token",
      },
    });
    await consumeRequestRateLimit(database, request, {
      scope: "test",
      limit: 2,
    });
    await consumeRequestRateLimit(database, request, {
      scope: "test",
      limit: 2,
    });
    await expect(
      consumeRequestRateLimit(database, request, { scope: "test", limit: 2 }),
    ).rejects.toBeInstanceOf(RequestRateLimitError);
    const rows = await client.query<{ bucket_hash: string }>(
      "select bucket_hash from request_rate_limit_windows",
    );
    expect(rows.rows[0]?.bucket_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows.rows)).not.toContain("203.0.113.8");
    expect(JSON.stringify(rows.rows)).not.toContain("secret-token");
  });

  test("fails production configuration closed without secrets or HTTPS", () => {
    const environment = {
      NODE_ENV: "production",
      FORTIFY_APP_ORIGIN: "http://localhost",
    } as NodeJS.ProcessEnv;
    expect(() => validateProductionEnvironment(environment)).toThrow(
      /failed closed/,
    );
    expect(
      inspectProductionEnvironment(environment).some(
        (check) => check.key === "FORTIFY_APP_ORIGIN_HTTPS" && !check.ok,
      ),
    ).toBe(true);
  });

  test("redacts nested credentials and restores authenticated encrypted backup bytes", () => {
    expect(
      redactLogValue({
        email: "person@example.test",
        nested: { authorization: "Bearer value", status: "ok" },
      }),
    ).toEqual({
      email: "[REDACTED]",
      nested: { authorization: "[REDACTED]", status: "ok" },
    });
    const key = Buffer.alloc(32, 7);
    const source = Buffer.from("fixture PostgreSQL logical backup bytes\n");
    const envelope = encryptBackup(source, {
      key,
      keyReference: "secret-manager://fortify/backup-key",
      createdAt: "2026-08-02T12:00:00.000Z",
    });
    expect(envelope.ciphertext).not.toContain(source.toString("base64"));
    expect(restoreBackup(envelope, key)).toEqual(source);
    expect(() =>
      restoreBackup(
        { ...envelope, authTag: Buffer.alloc(16).toString("base64") },
        key,
      ),
    ).toThrow();
  });
});

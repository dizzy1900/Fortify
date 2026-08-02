import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
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
import {
  consumeRequestRateLimit,
  RequestRateLimitError,
} from "@/lib/production/rate-limit";

describe("M12 operational hardening", () => {
  let client: PGlite;
  beforeEach(async () => {
    client = new PGlite();
    await migrate(drizzle(client, { schema }), {
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

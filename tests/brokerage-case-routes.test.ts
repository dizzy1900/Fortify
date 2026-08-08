import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import { IdentityService } from "@/lib/production/identity-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

const routeState = vi.hoisted(() => ({
  database: undefined as ProductionDatabaseLike | undefined,
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return {
    ...original,
    getProductionDatabase: () => routeState.database,
  };
});

import { GET as getBrokerageWorkspace } from "@/app/api/production/brokerage/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;

function requestWithCredential(credential: string) {
  return new NextRequest(
    "https://fortify.test/api/production/brokerage/workspace",
    {
      headers: credential.startsWith("fsess_")
        ? { cookie: `fortify_session=${credential}` }
        : { authorization: `Bearer ${credential}` },
    },
  );
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== "object") return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

async function seedCase(fixture: TenantFixture, key: string) {
  const caseId = `case-brokerage-route-${key}`;
  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-brokerage-route-create-${key}`,
    {
      id: caseId,
      policyId: fixture.policyId,
      title: `Fictional brokerage route ${key}`,
      status: "evidence_collection",
      caseType: "renewal",
      peril: "wildfire",
      jurisdiction: "US-CA",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
    },
  );
  return caseId;
}

describe("brokerage workspace request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let productionDatabase: ProductionDatabaseLike;

  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FORTIFY_RUNTIME_MODE", "production");
    vi.stubEnv("DATABASE_URL", "postgres://migration.example.test/fortify");
    vi.stubEnv(
      "FORTIFY_APP_DATABASE_URL",
      "postgres://application.example.test/fortify",
    );
    vi.stubEnv(
      "FORTIFY_REQUEST_HASH_KEY",
      "fixture-request-hash-key-32-characters",
    );
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
    productionDatabase = database as unknown as ProductionDatabaseLike;
    routeState.database = productionDatabase;
  }, 90_000);

  afterAll(async () => {
    routeState.database = undefined;
    await client.close();
    vi.unstubAllEnvs();
  });

  test("returns only the authenticated tenant through the minimized shared response", async () => {
    const alpha = await createTenantFixture(
      productionDatabase,
      "brokerage-route-alpha",
    );
    const beta = await createTenantFixture(
      productionDatabase,
      "brokerage-route-beta",
    );
    const alphaCaseId = await seedCase(alpha, "alpha");
    const betaCaseId = await seedCase(beta, "beta");
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: alpha.organizationId,
      subject: "brokerage-route-owner",
      role: "organization_owner",
    });
    const session = await new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: alpha.organizationId,
      ttlSeconds: 3_600,
    });

    const response = await getBrokerageWorkspace(
      requestWithCredential(session.token),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const workspace = (await response.json()) as {
      organization: { id: string };
      cases: Array<{ id: string }>;
    };
    expect(workspace.organization.id).toBe(alpha.organizationId);
    expect(workspace.cases.map((caseRecord) => caseRecord.id)).toEqual([
      alphaCaseId,
    ]);
    expect(workspace.cases).not.toContainEqual(
      expect.objectContaining({ id: betaCaseId }),
    );
    const keys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdBy",
      "updatedBy",
      "updatedAt",
      "revision",
      "lifecycleStatus",
      "storageObjectId",
      "objectKey",
      "currentVersionId",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);
  });

  test("rejects invalid sessions and credentials with insufficient case scope", async () => {
    const fixture = await createTenantFixture(
      productionDatabase,
      "brokerage-route-scope",
    );
    await seedCase(fixture, "scope");
    const serviceCredential = await new IdentityService(
      productionDatabase,
    ).createServiceAccount(fixture.context, {
      name: "Renewal case only reader",
      scopes: ["renewal_case:read"],
    });

    const denied = await getBrokerageWorkspace(
      requestWithCredential(serviceCredential.token),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: "The active principal is not authorized for this resource.",
    });

    const unauthenticated = await getBrokerageWorkspace(
      requestWithCredential("fsess_invalid"),
    );
    expect(unauthenticated.status).toBe(401);
    expect(await unauthenticated.json()).toEqual({
      error: "Authentication failed.",
    });
  });
});

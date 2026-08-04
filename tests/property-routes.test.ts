import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { IdentityService } from "@/lib/production/identity-service";
import type { PropertyGraphRegistration } from "@/lib/production/property-graph-service";
import { PropertyGraphService } from "@/lib/production/property-graph-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { withTenantTransaction } from "@/lib/production/tenant-transaction";
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

import { PATCH as updateCommunity } from "@/app/api/production/communities/[communityId]/route";
import { GET as listCommunities } from "@/app/api/production/communities/route";
import { POST as registerPortfolio } from "@/app/api/production/property-graph/portfolios/route";
import { GET as getPropertyWorkspace } from "@/app/api/production/property-graph/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;

function governed() {
  return {
    sourceSystem: "property-route-test",
    confidentialityState: "tenant_confidential" as const,
    dataRightClass: "property_specific_data" as const,
    rightsVerified: true,
  };
}

function registration(
  fixture: TenantFixture,
  key: string,
  propertyId = fixture.propertyId,
): PropertyGraphRegistration {
  return {
    portfolio: {
      id: `portfolio-${key}`,
      clientId: fixture.clientId,
      name: `Portfolio ${key}`,
      jurisdiction: "US-CA",
      primaryPeril: "wildfire",
      description: "Tenant request-bound property route fixture.",
      ...governed(),
    },
    propertyLinks: [
      {
        id: `portfolio-property-${key}`,
        propertyId,
        relationshipStatus: "active",
        ...governed(),
      },
    ],
    parcels: [],
    unitSummaries: [],
    scopes: [],
    aliases: [],
    relationships: [],
    versions: [],
  };
}

function portfolioOnlyRegistration(
  fixture: TenantFixture,
  key: string,
): PropertyGraphRegistration {
  return {
    ...registration(fixture, key),
    propertyLinks: [],
  };
}

function requestWithSession(url: string, token: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", `fortify_session=${token}`);
  return new NextRequest(url, {
    method: init?.method,
    headers,
    body: init?.body,
  });
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

describe("property request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let productionDatabase: ProductionDatabaseLike;

  beforeEach(async () => {
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
  });

  afterEach(async () => {
    routeState.database = undefined;
    await client.close();
    vi.unstubAllEnvs();
  });

  async function issueSession(
    fixture: TenantFixture,
    key: string,
    role: OrganizationRole,
  ) {
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: fixture.organizationId,
      subject: `property-route-${key}`,
      role,
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  test("lists and updates only the authenticated tenant's minimized community records", async () => {
    const alpha = await createTenantFixture(
      productionDatabase,
      "community-route-alpha",
    );
    const beta = await createTenantFixture(
      productionDatabase,
      "community-route-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "community-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "community-auditor",
      "read_only_auditor",
    );

    const listed = await listCommunities(
      requestWithSession(
        "https://fortify.test/api/production/communities",
        ownerSession.token,
      ),
    );
    expect(listed.status).toBe(200);
    expect(listed.headers.get("cache-control")).toBe("no-store");
    expect(await listed.json()).toEqual([
      {
        id: alpha.communityId,
        name: "Community community-route-alpha",
        propertyClass: "condominium",
        summary: "Summary community-route-alpha",
        revision: 1,
      },
    ]);

    const crossTenant = await updateCommunity(
      requestWithSession(
        `https://fortify.test/api/production/communities/${beta.communityId}`,
        ownerSession.token,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            summary: "Cross-tenant mutation must fail.",
            expectedRevision: 1,
          }),
        },
      ),
      { params: Promise.resolve({ communityId: beta.communityId }) },
    );
    expect(crossTenant.status).toBe(404);

    const denied = await updateCommunity(
      requestWithSession(
        `https://fortify.test/api/production/communities/${alpha.communityId}`,
        auditorSession.token,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            summary: "Read-only mutation must fail.",
            expectedRevision: 1,
          }),
        },
      ),
      { params: Promise.resolve({ communityId: alpha.communityId }) },
    );
    expect(denied.status).toBe(403);

    const updated = await updateCommunity(
      requestWithSession(
        `https://fortify.test/api/production/communities/${alpha.communityId}`,
        ownerSession.token,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            summary: "Broker-confirmed request-bound summary.",
            expectedRevision: 1,
          }),
        },
      ),
      { params: Promise.resolve({ communityId: alpha.communityId }) },
    );
    expect(updated.status).toBe(200);
    expect(updated.headers.get("cache-control")).toBe("no-store");
    expect(await updated.json()).toEqual({
      id: alpha.communityId,
      summary: "Broker-confirmed request-bound summary.",
      revision: 2,
    });

    const betaRows = await withTenantTransaction(
      beta.context,
      (transaction) =>
        transaction
          .select({ summary: schema.communities.summary })
          .from(schema.communities),
      productionDatabase,
    );
    expect(betaRows).toEqual([{ summary: "Summary community-route-beta" }]);
  });

  test("reads and registers a minimized property graph without cross-tenant or read-only mutation", async () => {
    const alpha = await createTenantFixture(
      productionDatabase,
      "property-route-alpha",
    );
    const beta = await createTenantFixture(
      productionDatabase,
      "property-route-beta",
    );
    const service = new PropertyGraphService(productionDatabase);
    await service.register(
      alpha.context,
      "seed-property-route-alpha",
      registration(alpha, "seed-property-route-alpha"),
    );
    await service.register(
      beta.context,
      "seed-property-route-beta",
      registration(beta, "seed-property-route-beta"),
    );
    const ownerSession = await issueSession(
      alpha,
      "property-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "property-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getPropertyWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/property-graph/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      portfolios: Array<{ id: string }>;
      properties: Array<{ id: string }>;
    };
    expect(workspace.portfolios.map((item) => item.id)).toEqual([
      "portfolio-seed-property-route-alpha",
    ]);
    expect(workspace.properties.map((item) => item.id)).toEqual([
      alpha.propertyId,
    ]);
    const responseKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "clientId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "sourceRecordId",
      "effectiveTo",
      "snapshot",
    ])
      expect(responseKeys.has(forbidden), forbidden).toBe(false);

    const crossTenantBody = registration(
      alpha,
      "cross-tenant-property",
      beta.propertyId,
    );
    const crossTenant = await registerPortfolio(
      requestWithSession(
        "https://fortify.test/api/production/property-graph/portfolios",
        ownerSession.token,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": "cross-tenant-property",
          },
          body: JSON.stringify(crossTenantBody),
        },
      ),
    );
    expect(crossTenant.status).toBe(404);

    const denied = await registerPortfolio(
      requestWithSession(
        "https://fortify.test/api/production/property-graph/portfolios",
        auditorSession.token,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": "read-only-property",
          },
          body: JSON.stringify(
            portfolioOnlyRegistration(alpha, "read-only-property"),
          ),
        },
      ),
    );
    expect(denied.status).toBe(403);

    const registered = await registerPortfolio(
      requestWithSession(
        "https://fortify.test/api/production/property-graph/portfolios",
        ownerSession.token,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key": "request-bound-property",
          },
          body: JSON.stringify(
            portfolioOnlyRegistration(alpha, "request-bound-property"),
          ),
        },
      ),
    );
    expect(registered.status).toBe(201);
    expect(registered.headers.get("cache-control")).toBe("no-store");
    expect(await registered.json()).toEqual({
      portfolioId: "portfolio-request-bound-property",
      counts: {
        properties: 0,
        parcels: 0,
        unitSummaries: 0,
        scopes: 0,
        aliases: 0,
        relationships: 0,
        versions: 0,
      },
      replayed: false,
    });

    const crossTenantPortfolio = await productionDatabase
      .select({ id: schema.propertyPortfolios.id })
      .from(schema.propertyPortfolios)
      .where(
        eq(schema.propertyPortfolios.id, "portfolio-cross-tenant-property"),
      );
    expect(crossTenantPortfolio).toEqual([]);
  });
});

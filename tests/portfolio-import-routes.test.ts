import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import {
  genericAmsCsvAdapter,
  type ImportColumnMapping,
} from "@/lib/production/import-adapters";
import { IdentityService } from "@/lib/production/identity-service";
import {
  DeterministicObjectStorageAdapter,
  type ObjectStorageAdapter,
} from "@/lib/production/object-storage";
import { PortfolioImportService } from "@/lib/production/portfolio-import-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import {
  DeterministicMalwareScanner,
  ProductionStorageService,
} from "@/lib/production/storage-service";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

const routeState = vi.hoisted(() => ({
  database: undefined as ProductionDatabaseLike | undefined,
  storage: undefined as ObjectStorageAdapter | undefined,
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return {
    ...original,
    getProductionDatabase: () => routeState.database,
  };
});

vi.mock("@/lib/production/object-storage-runtime", async (importOriginal) => {
  const original =
    await importOriginal<
      typeof import("@/lib/production/object-storage-runtime")
    >();
  return {
    ...original,
    getProductionObjectStorage: () => routeState.storage,
  };
});

import { POST as commitPortfolioImport } from "@/app/api/production/portfolio-imports/[portfolioImportId]/commit/route";
import { GET as getPortfolioImport } from "@/app/api/production/portfolio-imports/[portfolioImportId]/route";
import { POST as rollbackPortfolioImport } from "@/app/api/production/portfolio-imports/[portfolioImportId]/rollback/route";
import { POST as savePortfolioMapping } from "@/app/api/production/portfolio-imports/mappings/route";
import { POST as previewPortfolioImport } from "@/app/api/production/portfolio-imports/preview/route";
import { POST as suggestPortfolioMapping } from "@/app/api/production/portfolio-imports/suggest/route";
import { GET as getPortfolioImportWorkspace } from "@/app/api/production/portfolio-imports/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type PortfolioTenant = TenantFixture & {
  storageObjectId: string;
  mappingVersionId: string;
  mapping: ImportColumnMapping;
};

const currentTime = new Date("2026-08-04T10:00:00.000Z");
const fixturePath = path.resolve(
  process.cwd(),
  "tests",
  "fixtures",
  "import",
  "generic-sov.csv",
);

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

function sha256(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

async function storeCleanImport(
  database: ProductionDatabaseLike,
  fixture: TenantFixture,
  storage: DeterministicObjectStorageAdapter,
  body: Uint8Array,
) {
  const service = new ProductionStorageService(
    database,
    storage,
    { mode: "AES256" },
    () => currentTime,
  );
  const upload = await service.requestUpload(fixture.context, {
    filename: `${fixture.organizationId}-portfolio.csv`,
    mimeType: "text/csv",
    sizeBytes: body.byteLength,
    sha256: sha256(body),
  });
  await storage.put({
    key: upload.objectKey,
    body,
    mimeType: "text/csv",
    sha256: sha256(body),
  });
  await service.finalizeUpload(
    fixture.context,
    upload.storageObjectId,
    upload.grantId,
  );
  await service.scanAndPromote(
    fixture.context,
    upload.storageObjectId,
    new DeterministicMalwareScanner(),
  );
  return upload.storageObjectId;
}

async function seedPortfolioTenant(
  database: ProductionDatabaseLike,
  storage: DeterministicObjectStorageAdapter,
  key: string,
): Promise<PortfolioTenant> {
  const fixture = await createTenantFixture(database, key);
  const service = new PortfolioImportService(
    database,
    storage,
    () => currentTime,
  );
  const body = new Uint8Array(await readFile(fixturePath));
  const suggestion = await service.suggestMapping({
    body,
    format: "csv",
    sourceSystem: genericAmsCsvAdapter.sourceSystem,
  });
  const saved = await service.saveMapping(fixture.context, {
    name: `Generic SOV ${key}`,
    sourceSystem: genericAmsCsvAdapter.sourceSystem,
    fileFormat: "csv",
    columnMapping: suggestion.mapping,
  });
  return {
    ...fixture,
    storageObjectId: await storeCleanImport(database, fixture, storage, body),
    mappingVersionId: saved.version.id,
    mapping: suggestion.mapping,
  };
}

describe("portfolio import request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let productionDatabase: ProductionDatabaseLike;
  let storage: DeterministicObjectStorageAdapter;

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
    storage = new DeterministicObjectStorageAdapter();
    routeState.database = productionDatabase;
    routeState.storage = storage;
  }, 90_000);

  afterAll(async () => {
    routeState.database = undefined;
    routeState.storage = undefined;
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
      subject: `portfolio-route-${key}`,
      role,
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  test("returns tenant-only onboarding options and minimizes suggestion and mapping receipts", async () => {
    const alpha = await seedPortfolioTenant(
      productionDatabase,
      storage,
      "portfolio-route-alpha",
    );
    const beta = await seedPortfolioTenant(
      productionDatabase,
      storage,
      "portfolio-route-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "workspace-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "workspace-auditor",
      "read_only_auditor",
    );

    const workspaceResponse = await getPortfolioImportWorkspace(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/workspace",
        ownerSession.token,
      ),
    );
    expect(workspaceResponse.status).toBe(200);
    expect(workspaceResponse.headers.get("cache-control")).toBe("no-store");
    const workspace = (await workspaceResponse.json()) as {
      books: Array<{ id: string }>;
      storageObjects: Array<{ id: string }>;
      mappings: Array<{ versionId: string }>;
      recentImports: Array<{ id: string }>;
    };
    expect(workspace.books.map((item) => item.id)).toEqual([alpha.bookId]);
    expect(workspace.storageObjects.map((item) => item.id)).toEqual([
      alpha.storageObjectId,
    ]);
    expect(workspace.mappings.map((item) => item.versionId)).toEqual([
      alpha.mappingVersionId,
    ]);
    expect(workspace.recentImports).toEqual([]);
    const workspaceKeys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "objectKey",
      "provider",
      "bucket",
      "encryptionMode",
      "encryptionKeyId",
      "createdBy",
      "updatedBy",
      "updatedAt",
      "revision",
      "lifecycleStatus",
      "currentVersionId",
      "contentHash",
      "schemaVersion",
    ])
      expect(workspaceKeys.has(forbidden), forbidden).toBe(false);

    const crossTenantSuggestion = await suggestPortfolioMapping(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/suggest",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storageObjectId: beta.storageObjectId,
            sourceSystem: genericAmsCsvAdapter.sourceSystem,
          }),
        },
      ),
    );
    expect(crossTenantSuggestion.status).toBe(404);

    const suggestion = await suggestPortfolioMapping(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/suggest",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            storageObjectId: alpha.storageObjectId,
            sourceSystem: genericAmsCsvAdapter.sourceSystem,
          }),
        },
      ),
    );
    expect(suggestion.status).toBe(200);
    expect(suggestion.headers.get("cache-control")).toBe("no-store");
    const suggestionBody = (await suggestion.json()) as Record<string, unknown>;
    expect(Object.keys(suggestionBody).toSorted()).toEqual([
      "mapping",
      "rowCount",
    ]);
    expect(suggestionBody).toMatchObject({ rowCount: 3 });

    const mappingBody = {
      name: "Request-bound generic SOV",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: alpha.mapping,
    };
    const deniedMapping = await savePortfolioMapping(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/mappings",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(mappingBody),
        },
      ),
    );
    expect(deniedMapping.status).toBe(403);

    const savedMapping = await savePortfolioMapping(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/mappings",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(mappingBody),
        },
      ),
    );
    expect(savedMapping.status).toBe(201);
    expect(savedMapping.headers.get("cache-control")).toBe("no-store");
    expect(await savedMapping.json()).toEqual({
      version: { id: expect.any(String) },
      replayed: false,
    });
    const betaMappings = await productionDatabase
      .select({ name: schema.importMappings.name })
      .from(schema.importMappings)
      .where(eq(schema.importMappings.organizationId, beta.organizationId));
    expect(betaMappings).toEqual([
      { name: "Generic SOV portfolio-route-beta" },
    ]);
  }, 30_000);

  test("rejects cross-tenant and read-only preview, load, commit, and rollback while minimizing import history", async () => {
    const alpha = await seedPortfolioTenant(
      productionDatabase,
      storage,
      "portfolio-action-alpha",
    );
    const beta = await seedPortfolioTenant(
      productionDatabase,
      storage,
      "portfolio-action-beta",
    );
    const ownerSession = await issueSession(
      alpha,
      "action-owner",
      "organization_owner",
    );
    const auditorSession = await issueSession(
      alpha,
      "action-auditor",
      "read_only_auditor",
    );
    const betaImport = await new PortfolioImportService(
      productionDatabase,
      storage,
      () => currentTime,
    ).preview(beta.context, {
      bookId: beta.bookId,
      storageObjectId: beta.storageObjectId,
      mappingVersionId: beta.mappingVersionId,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "beta-request-bound-preview",
    });

    const crossTenantPreview = await previewPortfolioImport(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/preview",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            bookId: beta.bookId,
            storageObjectId: beta.storageObjectId,
            mappingVersionId: beta.mappingVersionId,
            sourceSystem: genericAmsCsvAdapter.sourceSystem,
            idempotencyKey: "cross-tenant-preview",
          }),
        },
      ),
    );
    expect(crossTenantPreview.status).toBe(404);

    const previewBody = {
      bookId: alpha.bookId,
      storageObjectId: alpha.storageObjectId,
      mappingVersionId: alpha.mappingVersionId,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "request-bound-preview",
    };
    const deniedPreview = await previewPortfolioImport(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/preview",
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(previewBody),
        },
      ),
    );
    expect(deniedPreview.status).toBe(403);

    const preview = await previewPortfolioImport(
      requestWithSession(
        "https://fortify.test/api/production/portfolio-imports/preview",
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(previewBody),
        },
      ),
    );
    expect(preview.status).toBe(201);
    expect(preview.headers.get("cache-control")).toBe("no-store");
    const previewResult = (await preview.json()) as {
      portfolioImport: { id: string; status: string };
      rows: Array<Record<string, unknown>>;
      receipts: Array<Record<string, unknown>>;
      replayed: boolean;
    };
    expect(Object.keys(previewResult).toSorted()).toEqual([
      "portfolioImport",
      "receipts",
      "replayed",
      "rows",
    ]);
    expect(previewResult.portfolioImport).toMatchObject({
      status: "previewed",
    });
    expect(Object.keys(previewResult.rows[0]).toSorted()).toEqual([
      "errors",
      "normalizedData",
      "rowNumber",
      "status",
      "warnings",
    ]);
    expect(Object.keys(previewResult.receipts[0]).toSorted()).toEqual([
      "occurredAt",
      "receiptHash",
      "receiptType",
    ]);
    const resultKeys = collectKeys(previewResult);
    for (const forbidden of [
      "organizationId",
      "rawData",
      "matchCandidateIds",
      "appliedEntities",
      "bookId",
      "storageObjectId",
      "mappingVersionId",
      "sourceSystem",
      "fileFormat",
      "contentHash",
      "idempotencyKey",
      "requestHash",
      "createdEntities",
      "committedAt",
      "rolledBackAt",
      "summary",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
    ])
      expect(resultKeys.has(forbidden), forbidden).toBe(false);

    const alphaImportId = previewResult.portfolioImport.id;
    const crossTenantRead = await getPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${betaImport.portfolioImport.id}`,
        ownerSession.token,
      ),
      {
        params: Promise.resolve({
          portfolioImportId: betaImport.portfolioImport.id,
        }),
      },
    );
    expect(crossTenantRead.status).toBe(404);

    const ownRead = await getPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${alphaImportId}`,
        ownerSession.token,
      ),
      { params: Promise.resolve({ portfolioImportId: alphaImportId }) },
    );
    expect(ownRead.status).toBe(200);
    expect(ownRead.headers.get("cache-control")).toBe("no-store");
    const ownReadBody = (await ownRead.json()) as Record<string, unknown>;
    expect(Object.keys(ownReadBody).toSorted()).toEqual([
      "portfolioImport",
      "receipts",
      "rows",
    ]);

    const crossTenantCommit = await commitPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${betaImport.portfolioImport.id}/commit`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmAcceptedRows: true }),
        },
      ),
      {
        params: Promise.resolve({
          portfolioImportId: betaImport.portfolioImport.id,
        }),
      },
    );
    expect(crossTenantCommit.status).toBe(404);

    const deniedCommit = await commitPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${alphaImportId}/commit`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmAcceptedRows: true }),
        },
      ),
      { params: Promise.resolve({ portfolioImportId: alphaImportId }) },
    );
    expect(deniedCommit.status).toBe(403);

    const committed = await commitPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${alphaImportId}/commit`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmAcceptedRows: true }),
        },
      ),
      { params: Promise.resolve({ portfolioImportId: alphaImportId }) },
    );
    expect(committed.status).toBe(200);
    expect(committed.headers.get("cache-control")).toBe("no-store");
    expect(await committed.json()).toMatchObject({
      portfolioImport: { status: "committed", committedRows: 3 },
      replayed: false,
    });

    const crossTenantRollback = await rollbackPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${betaImport.portfolioImport.id}/rollback`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Cross-tenant rollback must fail." }),
        },
      ),
      {
        params: Promise.resolve({
          portfolioImportId: betaImport.portfolioImport.id,
        }),
      },
    );
    expect(crossTenantRollback.status).toBe(404);

    const deniedRollback = await rollbackPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${alphaImportId}/rollback`,
        auditorSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Read-only rollback must fail." }),
        },
      ),
      { params: Promise.resolve({ portfolioImportId: alphaImportId }) },
    );
    expect(deniedRollback.status).toBe(403);

    const rolledBack = await rollbackPortfolioImport(
      requestWithSession(
        `https://fortify.test/api/production/portfolio-imports/${alphaImportId}/rollback`,
        ownerSession.token,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            reason: "Owner confirmed the request-bound fixture rollback.",
          }),
        },
      ),
      { params: Promise.resolve({ portfolioImportId: alphaImportId }) },
    );
    expect(rolledBack.status).toBe(200);
    expect(rolledBack.headers.get("cache-control")).toBe("no-store");
    expect(await rolledBack.json()).toMatchObject({
      portfolioImport: { status: "rolled_back", committedRows: 3 },
      replayed: false,
    });

    const betaRows = await productionDatabase
      .select({ status: schema.portfolioImports.status })
      .from(schema.portfolioImports)
      .where(eq(schema.portfolioImports.id, betaImport.portfolioImport.id));
    expect(betaRows).toEqual([{ status: "previewed" }]);
  }, 45_000);
});

import { PGlite } from "@electric-sql/pglite";
import { and, count, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  ams360FixtureAdapter,
  appliedEpicFixtureAdapter,
  genericAmsCsvAdapter,
  type ImportColumnMapping,
} from "@/lib/production/import-adapters";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  PortfolioImportService,
  PortfolioImportStateError,
  PortfolioImportValidationError,
} from "@/lib/production/portfolio-import-service";
import {
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  DeterministicMalwareScanner,
  ProductionStorageService,
} from "@/lib/production/storage-service";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const currentTime = new Date("2026-08-01T12:00:00.000Z");

const productionDatabase = () =>
  database as unknown as ProductionDatabaseLike;
const fixturePath = (name: string) =>
  path.resolve(process.cwd(), "tests", "fixtures", "import", name);
const sha256 = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

async function storeCleanImport(
  fixture: Awaited<ReturnType<typeof createTenantFixture>>,
  adapter: DeterministicObjectStorageAdapter,
  input: { body: Uint8Array; filename: string; mimeType: string },
) {
  const storage = new ProductionStorageService(
    productionDatabase(),
    adapter,
    { mode: "AES256" },
    () => currentTime,
  );
  const upload = await storage.requestUpload(fixture.context, {
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.body.byteLength,
    sha256: sha256(input.body),
  });
  await adapter.put({
    key: upload.objectKey,
    body: input.body,
    mimeType: input.mimeType,
    sha256: sha256(input.body),
  });
  await storage.finalizeUpload(
    fixture.context,
    upload.storageObjectId,
    upload.grantId,
  );
  await storage.scanAndPromote(
    fixture.context,
    upload.storageObjectId,
    new DeterministicMalwareScanner(),
  );
  return upload.storageObjectId;
}

describe("portfolio and SOV import", () => {
  beforeEach(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  test("previews, commits, receipts, replays, quarantines a second import, and rolls back without deleting history", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "portfolio");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    const body = new Uint8Array(await readFile(fixturePath("generic-sov.csv")));
    const suggestion = await service.suggestMapping({
      body,
      format: "csv",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
    });
    expect(suggestion).toMatchObject({ rowCount: 3 });
    expect(suggestion.mapping).toMatchObject({
      externalPropertyId: "Property ID",
      addressLine1: "Address 1",
      expirationDate: "Expiration Date",
    });
    const saved = await service.saveMapping(fixture.context, {
      name: "Generic SOV v1",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: suggestion.mapping,
    });
    const replayedMapping = await service.saveMapping(fixture.context, {
      name: "Generic SOV v1",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: suggestion.mapping,
    });
    expect(replayedMapping.replayed).toBe(true);
    expect(replayedMapping.version.id).toBe(saved.version.id);

    const storageObjectId = await storeCleanImport(fixture, adapter, {
      body,
      filename: "generic-sov.csv",
      mimeType: "text/csv",
    });
    const storedSuggestion = await service.suggestMappingFromStorage(
      fixture.context,
      {
        storageObjectId,
        sourceSystem: genericAmsCsvAdapter.sourceSystem,
      },
    );
    expect(storedSuggestion).toMatchObject({
      storageObjectId,
      filename: "generic-sov.csv",
      format: "csv",
      rowCount: 3,
    });
    const workspace = await service.getWorkspace(fixture.context);
    expect(workspace.adapters).toHaveLength(3);
    expect(workspace.books).toContainEqual({
      id: fixture.bookId,
      name: "Book portfolio",
    });
    expect(workspace.storageObjects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: storageObjectId, state: "clean" }),
      ]),
    );
    expect(workspace.mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ versionId: saved.version.id }),
      ]),
    );
    await expect(
      service.getWorkspace({ ...fixture.context, role: "assistant" }),
    ).resolves.toMatchObject({ books: [{ id: fixture.bookId }] });
    const preview = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "portfolio-import-1",
    });
    expect(preview.portfolioImport).toMatchObject({
      status: "previewed",
      totalRows: 3,
      acceptedRows: 3,
      rejectedRows: 0,
      ambiguousRows: 0,
    });
    expect(preview.rows.map((row) => row.rowNumber)).toEqual([2, 3, 4]);
    await expect(
      service.commit(fixture.context, preview.portfolioImport.id, {
        confirmAcceptedRows: false,
      }),
    ).rejects.toBeInstanceOf(PortfolioImportValidationError);
    const committed = await service.commit(
      fixture.context,
      preview.portfolioImport.id,
      { confirmAcceptedRows: true },
    );
    expect(committed.portfolioImport).toMatchObject({
      status: "committed",
      committedRows: 3,
    });
    expect(committed.receipts.map((receipt) => receipt.receiptType)).toEqual([
      "preview",
      "commit",
    ]);
    expect(committed.rows.every((row) => row.status === "committed")).toBe(true);
    const entityCounts = {
      clients: await database.select({ value: count() }).from(schema.clients),
      properties: await database.select({ value: count() }).from(schema.properties),
      buildings: await database.select({ value: count() }).from(schema.buildings),
      policies: await database.select({ value: count() }).from(schema.policies),
    };
    expect(entityCounts.clients[0].value).toBe(3);
    expect(entityCounts.properties[0].value).toBe(3);
    expect(entityCounts.buildings[0].value).toBe(3);
    expect(entityCounts.policies[0].value).toBe(3);

    const idempotentReplay = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "portfolio-import-1",
    });
    expect(idempotentReplay.replayed).toBe(true);
    expect(idempotentReplay.portfolioImport.status).toBe("committed");

    const secondPreview = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "portfolio-import-2",
    });
    expect(secondPreview.portfolioImport).toMatchObject({
      acceptedRows: 0,
      ambiguousRows: 3,
    });
    await expect(
      service.commit(fixture.context, secondPreview.portfolioImport.id, {
        confirmAcceptedRows: true,
      }),
    ).rejects.toBeInstanceOf(PortfolioImportStateError);

    const rolledBack = await service.rollback(
      fixture.context,
      committed.portfolioImport.id,
      "Broker rejected the source export after review",
    );
    expect(rolledBack.portfolioImport.status).toBe("rolled_back");
    expect(rolledBack.receipts.map((receipt) => receipt.receiptType)).toEqual([
      "preview",
      "commit",
      "rollback",
    ]);
    const importedProperties = await database
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.organizationId, fixture.organizationId));
    expect(importedProperties).toHaveLength(3);
    expect(
      importedProperties.filter((property) => property.lifecycleStatus === "deleted"),
    ).toHaveLength(2);
    await expect(
      database
        .update(schema.importReceipts)
        .set({ receiptType: "preview" })
        .where(eq(schema.importReceipts.portfolioImportId, preview.portfolioImport.id)),
    ).rejects.toThrow();
  });

  test("quarantines ambiguous addresses and rejects missing identity, invalid units, and invalid currency", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "edge-import");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    const body = new Uint8Array(
      await readFile(fixturePath("generic-sov-edge-cases.csv")),
    );
    const suggestion = await service.suggestMapping({
      body,
      format: "csv",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
    });
    const saved = await service.saveMapping(fixture.context, {
      name: "Edge-case SOV",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: suggestion.mapping,
    });
    const storageObjectId = await storeCleanImport(fixture, adapter, {
      body,
      filename: "generic-sov-edge-cases.csv",
      mimeType: "text/csv",
    });
    const preview = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "edge-case-preview",
    });
    expect(preview.portfolioImport).toMatchObject({
      totalRows: 4,
      acceptedRows: 0,
      ambiguousRows: 2,
      rejectedRows: 2,
    });
    expect(
      preview.rows
        .filter((row) => row.status === "ambiguous")
        .every((row) => row.warnings.some((warning) => warning.includes("normalized address"))),
    ).toBe(true);
    const rejectedErrors = preview.rows
      .filter((row) => row.status === "rejected")
      .flatMap((row) => row.errors);
    expect(rejectedErrors).toEqual(
      expect.arrayContaining([
        "External property ID is required.",
        "Unit count must be a whole number.",
        "Currency must be a valid ISO 4217 code.",
      ]),
    );
  });

  test("parses a visually verified XLSX with a non-default header row", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "xlsx-import");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    const body = new Uint8Array(
      await readFile(fixturePath("fortify-sov-fixture.xlsx")),
    );
    const suggestion = await service.suggestMapping({
      body,
      format: "xlsx",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      headerRow: 4,
      sheetName: "Portfolio SOV",
    });
    expect(suggestion).toMatchObject({ rowCount: 3 });
    const saved = await service.saveMapping(fixture.context, {
      name: "Fortify XLSX SOV",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "xlsx",
      sheetName: "Portfolio SOV",
      headerRow: 4,
      columnMapping: suggestion.mapping,
    });
    const storageObjectId = await storeCleanImport(fixture, adapter, {
      body,
      filename: "fortify-sov-fixture.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const preview = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "xlsx-preview",
    });
    expect(preview.portfolioImport).toMatchObject({
      totalRows: 3,
      acceptedRows: 3,
      ambiguousRows: 0,
      rejectedRows: 0,
    });
    expect(preview.rows[0].normalizedData).toMatchObject({
      externalPropertyId: "XLSX-PROP-1",
      effectiveDate: "2026-08-01",
      expirationDate: "2027-08-01",
      postalCode: "81301",
    });
  });

  test("fails mapping suggestion closed for quarantined and cross-tenant storage objects", async () => {
    const alpha = await createTenantFixture(productionDatabase(), "suggest-alpha");
    const beta = await createTenantFixture(productionDatabase(), "suggest-beta");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    const storage = new ProductionStorageService(
      productionDatabase(),
      adapter,
      { mode: "AES256" },
      () => currentTime,
    );
    const body = new Uint8Array(await readFile(fixturePath("generic-sov.csv")));
    const upload = await storage.requestUpload(alpha.context, {
      filename: "quarantined.csv",
      mimeType: "text/csv",
      sizeBytes: body.byteLength,
      sha256: sha256(body),
    });
    await adapter.put({
      key: upload.objectKey,
      body,
      mimeType: "text/csv",
      sha256: sha256(body),
    });
    await storage.finalizeUpload(
      alpha.context,
      upload.storageObjectId,
      upload.grantId,
    );
    await expect(
      service.suggestMappingFromStorage(alpha.context, {
        storageObjectId: upload.storageObjectId,
        sourceSystem: genericAmsCsvAdapter.sourceSystem,
      }),
    ).rejects.toBeInstanceOf(PortfolioImportValidationError);
    await expect(
      service.suggestMappingFromStorage(beta.context, {
        storageObjectId: upload.storageObjectId,
        sourceSystem: genericAmsCsvAdapter.sourceSystem,
      }),
    ).rejects.toBeInstanceOf(TenantResourceNotFoundError);
  });

  test("keeps Applied Epic and AMS360 boundaries fixture-backed and rejects cross-tenant mapping references", async () => {
    const alpha = await createTenantFixture(productionDatabase(), "adapter-alpha");
    const beta = await createTenantFixture(productionDatabase(), "adapter-beta");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    await expect(
      service.suggestMapping({
        body: new Uint8Array(
          await readFile(fixturePath("applied-epic-compatible-fixture.csv")),
        ),
        format: "csv",
        sourceSystem: "unregistered_vendor",
      }),
    ).rejects.toBeInstanceOf(PortfolioImportValidationError);
    for (const input of [
      {
        file: "applied-epic-compatible-fixture.csv",
        adapter: appliedEpicFixtureAdapter,
        expectedPropertyHeader: "Location Code",
      },
      {
        file: "ams360-compatible-fixture.csv",
        adapter: ams360FixtureAdapter,
        expectedPropertyHeader: "LocationID",
      },
    ]) {
      const body = new Uint8Array(await readFile(fixturePath(input.file)));
      const suggestion = await service.suggestMapping({
        body,
        format: "csv",
        sourceSystem: input.adapter.sourceSystem,
      });
      expect(suggestion.mapping.externalPropertyId).toBe(
        input.expectedPropertyHeader,
      );
      expect(suggestion.externalValidationGate).toMatch(
        /No customer|rights-cleared/i,
      );
    }
    const mapping: ImportColumnMapping = {
      clientName: "Client Name",
      communityName: "Community Name",
      externalPropertyId: "Property ID",
      propertyName: "Property Name",
      propertyClass: "Property Class",
      addressLine1: "Address 1",
      region: "State",
    };
    const saved = await service.saveMapping(alpha.context, {
      name: "Alpha-only mapping",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: mapping,
    });
    await expect(
      database.insert(schema.portfolioImports).values({
        id: "cross-tenant-import",
        organizationId: beta.organizationId,
        bookId: beta.bookId,
        storageObjectId: "missing-storage-object",
        mappingVersionId: saved.version.id,
        sourceSystem: genericAmsCsvAdapter.sourceSystem,
        fileFormat: "csv",
        originalFilename: "invalid.csv",
        contentHash: "a".repeat(64),
        idempotencyKey: "cross-tenant",
        requestHash: "b".repeat(64),
        status: "previewed",
        createdAt: currentTime.toISOString(),
        updatedAt: currentTime.toISOString(),
        createdBy: beta.context.actorSubject,
        updatedBy: beta.context.actorSubject,
        revision: 1,
        lifecycleStatus: "active",
      }),
    ).rejects.toThrow();
    await expect(
      database
        .update(schema.importMappingVersions)
        .set({ schemaVersion: "tampered" })
        .where(eq(schema.importMappingVersions.id, saved.version.id)),
    ).rejects.toThrow();
  });

  test("rolls back atomically if the immutable ownership ledger contains an unsupported entity", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "rollback-atomic");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new PortfolioImportService(
      productionDatabase(),
      adapter,
      () => currentTime,
    );
    const body = new Uint8Array(await readFile(fixturePath("generic-sov.csv")));
    const suggestion = await service.suggestMapping({
      body,
      format: "csv",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
    });
    const saved = await service.saveMapping(fixture.context, {
      name: "Atomic rollback SOV",
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      fileFormat: "csv",
      columnMapping: suggestion.mapping,
    });
    const storageObjectId = await storeCleanImport(fixture, adapter, {
      body,
      filename: "generic-sov.csv",
      mimeType: "text/csv",
    });
    const preview = await service.preview(fixture.context, {
      bookId: fixture.bookId,
      storageObjectId,
      mappingVersionId: saved.version.id,
      sourceSystem: genericAmsCsvAdapter.sourceSystem,
      idempotencyKey: "rollback-atomic",
    });
    const committed = await service.commit(
      fixture.context,
      preview.portfolioImport.id,
      { confirmAcceptedRows: true },
    );
    await database
      .update(schema.portfolioImports)
      .set({
        createdEntities: [
          { entityType: "unsupported", entityId: "invalid" },
          ...committed.portfolioImport.createdEntities,
        ],
      })
      .where(eq(schema.portfolioImports.id, committed.portfolioImport.id));
    await expect(
      service.rollback(
        fixture.context,
        committed.portfolioImport.id,
        "exercise transactional rollback",
      ),
    ).rejects.toBeInstanceOf(PortfolioImportStateError);
    const activeImportedProperties = await database
      .select()
      .from(schema.properties)
      .where(
        and(
          eq(schema.properties.organizationId, fixture.organizationId),
          eq(schema.properties.lifecycleStatus, "active"),
        ),
      );
    expect(activeImportedProperties).toHaveLength(3);
    const run = await database
      .select()
      .from(schema.portfolioImports)
      .where(eq(schema.portfolioImports.id, committed.portfolioImport.id));
    expect(run[0].status).toBe("committed");
  });
});

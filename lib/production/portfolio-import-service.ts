import { and, eq, inArray } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  canonicalImportFields,
  getPortfolioImportAdapter,
  importSchemaVersion,
  normalizePortfolioRow,
  parseTabularFile,
  type CanonicalImportField,
  type ImportColumnMapping,
  type ImportConstants,
  type NormalizedPortfolioRow,
  type TabularCell,
} from "@/lib/production/import-adapters";
import { type ObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  appendAudit,
  digest,
  IdempotencyConflictError,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export class PortfolioImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioImportValidationError";
  }
}

export class PortfolioImportStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortfolioImportStateError";
  }
}

type PreviewStatus = "accepted" | "rejected" | "ambiguous";

interface PreviewRow {
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData: NormalizedPortfolioRow;
  status: PreviewStatus;
  errors: string[];
  warnings: string[];
  matchCandidateIds: string[];
}

type CreatedEntity = { entityType: string; entityId: string };

const requiredImportFields: CanonicalImportField[] = [
  "clientName",
  "communityName",
  "externalPropertyId",
  "propertyName",
  "propertyClass",
  "addressLine1",
  "region",
];

function nowIso(clock: () => Date) {
  return clock().toISOString();
}

function jsonSafeRow(row: Record<string, TabularCell>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function normalizedName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function stableValues(rows: PreviewRow[], field: keyof NormalizedPortfolioRow) {
  return new Set(
    rows.map((row) => JSON.stringify(row.normalizedData[field] ?? null)),
  );
}

function markAmbiguous(row: PreviewRow, message: string, candidates: string[] = []) {
  if (row.status === "rejected") return;
  row.status = "ambiguous";
  if (!row.warnings.includes(message)) row.warnings.push(message);
  row.matchCandidateIds = [
    ...new Set([...row.matchCandidateIds, ...candidates]),
  ];
}

function markRejected(row: PreviewRow, message: string) {
  row.status = "rejected";
  if (!row.errors.includes(message)) row.errors.push(message);
}

function validateMapping(
  mapping: ImportColumnMapping,
  constants: ImportConstants,
  headers?: string[],
) {
  const unknown = Object.keys(mapping).filter(
    (field) => !canonicalImportFields.includes(field as CanonicalImportField),
  );
  if (unknown.length)
    throw new PortfolioImportValidationError(
      `Unknown canonical mapping fields: ${unknown.join(", ")}.`,
    );
  for (const field of requiredImportFields) {
    if (!mapping[field] && !constants[field])
      throw new PortfolioImportValidationError(
        `The saved mapping must provide ${field}.`,
      );
  }
  if (headers) {
    const available = new Set(headers);
    const absent = Object.values(mapping).filter(
      (header): header is string => Boolean(header) && !available.has(header),
    );
    if (absent.length)
      throw new PortfolioImportValidationError(
        `Mapped columns are absent from the file: ${[...new Set(absent)].join(", ")}.`,
      );
  }
}

async function insertReceipt(
  database: ProductionDatabaseLike,
  context: TenantContext,
  input: {
    portfolioImportId: string;
    receiptType: "preview" | "commit" | "rollback";
    summary: Record<string, unknown>;
    occurredAt: string;
  },
) {
  const receiptHash = digest({
    organizationId: context.organizationId,
    ...input,
  });
  const inserted = await database
    .insert(schema.importReceipts)
    .values({
      id: randomUUID(),
      ...tenantRecord(context, input.occurredAt),
      portfolioImportId: input.portfolioImportId,
      receiptType: input.receiptType,
      summary: input.summary,
      receiptHash,
      occurredAt: input.occurredAt,
    })
    .returning();
  return inserted[0];
}

export class PortfolioImportService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async saveMapping(
    context: TenantContext,
    input: {
      name: string;
      sourceSystem: string;
      fileFormat: "csv" | "xlsx";
      sheetName?: string;
      headerRow?: number;
      columnMapping: ImportColumnMapping;
      constants?: ImportConstants;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "import_mapping",
      resourceOrganizationId: context.organizationId,
    });
    assertAuthorized(context, {
      action: "create",
      resource: "import_mapping_version",
      resourceOrganizationId: context.organizationId,
    });
    const name = input.name.normalize("NFKC").trim();
    if (!name) throw new PortfolioImportValidationError("A mapping name is required.");
    getPortfolioImportAdapter(input.sourceSystem);
    const constants = input.constants ?? {};
    validateMapping(input.columnMapping, constants);
    const headerRow = input.headerRow ?? 1;
    if (!Number.isSafeInteger(headerRow) || headerRow < 1)
      throw new PortfolioImportValidationError("Header row must be a positive integer.");
    const contentHash = digest({
      schemaVersion: importSchemaVersion,
      sourceSystem: input.sourceSystem,
      fileFormat: input.fileFormat,
      sheetName: input.sheetName ?? null,
      headerRow,
      columnMapping: input.columnMapping,
      constants,
    });
    const existing = await this.database
      .select()
      .from(schema.importMappings)
      .where(
        and(
          eq(schema.importMappings.organizationId, context.organizationId),
          eq(schema.importMappings.name, name),
        ),
      )
      .limit(1);
    if (existing[0] && existing[0].sourceSystem !== input.sourceSystem)
      throw new PortfolioImportValidationError(
        "A saved mapping cannot change its source-system boundary.",
      );
    if (existing[0]?.currentVersionId) {
      const current = await this.database
        .select()
        .from(schema.importMappingVersions)
        .where(
          and(
            eq(schema.importMappingVersions.id, existing[0].currentVersionId),
            eq(
              schema.importMappingVersions.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (current[0]?.contentHash === contentHash)
        return { mapping: existing[0], version: current[0], replayed: true };
    }
    const at = nowIso(this.clock);
    return this.database.transaction(async (transaction) => {
      const mappingId = existing[0]?.id ?? randomUUID();
      let mapping = existing[0];
      if (!mapping) {
        const inserted = await transaction
          .insert(schema.importMappings)
          .values({
            id: mappingId,
            ...tenantRecord(context, at),
            name,
            sourceSystem: input.sourceSystem,
          })
          .returning();
        mapping = inserted[0];
      }
      const priorVersions = await transaction
        .select({ versionNumber: schema.importMappingVersions.versionNumber })
        .from(schema.importMappingVersions)
        .where(
          and(
            eq(schema.importMappingVersions.organizationId, context.organizationId),
            eq(schema.importMappingVersions.importMappingId, mappingId),
          ),
        );
      const versionNumber =
        Math.max(0, ...priorVersions.map((version) => version.versionNumber)) + 1;
      const versionId = randomUUID();
      const versions = await transaction
        .insert(schema.importMappingVersions)
        .values({
          id: versionId,
          ...tenantRecord(context, at),
          importMappingId: mappingId,
          versionNumber,
          schemaVersion: importSchemaVersion,
          fileFormat: input.fileFormat,
          sheetName: input.sheetName,
          headerRow,
          columnMapping: input.columnMapping as Record<string, string>,
          constants: constants as Record<string, string>,
          contentHash,
        })
        .returning();
      const updatedMappings = await transaction
        .update(schema.importMappings)
        .set({
          currentVersionId: versionId,
          updatedAt: at,
          updatedBy: context.actorSubject,
          revision: (mapping?.revision ?? 0) + 1,
        })
        .where(eq(schema.importMappings.id, mappingId))
        .returning();
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "portfolio_import.mapping_saved",
        resourceType: "import_mapping_version",
        resourceId: versionId,
        detail: { mappingId, name, sourceSystem: input.sourceSystem, versionNumber },
        occurredAt: at,
      });
      return {
        mapping: updatedMappings[0],
        version: versions[0],
        replayed: false,
      };
    });
  }

  async suggestMapping(input: {
    body: Uint8Array;
    format: "csv" | "xlsx";
    sourceSystem: string;
    headerRow?: number;
    sheetName?: string;
  }) {
    const parsed = await parseTabularFile(input);
    const adapter = getPortfolioImportAdapter(input.sourceSystem);
    return {
      headers: parsed.headers,
      mapping: adapter.suggestMapping(parsed.headers),
      sourceSystem: adapter.sourceSystem,
      displayName: adapter.displayName,
      externalValidationGate: adapter.externalValidationGate,
      rowCount: parsed.rows.length,
    };
  }

  private async loadImport(context: TenantContext, portfolioImportId: string) {
    const imports = await this.database
      .select()
      .from(schema.portfolioImports)
      .where(
        and(
          eq(schema.portfolioImports.id, portfolioImportId),
          eq(schema.portfolioImports.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!imports[0]) throw new TenantResourceNotFoundError("Portfolio import");
    const rows = await this.database
      .select()
      .from(schema.importRows)
      .where(
        and(
          eq(schema.importRows.portfolioImportId, portfolioImportId),
          eq(schema.importRows.organizationId, context.organizationId),
        ),
      )
      .orderBy(schema.importRows.rowNumber);
    const receipts = await this.database
      .select()
      .from(schema.importReceipts)
      .where(
        and(
          eq(schema.importReceipts.portfolioImportId, portfolioImportId),
          eq(schema.importReceipts.organizationId, context.organizationId),
        ),
      )
      .orderBy(schema.importReceipts.occurredAt);
    return { portfolioImport: imports[0], rows, receipts };
  }

  async getImport(context: TenantContext, portfolioImportId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "portfolio_import",
      resourceOrganizationId: context.organizationId,
    });
    return this.loadImport(context, portfolioImportId);
  }

  async preview(
    context: TenantContext,
    input: {
      bookId: string;
      storageObjectId: string;
      mappingVersionId: string;
      sourceSystem: string;
      idempotencyKey: string;
    },
  ) {
    for (const resource of ["portfolio_import", "import_row", "import_receipt"] as const)
      assertAuthorized(context, {
        action: "create",
        resource,
        resourceOrganizationId: context.organizationId,
      });
    if (!input.idempotencyKey.trim())
      throw new PortfolioImportValidationError("An idempotency key is required.");
    const [books, objects, versions] = await Promise.all([
      this.database
        .select()
        .from(schema.books)
        .where(
          and(
            eq(schema.books.id, input.bookId),
            eq(schema.books.organizationId, context.organizationId),
          ),
        )
        .limit(1),
      this.database
        .select()
        .from(schema.storageObjects)
        .where(
          and(
            eq(schema.storageObjects.id, input.storageObjectId),
            eq(schema.storageObjects.organizationId, context.organizationId),
          ),
        )
        .limit(1),
      this.database
        .select({
          version: schema.importMappingVersions,
          mapping: schema.importMappings,
        })
        .from(schema.importMappingVersions)
        .innerJoin(
          schema.importMappings,
          eq(
            schema.importMappingVersions.importMappingId,
            schema.importMappings.id,
          ),
        )
        .where(
          and(
            eq(schema.importMappingVersions.id, input.mappingVersionId),
            eq(
              schema.importMappingVersions.organizationId,
              context.organizationId,
            ),
            eq(schema.importMappings.organizationId, context.organizationId),
          ),
        )
        .limit(1),
    ]);
    if (!books[0]) throw new TenantResourceNotFoundError("Book");
    const object = objects[0];
    if (!object) throw new TenantResourceNotFoundError("Storage object");
    if (object.state !== "clean" || object.scanStatus !== "clean")
      throw new PortfolioImportValidationError(
        "Portfolio imports require a clean scanned storage object.",
      );
    const mappingRecord = versions[0];
    if (!mappingRecord)
      throw new TenantResourceNotFoundError("Import mapping version");
    if (
      mappingRecord.mapping.sourceSystem !== input.sourceSystem ||
      mappingRecord.version.schemaVersion !== importSchemaVersion
    )
      throw new PortfolioImportValidationError(
        "The mapping version does not match the selected source-system boundary.",
      );
    const format = mappingRecord.version.fileFormat as "csv" | "xlsx";
    const expectedMime =
      format === "csv"
        ? "text/csv"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    if (object.mimeType !== expectedMime)
      throw new PortfolioImportValidationError(
        "The clean object's MIME type does not match the saved mapping format.",
      );
    const requestHash = digest({
      bookId: input.bookId,
      storageObjectId: input.storageObjectId,
      contentHash: object.sha256,
      mappingVersionId: input.mappingVersionId,
      sourceSystem: input.sourceSystem,
    });
    const prior = await this.database
      .select()
      .from(schema.portfolioImports)
      .where(
        and(
          eq(schema.portfolioImports.organizationId, context.organizationId),
          eq(schema.portfolioImports.sourceSystem, input.sourceSystem),
          eq(schema.portfolioImports.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (prior[0]) {
      if (prior[0].requestHash !== requestHash)
        throw new IdempotencyConflictError();
      return { ...(await this.loadImport(context, prior[0].id)), replayed: true };
    }
    const body = await this.storage.read(object.objectKey);
    const actualHash = createHash("sha256").update(body).digest("hex");
    if (actualHash !== object.sha256 || body.byteLength !== object.sizeBytes)
      throw new PortfolioImportValidationError(
        "Stored import bytes no longer match their clean-object metadata.",
      );
    const parsed = await parseTabularFile({
      body,
      format,
      headerRow: mappingRecord.version.headerRow,
      sheetName: mappingRecord.version.sheetName ?? undefined,
    });
    const mapping = mappingRecord.version.columnMapping as ImportColumnMapping;
    const constants = mappingRecord.version.constants as ImportConstants;
    validateMapping(mapping, constants, parsed.headers);
    const previewRows: PreviewRow[] = parsed.rows.map((row) => {
      const normalized = normalizePortfolioRow(row.values, mapping, constants);
      return {
        rowNumber: row.rowNumber,
        rawData: jsonSafeRow(row.values),
        normalizedData: normalized.normalized,
        status: normalized.errors.length ? "rejected" : "accepted",
        errors: normalized.errors,
        warnings: normalized.warnings,
        matchCandidateIds: [],
      };
    });
    await this.applyDuplicateAndAmbiguityChecks(
      context,
      input.sourceSystem,
      previewRows,
    );
    const counts = {
      totalRows: previewRows.length,
      acceptedRows: previewRows.filter((row) => row.status === "accepted").length,
      rejectedRows: previewRows.filter((row) => row.status === "rejected").length,
      ambiguousRows: previewRows.filter((row) => row.status === "ambiguous").length,
    };
    const portfolioImportId = randomUUID();
    const at = nowIso(this.clock);
    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.portfolioImports).values({
        id: portfolioImportId,
        ...tenantRecord(context, at),
        bookId: input.bookId,
        storageObjectId: input.storageObjectId,
        mappingVersionId: input.mappingVersionId,
        sourceSystem: input.sourceSystem,
        fileFormat: format,
        originalFilename: object.originalFilename,
        contentHash: object.sha256,
        idempotencyKey: input.idempotencyKey,
        requestHash,
        status: "previewed",
        ...counts,
      });
      if (previewRows.length)
        await transaction.insert(schema.importRows).values(
          previewRows.map((row) => ({
            id: randomUUID(),
            ...tenantRecord(context, at),
            portfolioImportId,
            rowNumber: row.rowNumber,
            rawData: row.rawData,
            normalizedData: row.normalizedData as unknown as Record<string, unknown>,
            status: row.status,
            errors: row.errors,
            warnings: row.warnings,
            matchCandidateIds: row.matchCandidateIds,
          })),
        );
      await insertReceipt(transaction as unknown as ProductionDatabaseLike, context, {
        portfolioImportId,
        receiptType: "preview",
        summary: {
          ...counts,
          contentHash: object.sha256,
          mappingVersionId: input.mappingVersionId,
          externalValidationGate:
            getPortfolioImportAdapter(input.sourceSystem).externalValidationGate,
        },
        occurredAt: at,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "portfolio_import.preview_created",
        resourceType: "portfolio_import",
        resourceId: portfolioImportId,
        detail: counts,
        occurredAt: at,
      });
    });
    return { ...(await this.loadImport(context, portfolioImportId)), replayed: false };
  }

  private async applyDuplicateAndAmbiguityChecks(
    context: TenantContext,
    sourceSystem: string,
    rows: PreviewRow[],
  ) {
    const validRows = rows.filter((row) => row.status !== "rejected");
    const byPropertyId = new Map<string, PreviewRow[]>();
    const byAddress = new Map<string, PreviewRow[]>();
    const byClientId = new Map<string, PreviewRow[]>();
    const byCommunityId = new Map<string, PreviewRow[]>();
    for (const row of validRows) {
      const propertyId = row.normalizedData.externalPropertyId;
      byPropertyId.set(propertyId, [...(byPropertyId.get(propertyId) ?? []), row]);
      const address = row.normalizedData.normalizedAddress;
      byAddress.set(address, [...(byAddress.get(address) ?? []), row]);
      if (row.normalizedData.externalClientId)
        byClientId.set(row.normalizedData.externalClientId, [
          ...(byClientId.get(row.normalizedData.externalClientId) ?? []),
          row,
        ]);
      if (row.normalizedData.externalCommunityId)
        byCommunityId.set(row.normalizedData.externalCommunityId, [
          ...(byCommunityId.get(row.normalizedData.externalCommunityId) ?? []),
          row,
        ]);
    }
    const stablePropertyFields: Array<keyof NormalizedPortfolioRow> = [
      "clientName",
      "communityName",
      "propertyName",
      "propertyClass",
      "normalizedAddress",
      "unitCount",
      "buildingCount",
      "policyNumber",
      "effectiveDate",
      "expirationDate",
      "currency",
    ];
    for (const grouped of byPropertyId.values()) {
      for (const field of stablePropertyFields) {
        if (stableValues(grouped, field).size > 1)
          for (const row of grouped)
            markAmbiguous(
              row,
              `Rows sharing an external property ID disagree on ${field}; human reconciliation is required.`,
            );
      }
      const buildingLabels = new Set<string>();
      for (const row of grouped) {
        const label = row.normalizedData.buildingLabel;
        if (!label) continue;
        const key = normalizedName(label);
        if (buildingLabels.has(key))
          markRejected(
            row,
            "A building label is duplicated within the same external property ID.",
          );
        buildingLabels.add(key);
      }
    }
    for (const grouped of byAddress.values()) {
      const propertyIds = new Set(
        grouped.map((row) => row.normalizedData.externalPropertyId),
      );
      if (propertyIds.size > 1)
        for (const row of grouped)
          markAmbiguous(
            row,
            "The same normalized address appears under multiple external property IDs; no automatic merge was performed.",
          );
    }
    for (const grouped of byClientId.values()) {
      if (new Set(grouped.map((row) => normalizedName(row.normalizedData.clientName))).size > 1)
        for (const row of grouped)
          markAmbiguous(row, "The same external client ID has conflicting names.");
    }
    for (const grouped of byCommunityId.values()) {
      if (
        new Set(
          grouped.map((row) => normalizedName(row.normalizedData.communityName)),
        ).size > 1
      )
        for (const row of grouped)
          markAmbiguous(row, "The same external community ID has conflicting names.");
    }

    const propertyIds = [...byPropertyId.keys()];
    const addresses = [...byAddress.keys()].filter(Boolean);
    const policyNumbers = [
      ...new Set(
        validRows
          .map((row) => row.normalizedData.policyNumber)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const [existingIdentifiers, existingLocations, existingPolicies] =
      await Promise.all([
        propertyIds.length
          ? this.database
              .select()
              .from(schema.propertyIdentifiers)
              .where(
                and(
                  eq(
                    schema.propertyIdentifiers.organizationId,
                    context.organizationId,
                  ),
                  eq(schema.propertyIdentifiers.source, sourceSystem),
                  eq(schema.propertyIdentifiers.identifierType, "property"),
                  inArray(schema.propertyIdentifiers.value, propertyIds),
                ),
              )
          : [],
        addresses.length
          ? this.database
              .select()
              .from(schema.locations)
              .where(
                and(
                  eq(schema.locations.organizationId, context.organizationId),
                  inArray(schema.locations.normalizedAddress, addresses),
                ),
              )
          : [],
        policyNumbers.length
          ? this.database
              .select()
              .from(schema.policies)
              .where(
                and(
                  eq(schema.policies.organizationId, context.organizationId),
                  inArray(schema.policies.policyNumber, policyNumbers),
                ),
              )
          : [],
      ]);
    for (const identifier of existingIdentifiers) {
      for (const row of byPropertyId.get(identifier.value) ?? [])
        markAmbiguous(
          row,
          "The external property ID already exists and requires an explicit update/reconciliation decision.",
          [identifier.propertyId],
        );
    }
    for (const location of existingLocations) {
      for (const row of byAddress.get(location.normalizedAddress) ?? [])
        markAmbiguous(
          row,
          "The normalized address matches an existing property; names alone were not used to merge it.",
          [location.propertyId],
        );
    }
    for (const policy of existingPolicies) {
      for (const row of validRows.filter(
        (candidate) =>
          candidate.normalizedData.policyNumber === policy.policyNumber &&
          candidate.normalizedData.expirationDate === policy.expirationDate,
      ))
        markAmbiguous(
          row,
          "The policy number and expiration date already exist on another record.",
          [policy.propertyId],
        );
    }
  }

  async commit(
    context: TenantContext,
    portfolioImportId: string,
    input: { confirmAcceptedRows: boolean },
  ) {
    if (!input.confirmAcceptedRows)
      throw new PortfolioImportValidationError(
        "A human must confirm the accepted rows before import commit.",
      );
    const writeResources = [
      "portfolio_import",
      "import_row",
      "import_receipt",
      "client",
      "community",
      "property",
      "property_identifier",
      "location",
      "building",
      "policy",
    ] as const;
    for (const resource of writeResources)
      assertAuthorized(context, {
        action: "create",
        resource,
        resourceOrganizationId: context.organizationId,
      });
    const loaded = await this.loadImport(context, portfolioImportId);
    const run = loaded.portfolioImport;
    if (run.status === "committed") return { ...loaded, replayed: true };
    if (run.status !== "previewed")
      throw new PortfolioImportStateError("Only a previewed import can be committed.");
    const accepted = loaded.rows.filter((row) => row.status === "accepted");
    if (!accepted.length)
      throw new PortfolioImportStateError("There are no accepted rows to commit.");
    const at = nowIso(this.clock);
    await this.database.transaction(async (transaction) => {
      const normalizedRows = accepted.map((row) => ({
        row,
        data: row.normalizedData as unknown as NormalizedPortfolioRow,
      }));
      const externalIds = [
        ...new Set(normalizedRows.map(({ data }) => data.externalPropertyId)),
      ];
      const addresses = [
        ...new Set(normalizedRows.map(({ data }) => data.normalizedAddress)),
      ];
      const collisions = await transaction
        .select({ propertyId: schema.propertyIdentifiers.propertyId })
        .from(schema.propertyIdentifiers)
        .where(
          and(
            eq(schema.propertyIdentifiers.organizationId, context.organizationId),
            eq(schema.propertyIdentifiers.source, run.sourceSystem),
            eq(schema.propertyIdentifiers.identifierType, "property"),
            inArray(schema.propertyIdentifiers.value, externalIds),
          ),
        );
      const addressCollisions = await transaction
        .select({ propertyId: schema.locations.propertyId })
        .from(schema.locations)
        .where(
          and(
            eq(schema.locations.organizationId, context.organizationId),
            inArray(schema.locations.normalizedAddress, addresses),
          ),
        );
      if (collisions.length || addressCollisions.length)
        throw new PortfolioImportStateError(
          "Identity changed after preview; refresh the preview before committing.",
        );

      const createdEntities: CreatedEntity[] = [];
      const clientCache = new Map<string, string>();
      const communityCache = new Map<string, string>();
      const groupedProperties = new Map<string, typeof normalizedRows>();
      for (const item of normalizedRows)
        groupedProperties.set(item.data.externalPropertyId, [
          ...(groupedProperties.get(item.data.externalPropertyId) ?? []),
          item,
        ]);

      for (const propertyRows of groupedProperties.values()) {
        const first = propertyRows[0].data;
        const clientKey = first.externalClientId
          ? `external:${first.externalClientId}`
          : `import:${normalizedName(first.clientName)}`;
        let clientId = clientCache.get(clientKey);
        if (!clientId && first.externalClientId) {
          const existingClients = await transaction
            .select()
            .from(schema.clients)
            .where(
              and(
                eq(schema.clients.organizationId, context.organizationId),
                eq(schema.clients.externalSystem, run.sourceSystem),
                eq(schema.clients.externalId, first.externalClientId),
              ),
            )
            .limit(1);
          if (existingClients[0]) {
            if (normalizedName(existingClients[0].name) !== normalizedName(first.clientName))
              throw new PortfolioImportStateError(
                "An external client ID changed names after preview.",
              );
            clientId = existingClients[0].id;
          }
        }
        if (!clientId) {
          clientId = randomUUID();
          await transaction.insert(schema.clients).values({
            id: clientId,
            ...tenantRecord(context, at),
            bookId: run.bookId,
            name: first.clientName,
            externalSystem: first.externalClientId ? run.sourceSystem : undefined,
            externalId: first.externalClientId,
          });
          createdEntities.push({ entityType: "client", entityId: clientId });
        }
        clientCache.set(clientKey, clientId);

        const communityKey = first.externalCommunityId
          ? `external:${first.externalCommunityId}`
          : `${clientId}:import:${normalizedName(first.communityName)}`;
        let communityId = communityCache.get(communityKey);
        if (!communityId && first.externalCommunityId) {
          const existingCommunities = await transaction
            .select()
            .from(schema.communities)
            .where(
              and(
                eq(schema.communities.organizationId, context.organizationId),
                eq(schema.communities.externalSystem, run.sourceSystem),
                eq(schema.communities.externalId, first.externalCommunityId),
              ),
            )
            .limit(1);
          if (existingCommunities[0]) {
            if (
              normalizedName(existingCommunities[0].name) !==
              normalizedName(first.communityName)
            )
              throw new PortfolioImportStateError(
                "An external community ID changed names after preview.",
              );
            communityId = existingCommunities[0].id;
          }
        }
        if (!communityId) {
          communityId = randomUUID();
          await transaction.insert(schema.communities).values({
            id: communityId,
            ...tenantRecord(context, at),
            clientId,
            name: first.communityName,
            propertyClass: first.propertyClass,
            summary: "Imported from a human-confirmed portfolio preview.",
            externalSystem: first.externalCommunityId ? run.sourceSystem : undefined,
            externalId: first.externalCommunityId,
          });
          createdEntities.push({ entityType: "community", entityId: communityId });
        }
        communityCache.set(communityKey, communityId);

        const propertyId = randomUUID();
        const uniqueBuildingLabels = [
          ...new Set(
            propertyRows
              .map(({ data }) => data.buildingLabel)
              .filter((label): label is string => Boolean(label)),
          ),
        ];
        await transaction.insert(schema.properties).values({
          id: propertyId,
          ...tenantRecord(context, at),
          communityId,
          name: first.propertyName,
          propertyClass: first.propertyClass,
          unitCount: first.unitCount,
          buildingCount:
            first.buildingCount ??
            (uniqueBuildingLabels.length ? uniqueBuildingLabels.length : undefined),
        });
        createdEntities.push({ entityType: "property", entityId: propertyId });
        const identifierId = randomUUID();
        await transaction.insert(schema.propertyIdentifiers).values({
          id: identifierId,
          ...tenantRecord(context, at),
          propertyId,
          source: run.sourceSystem,
          identifierType: "property",
          value: first.externalPropertyId,
          reviewStatus: "confirmed",
        });
        createdEntities.push({
          entityType: "property_identifier",
          entityId: identifierId,
        });
        const locationId = randomUUID();
        await transaction.insert(schema.locations).values({
          id: locationId,
          ...tenantRecord(context, at),
          propertyId,
          addressLine1: first.addressLine1,
          city: first.city,
          region: first.region,
          postalCode: first.postalCode,
          county: first.county,
          countryCode: "US",
          normalizedAddress: first.normalizedAddress,
          normalizationStatus: "deterministic_local_reviewed",
        });
        createdEntities.push({ entityType: "location", entityId: locationId });
        const propertyApplied: CreatedEntity[] = [
          { entityType: "client", entityId: clientId },
          { entityType: "community", entityId: communityId },
          { entityType: "property", entityId: propertyId },
          { entityType: "property_identifier", entityId: identifierId },
          { entityType: "location", entityId: locationId },
        ];
        const buildingByLabel = new Map<string, CreatedEntity>();
        for (const label of uniqueBuildingLabels) {
          const buildingId = randomUUID();
          const sourceRow = propertyRows.find(
            ({ data }) => data.buildingLabel === label,
          );
          await transaction.insert(schema.buildings).values({
            id: buildingId,
            ...tenantRecord(context, at),
            propertyId,
            label,
            constructionYear: sourceRow?.data.constructionYear,
          });
          const entity = { entityType: "building", entityId: buildingId };
          buildingByLabel.set(label, entity);
          createdEntities.push(entity);
        }
        let policyEntity: CreatedEntity | undefined;
        if (first.policyNumber && first.expirationDate) {
          const policyId = randomUUID();
          await transaction.insert(schema.policies).values({
            id: policyId,
            ...tenantRecord(context, at),
            propertyId,
            policyNumber: first.policyNumber,
            effectiveDate: first.effectiveDate,
            expirationDate: first.expirationDate,
            currency: first.currency,
            sourceAuthority: run.sourceSystem,
          });
          policyEntity = { entityType: "policy", entityId: policyId };
          createdEntities.push(policyEntity);
        }
        for (const { row, data } of propertyRows) {
          const appliedEntities = [
            ...propertyApplied,
            ...(data.buildingLabel && buildingByLabel.get(data.buildingLabel)
              ? [buildingByLabel.get(data.buildingLabel)!]
              : []),
            ...(policyEntity ? [policyEntity] : []),
          ];
          await transaction
            .update(schema.importRows)
            .set({
              status: "committed",
              appliedEntities,
              updatedAt: at,
              updatedBy: context.actorSubject,
              revision: row.revision + 1,
            })
            .where(eq(schema.importRows.id, row.id));
        }
      }
      const uniqueCreated = [
        ...new Map(
          createdEntities.map((entity) => [
            `${entity.entityType}:${entity.entityId}`,
            entity,
          ]),
        ).values(),
      ];
      await transaction
        .update(schema.portfolioImports)
        .set({
          status: "committed",
          committedRows: accepted.length,
          createdEntities: uniqueCreated,
          committedAt: at,
          updatedAt: at,
          updatedBy: context.actorSubject,
          revision: run.revision + 1,
        })
        .where(eq(schema.portfolioImports.id, portfolioImportId));
      const entityCounts = Object.fromEntries(
        [...new Set(uniqueCreated.map((entity) => entity.entityType))].map(
          (entityType) => [
            entityType,
            uniqueCreated.filter((entity) => entity.entityType === entityType).length,
          ],
        ),
      );
      await insertReceipt(transaction as unknown as ProductionDatabaseLike, context, {
        portfolioImportId,
        receiptType: "commit",
        summary: {
          committedRows: accepted.length,
          quarantinedRejectedRows: run.rejectedRows,
          quarantinedAmbiguousRows: run.ambiguousRows,
          entityCounts,
          humanConfirmed: true,
        },
        occurredAt: at,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "portfolio_import.committed",
        resourceType: "portfolio_import",
        resourceId: portfolioImportId,
        detail: { committedRows: accepted.length, entityCounts },
        occurredAt: at,
      });
    });
    return { ...(await this.loadImport(context, portfolioImportId)), replayed: false };
  }

  async rollback(context: TenantContext, portfolioImportId: string, reason: string) {
    for (const resource of ["portfolio_import", "import_row", "import_receipt"] as const)
      assertAuthorized(context, {
        action: "update",
        resource,
        resourceOrganizationId: context.organizationId,
      });
    if (!reason.trim())
      throw new PortfolioImportValidationError("A rollback reason is required.");
    const loaded = await this.loadImport(context, portfolioImportId);
    const run = loaded.portfolioImport;
    if (run.status === "rolled_back") return { ...loaded, replayed: true };
    if (run.status !== "committed")
      throw new PortfolioImportStateError("Only a committed import can be rolled back.");
    const at = nowIso(this.clock);
    await this.database.transaction(async (transaction) => {
      const entities = [...(run.createdEntities as CreatedEntity[])].reverse();
      for (const entity of entities) {
        const update = {
          lifecycleStatus: "deleted",
          deletedAt: at,
          updatedAt: at,
          updatedBy: context.actorSubject,
        };
        switch (entity.entityType) {
          case "policy":
            await transaction.update(schema.policies).set(update).where(and(eq(schema.policies.id, entity.entityId), eq(schema.policies.organizationId, context.organizationId)));
            break;
          case "building":
            await transaction.update(schema.buildings).set(update).where(and(eq(schema.buildings.id, entity.entityId), eq(schema.buildings.organizationId, context.organizationId)));
            break;
          case "location":
            await transaction.update(schema.locations).set(update).where(and(eq(schema.locations.id, entity.entityId), eq(schema.locations.organizationId, context.organizationId)));
            break;
          case "property_identifier":
            await transaction.update(schema.propertyIdentifiers).set(update).where(and(eq(schema.propertyIdentifiers.id, entity.entityId), eq(schema.propertyIdentifiers.organizationId, context.organizationId)));
            break;
          case "property":
            await transaction.update(schema.properties).set(update).where(and(eq(schema.properties.id, entity.entityId), eq(schema.properties.organizationId, context.organizationId)));
            break;
          case "community":
            await transaction.update(schema.communities).set(update).where(and(eq(schema.communities.id, entity.entityId), eq(schema.communities.organizationId, context.organizationId)));
            break;
          case "client":
            await transaction.update(schema.clients).set(update).where(and(eq(schema.clients.id, entity.entityId), eq(schema.clients.organizationId, context.organizationId)));
            break;
          default:
            throw new PortfolioImportStateError(
              `Rollback encountered an unsupported entity type: ${entity.entityType}.`,
            );
        }
      }
      await transaction
        .update(schema.importRows)
        .set({
          status: "rolled_back",
          updatedAt: at,
          updatedBy: context.actorSubject,
        })
        .where(
          and(
            eq(schema.importRows.portfolioImportId, portfolioImportId),
            eq(schema.importRows.organizationId, context.organizationId),
            eq(schema.importRows.status, "committed"),
          ),
        );
      await transaction
        .update(schema.portfolioImports)
        .set({
          status: "rolled_back",
          rolledBackAt: at,
          lifecycleStatus: "archived",
          updatedAt: at,
          updatedBy: context.actorSubject,
          revision: run.revision + 1,
        })
        .where(eq(schema.portfolioImports.id, portfolioImportId));
      await insertReceipt(transaction as unknown as ProductionDatabaseLike, context, {
        portfolioImportId,
        receiptType: "rollback",
        summary: {
          reason,
          archivedCreatedEntities: entities.length,
          destructiveDeletes: 0,
        },
        occurredAt: at,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "portfolio_import.rolled_back",
        resourceType: "portfolio_import",
        resourceId: portfolioImportId,
        detail: { reason, archivedCreatedEntities: entities.length },
        occurredAt: at,
      });
    });
    return { ...(await this.loadImport(context, portfolioImportId)), replayed: false };
  }
}

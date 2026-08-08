import { getProductionDatabase } from "@/db/production/client";
import type { PortfolioImportWorkspaceResponse } from "@/lib/contracts/portfolio-import";
import {
  PortfolioImportWorkspaceQueryService,
  type PortfolioImportWorkspace,
} from "@/lib/production/contexts/portfolio-import/workspace-query";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { PortfolioImportService } from "@/lib/production/portfolio-import-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

type PortfolioImportResult = Awaited<
  ReturnType<PortfolioImportService["getImport"]>
> & { replayed?: boolean };
type PortfolioImportSuggestion = Awaited<
  ReturnType<PortfolioImportService["suggestMappingFromStorage"]>
>;
type PortfolioImportMapping = Awaited<
  ReturnType<PortfolioImportService["saveMapping"]>
>;

export function getProductionPortfolioImportService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new PortfolioImportService(database, getProductionObjectStorage());
}

export function getProductionPortfolioImportWorkspaceQuery(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new PortfolioImportWorkspaceQueryService(database);
}

function presentPortfolioImportFileFormat(value: string): "csv" | "xlsx" {
  if (value === "csv" || value === "xlsx") return value;
  throw new Error("The saved portfolio import format is unsupported.");
}

export function presentPortfolioImportWorkspace(
  workspace: PortfolioImportWorkspace,
): PortfolioImportWorkspaceResponse {
  return {
    adapters: workspace.adapters.map((adapter) => ({
      sourceSystem: adapter.sourceSystem,
      displayName: adapter.displayName,
      externalValidationGate: adapter.externalValidationGate,
    })),
    books: workspace.books.map((book) => ({
      id: book.id,
      name: book.name,
    })),
    storageObjects: workspace.storageObjects.map((object) => ({
      id: object.id,
      filename: object.filename,
      mimeType: object.mimeType,
      sizeBytes: object.sizeBytes,
      sha256: object.sha256,
      state: object.state,
      scanStatus: object.scanStatus,
      createdAt: object.createdAt,
    })),
    mappings: workspace.mappings.map((mapping) => ({
      id: mapping.id,
      name: mapping.name,
      sourceSystem: mapping.sourceSystem,
      versionId: mapping.versionId,
      versionNumber: mapping.versionNumber,
      fileFormat: presentPortfolioImportFileFormat(mapping.fileFormat),
      sheetName: mapping.sheetName,
      headerRow: mapping.headerRow,
      columnMapping: mapping.columnMapping,
      constants: mapping.constants,
    })),
    recentImports: workspace.recentImports.map((portfolioImport) => ({
      id: portfolioImport.id,
      filename: portfolioImport.filename,
      sourceSystem: portfolioImport.sourceSystem,
      status: portfolioImport.status,
      totalRows: portfolioImport.totalRows,
      acceptedRows: portfolioImport.acceptedRows,
      rejectedRows: portfolioImport.rejectedRows,
      ambiguousRows: portfolioImport.ambiguousRows,
      committedRows: portfolioImport.committedRows,
      createdAt: portfolioImport.createdAt,
    })),
  };
}

export function presentPortfolioImportSuggestion(
  suggestion: PortfolioImportSuggestion,
) {
  return {
    mapping: suggestion.mapping,
    rowCount: suggestion.rowCount,
  };
}

export function presentPortfolioImportMapping(result: PortfolioImportMapping) {
  return {
    version: { id: result.version.id },
    replayed: result.replayed,
  };
}

export function presentPortfolioImportResult(result: PortfolioImportResult) {
  return {
    portfolioImport: {
      id: result.portfolioImport.id,
      status: result.portfolioImport.status,
      totalRows: result.portfolioImport.totalRows,
      acceptedRows: result.portfolioImport.acceptedRows,
      rejectedRows: result.portfolioImport.rejectedRows,
      ambiguousRows: result.portfolioImport.ambiguousRows,
      committedRows: result.portfolioImport.committedRows,
      originalFilename: result.portfolioImport.originalFilename,
    },
    rows: result.rows.map((row) => ({
      rowNumber: row.rowNumber,
      status: row.status,
      normalizedData: row.normalizedData,
      errors: row.errors,
      warnings: row.warnings,
    })),
    receipts: result.receipts.map((receipt) => ({
      receiptType: receipt.receiptType,
      receiptHash: receipt.receiptHash,
      occurredAt: receipt.occurredAt,
    })),
    ...(result.replayed === undefined ? {} : { replayed: result.replayed }),
  };
}

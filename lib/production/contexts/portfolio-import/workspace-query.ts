import { and, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import { portfolioImportAdapters } from "@/lib/production/import-adapters";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";

export type PortfolioImportWorkspaceQuery = QueryOperation<
  "portfolio_import.workspace",
  TenantContext
>;

export function portfolioImportWorkspaceQuery(
  context: TenantContext,
): PortfolioImportWorkspaceQuery {
  return defineQuery({
    boundedContext: "portfolio_import",
    name: "portfolio_import.workspace",
    context,
    input: undefined,
  });
}

export interface PortfolioImportWorkspaceQueryPort {
  execute(
    query: PortfolioImportWorkspaceQuery,
  ): Promise<PortfolioImportWorkspace>;
}

export class PortfolioImportWorkspaceQueryService
  implements PortfolioImportWorkspaceQueryPort
{
  constructor(private readonly database: ProductionDatabaseLike) {}

  async execute(query: PortfolioImportWorkspaceQuery) {
    const { context } = query;
    for (const resource of [
      "book",
      "storage_object",
      "import_mapping",
      "import_mapping_version",
      "portfolio_import",
    ] as const)
      assertAuthorized(context, {
        action: "read",
        resource,
        resourceOrganizationId: context.organizationId,
      });

    const [books, storageObjects, mappings, recentImports] = await Promise.all([
      this.database
        .select({ id: schema.books.id, name: schema.books.name })
        .from(schema.books)
        .where(
          and(
            eq(schema.books.organizationId, context.organizationId),
            eq(schema.books.lifecycleStatus, "active"),
          ),
        )
        .orderBy(schema.books.name),
      this.database
        .select({
          id: schema.storageObjects.id,
          filename: schema.storageObjects.originalFilename,
          mimeType: schema.storageObjects.mimeType,
          sizeBytes: schema.storageObjects.sizeBytes,
          sha256: schema.storageObjects.sha256,
          state: schema.storageObjects.state,
          scanStatus: schema.storageObjects.scanStatus,
          createdAt: schema.storageObjects.createdAt,
        })
        .from(schema.storageObjects)
        .where(
          and(
            eq(schema.storageObjects.organizationId, context.organizationId),
            inArray(schema.storageObjects.mimeType, [
              "text/csv",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ]),
          ),
        )
        .orderBy(desc(schema.storageObjects.createdAt))
        .limit(50),
      this.database
        .select({
          id: schema.importMappings.id,
          name: schema.importMappings.name,
          sourceSystem: schema.importMappings.sourceSystem,
          versionId: schema.importMappingVersions.id,
          versionNumber: schema.importMappingVersions.versionNumber,
          fileFormat: schema.importMappingVersions.fileFormat,
          sheetName: schema.importMappingVersions.sheetName,
          headerRow: schema.importMappingVersions.headerRow,
          columnMapping: schema.importMappingVersions.columnMapping,
          constants: schema.importMappingVersions.constants,
        })
        .from(schema.importMappings)
        .innerJoin(
          schema.importMappingVersions,
          eq(
            schema.importMappings.currentVersionId,
            schema.importMappingVersions.id,
          ),
        )
        .where(
          and(
            eq(schema.importMappings.organizationId, context.organizationId),
            eq(
              schema.importMappingVersions.organizationId,
              context.organizationId,
            ),
            eq(schema.importMappings.lifecycleStatus, "active"),
          ),
        )
        .orderBy(schema.importMappings.name),
      this.database
        .select({
          id: schema.portfolioImports.id,
          filename: schema.portfolioImports.originalFilename,
          sourceSystem: schema.portfolioImports.sourceSystem,
          status: schema.portfolioImports.status,
          totalRows: schema.portfolioImports.totalRows,
          acceptedRows: schema.portfolioImports.acceptedRows,
          rejectedRows: schema.portfolioImports.rejectedRows,
          ambiguousRows: schema.portfolioImports.ambiguousRows,
          committedRows: schema.portfolioImports.committedRows,
          createdAt: schema.portfolioImports.createdAt,
        })
        .from(schema.portfolioImports)
        .where(
          eq(schema.portfolioImports.organizationId, context.organizationId),
        )
        .orderBy(desc(schema.portfolioImports.createdAt))
        .limit(20),
    ]);

    return {
      adapters: portfolioImportAdapters.map((adapter) => ({
        sourceSystem: adapter.sourceSystem,
        displayName: adapter.displayName,
        externalValidationGate: adapter.externalValidationGate,
      })),
      books,
      storageObjects,
      mappings,
      recentImports,
    };
  }
}

export type PortfolioImportWorkspace = Awaited<
  ReturnType<PortfolioImportWorkspaceQueryService["execute"]>
>;

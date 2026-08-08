import { and, desc, eq, inArray, or } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";

export interface StorageCustodyPosture {
  encryptedObjectCount: number;
  quarantinedObjectCount: number;
  cleanObjectCount: number;
}

export interface PortfolioImportStorageObject {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  state: string;
  scanStatus: string;
  createdAt: string;
}

export interface DocumentIntakeStorageObject {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
}

export interface StorageObjectQueryPort {
  summarizeCustody(context: TenantContext): Promise<StorageCustodyPosture>;
  listPortfolioImportObjects(
    context: TenantContext,
  ): Promise<PortfolioImportStorageObject[]>;
  listDocumentIntakeObjects(
    context: TenantContext,
    linkedStorageObjectIds: readonly string[],
  ): Promise<DocumentIntakeStorageObject[]>;
}

function assertStorageRead(context: TenantContext) {
  assertAuthorized(context, {
    action: "read",
    resource: "storage_object",
    resourceOrganizationId: context.organizationId,
  });
}

export class StorageObjectQueryService implements StorageObjectQueryPort {
  constructor(private readonly database: ProductionDatabaseLike) {}

  async summarizeCustody(
    context: TenantContext,
  ): Promise<StorageCustodyPosture> {
    assertStorageRead(context);
    const objects = await this.database
      .select({
        encryptionMode: schema.storageObjects.encryptionMode,
        state: schema.storageObjects.state,
        scanStatus: schema.storageObjects.scanStatus,
      })
      .from(schema.storageObjects)
      .where(eq(schema.storageObjects.organizationId, context.organizationId));

    return {
      encryptedObjectCount: objects.filter((object) =>
        ["AES256", "aws:kms"].includes(object.encryptionMode),
      ).length,
      quarantinedObjectCount: objects.filter((object) =>
        ["pending_upload", "quarantined", "scanning"].includes(object.state),
      ).length,
      cleanObjectCount: objects.filter(
        (object) => object.state === "clean" && object.scanStatus === "clean",
      ).length,
    };
  }

  async listPortfolioImportObjects(
    context: TenantContext,
  ): Promise<PortfolioImportStorageObject[]> {
    assertStorageRead(context);
    return this.database
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
      .limit(50);
  }

  async listDocumentIntakeObjects(
    context: TenantContext,
    linkedStorageObjectIds: readonly string[],
  ): Promise<DocumentIntakeStorageObject[]> {
    assertStorageRead(context);
    return this.database
      .select({
        id: schema.storageObjects.id,
        filename: schema.storageObjects.originalFilename,
        mimeType: schema.storageObjects.mimeType,
        sizeBytes: schema.storageObjects.sizeBytes,
        sha256: schema.storageObjects.sha256,
        createdAt: schema.storageObjects.createdAt,
      })
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.organizationId, context.organizationId),
          eq(schema.storageObjects.state, "clean"),
          eq(schema.storageObjects.scanStatus, "clean"),
          inArray(schema.storageObjects.mimeType, [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "text/plain",
          ]),
          context.assignedCaseIds
            ? linkedStorageObjectIds.length
              ? or(
                  inArray(schema.storageObjects.id, [
                    ...linkedStorageObjectIds,
                  ]),
                  eq(schema.storageObjects.createdBy, context.actorSubject),
                )
              : eq(schema.storageObjects.createdBy, context.actorSubject)
            : undefined,
        ),
      )
      .orderBy(desc(schema.storageObjects.createdAt))
      .limit(100);
  }
}

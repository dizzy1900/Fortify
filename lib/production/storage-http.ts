import { getProductionDatabase } from "@/db/production/client";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { SignedOperation } from "@/lib/production/object-storage";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { ProductionStorageService } from "@/lib/production/storage-service";

export function getProductionStorageService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  const storage = getProductionObjectStorage();
  const kmsKeyId = process.env.FORTIFY_STORAGE_KMS_KEY_ID?.trim();
  return new ProductionStorageService(
    database,
    storage,
    kmsKeyId ? { mode: "aws:kms", keyId: kmsKeyId } : { mode: "AES256" },
  );
}

export function presentRequestedUpload(upload: {
  storageObjectId: string;
  grantId: string;
  operation: SignedOperation;
}) {
  return {
    storageObjectId: upload.storageObjectId,
    grantId: upload.grantId,
    operation: upload.operation,
  };
}

export function presentFinalizedUpload(upload: {
  id: string;
  state: string;
  scanStatus: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  return {
    storageObjectId: upload.id,
    state: upload.state,
    scanStatus: upload.scanStatus,
    filename: upload.originalFilename,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    sha256: upload.sha256,
  };
}

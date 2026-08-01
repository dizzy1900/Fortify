import { getProductionDatabase } from "@/db/production/client";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { ProductionStorageService } from "@/lib/production/storage-service";

export function getProductionStorageService() {
  const storage = getProductionObjectStorage();
  const kmsKeyId = process.env.FORTIFY_STORAGE_KMS_KEY_ID?.trim();
  return new ProductionStorageService(
    getProductionDatabase(),
    storage,
    kmsKeyId ? { mode: "aws:kms", keyId: kmsKeyId } : { mode: "AES256" },
  );
}

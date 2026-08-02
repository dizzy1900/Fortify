import { S3CompatibleStorageAdapter } from "@/lib/production/object-storage";

let adapter: S3CompatibleStorageAdapter | undefined;

export function getProductionObjectStorage() {
  if (adapter) return adapter;
  const bucket = process.env.FORTIFY_STORAGE_BUCKET?.trim();
  const region = process.env.FORTIFY_STORAGE_REGION?.trim();
  if (!bucket || !region)
    throw new Error(
      "Production object storage requires FORTIFY_STORAGE_BUCKET and FORTIFY_STORAGE_REGION.",
    );
  const kmsKeyId = process.env.FORTIFY_STORAGE_KMS_KEY_ID?.trim();
  adapter = new S3CompatibleStorageAdapter({
    bucket,
    region,
    endpoint: process.env.FORTIFY_STORAGE_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.FORTIFY_STORAGE_FORCE_PATH_STYLE === "true",
    encryption: kmsKeyId
      ? { mode: "aws:kms", keyId: kmsKeyId }
      : { mode: "AES256" },
  });
  return adapter;
}

export function resetProductionObjectStorageForTests() {
  adapter = undefined;
}

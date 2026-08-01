import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";

export const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type EncryptionSettings =
  | { mode: "AES256" }
  | { mode: "aws:kms"; keyId: string };

export interface StoredObjectMetadata {
  key: string;
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  encryptionMode: "AES256" | "aws:kms";
}

export interface SignedOperation {
  url: string;
  expiresAt: string;
  requiredHeaders: Record<string, string>;
}

export interface ObjectStorageAdapter {
  readonly provider: string;
  readonly bucket: string;
  presignUpload(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    expiresInSeconds: number;
  }): Promise<SignedOperation>;
  presignDownload(input: {
    key: string;
    filename: string;
    expiresInSeconds: number;
  }): Promise<SignedOperation>;
  head(key: string): Promise<StoredObjectMetadata | undefined>;
  read(key: string): Promise<Uint8Array>;
  put(input: {
    key: string;
    body: Uint8Array;
    mimeType: string;
    sha256: string;
  }): Promise<void>;
  copy(sourceKey: string, destinationKey: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class StorageKeyError extends Error {
  constructor(message = "The object key is outside the active tenant prefix.") {
    super(message);
    this.name = "StorageKeyError";
  }
}

export function normalizeFilename(filename: string) {
  const leaf = filename.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const normalized = leaf
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
  return normalized || "evidence.bin";
}

export function assertTenantObjectKey(key: string, organizationId?: string) {
  if (
    key.startsWith("/") ||
    key.includes("\\") ||
    key.split("/").some((segment) => !segment || segment === "." || segment === "..") ||
    !key.startsWith("tenants/")
  )
    throw new StorageKeyError();
  if (organizationId && !key.startsWith(`tenants/${organizationId}/`))
    throw new StorageKeyError();
}

function sha256Hex(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

function checksumBase64(sha256: string) {
  if (!/^[a-f0-9]{64}$/.test(sha256))
    throw new Error("A lowercase hexadecimal SHA-256 checksum is required.");
  return Buffer.from(sha256, "hex").toString("base64");
}

type S3Sender = Pick<S3Client, "send">;
type UrlSigner = (
  client: S3Client,
  command: PutObjectCommand | GetObjectCommand,
  options: { expiresIn: number },
) => Promise<string>;

export class S3CompatibleStorageAdapter implements ObjectStorageAdapter {
  readonly provider = "s3-compatible";
  readonly bucket: string;
  private readonly client: S3Client;
  private readonly sender: S3Sender;
  private readonly signer: UrlSigner;

  constructor(input: {
    bucket: string;
    region: string;
    encryption: EncryptionSettings;
    endpoint?: string;
    forcePathStyle?: boolean;
    client?: S3Client;
    sender?: S3Sender;
    signer?: UrlSigner;
  }) {
    if (!input.bucket.trim() || !input.region.trim())
      throw new Error("Object storage bucket and region are required.");
    if (input.encryption.mode === "aws:kms" && !input.encryption.keyId.trim())
      throw new Error("KMS encryption requires an explicit key identifier.");
    this.bucket = input.bucket;
    this.encryption = input.encryption;
    const config: S3ClientConfig = {
      region: input.region,
      endpoint: input.endpoint,
      forcePathStyle: input.forcePathStyle,
    };
    this.client = input.client ?? new S3Client(config);
    this.sender = input.sender ?? this.client;
    this.signer = input.signer ?? getSignedUrl;
  }

  private readonly encryption: EncryptionSettings;

  private encryptionInput() {
    return this.encryption.mode === "aws:kms"
      ? {
          ServerSideEncryption: "aws:kms" as const,
          SSEKMSKeyId: this.encryption.keyId,
        }
      : { ServerSideEncryption: "AES256" as const };
  }

  async presignUpload(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    expiresInSeconds: number;
  }) {
    assertTenantObjectKey(input.key);
    const checksum = checksumBase64(input.sha256);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ContentType: input.mimeType,
      ContentLength: input.sizeBytes,
      ChecksumSHA256: checksum,
      Metadata: { sha256: input.sha256 },
      ...this.encryptionInput(),
    });
    return {
      url: await this.signer(this.client, command, {
        expiresIn: input.expiresInSeconds,
      }),
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      requiredHeaders: {
        "content-type": input.mimeType,
        "x-amz-checksum-sha256": checksum,
        "x-amz-meta-sha256": input.sha256,
        "x-amz-server-side-encryption": this.encryption.mode,
      },
    };
  }

  async presignDownload(input: {
    key: string;
    filename: string;
    expiresInSeconds: number;
  }) {
    assertTenantObjectKey(input.key);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      ResponseContentDisposition: `attachment; filename="${normalizeFilename(input.filename)}"`,
    });
    return {
      url: await this.signer(this.client, command, {
        expiresIn: input.expiresInSeconds,
      }),
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      requiredHeaders: {},
    };
  }

  async head(key: string) {
    assertTenantObjectKey(key);
    try {
      const result = await this.sender.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ChecksumMode: "ENABLED",
        }),
      );
      const checksum = result.ChecksumSHA256
        ? Buffer.from(result.ChecksumSHA256, "base64").toString("hex")
        : result.Metadata?.sha256;
      if (!checksum || !result.ContentType || result.ContentLength === undefined)
        throw new Error("Stored object metadata is incomplete.");
      return {
        key,
        sizeBytes: result.ContentLength,
        mimeType: result.ContentType,
        sha256: checksum,
        encryptionMode:
          result.ServerSideEncryption === "aws:kms" ? "aws:kms" : "AES256",
      } satisfies StoredObjectMetadata;
    } catch (error) {
      if ((error as { name?: string }).name === "NotFound") return undefined;
      throw error;
    }
  }

  async read(key: string) {
    assertTenantObjectKey(key);
    const result = await this.sender.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error("Stored object body is unavailable.");
    return result.Body.transformToByteArray();
  }

  async put(input: {
    key: string;
    body: Uint8Array;
    mimeType: string;
    sha256: string;
  }) {
    assertTenantObjectKey(input.key);
    if (sha256Hex(input.body) !== input.sha256)
      throw new Error("Object bytes do not match the declared checksum.");
    await this.sender.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
        ContentLength: input.body.byteLength,
        ChecksumSHA256: checksumBase64(input.sha256),
        Metadata: { sha256: input.sha256 },
        ...this.encryptionInput(),
      }),
    );
  }

  async copy(sourceKey: string, destinationKey: string) {
    assertTenantObjectKey(sourceKey);
    assertTenantObjectKey(destinationKey);
    await this.sender.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${encodeURIComponent(sourceKey).replaceAll("%2F", "/")}`,
        Key: destinationKey,
        MetadataDirective: "COPY",
        ...this.encryptionInput(),
      }),
    );
  }

  async delete(key: string) {
    assertTenantObjectKey(key);
    await this.sender.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

interface InMemoryObject extends StoredObjectMetadata {
  body: Uint8Array;
}

export class DeterministicObjectStorageAdapter implements ObjectStorageAdapter {
  readonly provider = "deterministic-test";
  readonly bucket = "fortify-test-private";
  private readonly objects = new Map<string, InMemoryObject>();
  private sequence = 0;

  constructor(private readonly encryption: EncryptionSettings = { mode: "AES256" }) {}

  async presignUpload(input: {
    key: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    expiresInSeconds: number;
  }) {
    assertTenantObjectKey(input.key);
    this.sequence += 1;
    return {
      url: `https://storage.example.test/upload/${this.sequence}?key=${encodeURIComponent(input.key)}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      requiredHeaders: {
        "content-type": input.mimeType,
        "x-fortify-size": String(input.sizeBytes),
        "x-fortify-sha256": input.sha256,
      },
    };
  }

  async presignDownload(input: {
    key: string;
    filename: string;
    expiresInSeconds: number;
  }) {
    assertTenantObjectKey(input.key);
    if (!this.objects.has(input.key)) throw new Error("Stored object not found.");
    this.sequence += 1;
    return {
      url: `https://storage.example.test/download/${this.sequence}?key=${encodeURIComponent(input.key)}&filename=${encodeURIComponent(normalizeFilename(input.filename))}`,
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
      requiredHeaders: {},
    };
  }

  async head(key: string) {
    assertTenantObjectKey(key);
    const value = this.objects.get(key);
    if (!value) return undefined;
    return {
      key: value.key,
      sizeBytes: value.sizeBytes,
      mimeType: value.mimeType,
      sha256: value.sha256,
      encryptionMode: value.encryptionMode,
    };
  }

  async read(key: string) {
    assertTenantObjectKey(key);
    const value = this.objects.get(key);
    if (!value) throw new Error("Stored object not found.");
    return new Uint8Array(value.body);
  }

  async put(input: {
    key: string;
    body: Uint8Array;
    mimeType: string;
    sha256: string;
  }) {
    assertTenantObjectKey(input.key);
    if (sha256Hex(input.body) !== input.sha256)
      throw new Error("Object bytes do not match the declared checksum.");
    this.objects.set(input.key, {
      key: input.key,
      body: new Uint8Array(input.body),
      sizeBytes: input.body.byteLength,
      mimeType: input.mimeType,
      sha256: input.sha256,
      encryptionMode: this.encryption.mode,
    });
  }

  async copy(sourceKey: string, destinationKey: string) {
    assertTenantObjectKey(sourceKey);
    assertTenantObjectKey(destinationKey);
    const source = this.objects.get(sourceKey);
    if (!source) throw new Error("Stored object not found.");
    this.objects.set(destinationKey, {
      ...source,
      key: destinationKey,
      body: new Uint8Array(source.body),
    });
  }

  async delete(key: string) {
    assertTenantObjectKey(key);
    this.objects.delete(key);
  }
}

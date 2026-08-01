import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  DeterministicObjectStorageAdapter,
  S3CompatibleStorageAdapter,
  StorageKeyError,
} from "@/lib/production/object-storage";
import {
  DeterministicMalwareScanner,
  ProductionStorageService,
  StorageDeletionBlockedError,
  StorageGrantError,
  StorageValidationError,
} from "@/lib/production/storage-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
let currentTime: Date;

const productionDatabase = () =>
  database as unknown as ProductionDatabaseLike;
const sha256 = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

describe("secure production object storage", () => {
  beforeEach(async () => {
    currentTime = new Date("2026-08-01T12:00:00.000Z");
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  test("quarantines exact uploads, promotes clean bytes, registers immutable evidence, and restores backup bytes", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "storage");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new ProductionStorageService(
      productionDatabase(),
      adapter,
      { mode: "AES256" },
      () => currentTime,
    );
    const body = new TextEncoder().encode("%PDF-1.4\nFortify evidence fixture\n%%EOF");
    const upload = await service.requestUpload(fixture.context, {
      filename: "../Board packet (final).pdf",
      mimeType: "application/pdf",
      sizeBytes: body.byteLength,
      sha256: sha256(body),
    });
    expect(upload.objectKey).toMatch(
      new RegExp(`^tenants/${fixture.organizationId}/quarantine/`),
    );
    expect(upload.objectKey).toContain("Board-packet-final-.pdf");
    await adapter.put({
      key: upload.objectKey,
      body,
      mimeType: "application/pdf",
      sha256: sha256(body),
    });
    const quarantined = await service.finalizeUpload(
      fixture.context,
      upload.storageObjectId,
      upload.grantId,
    );
    expect(quarantined.state).toBe("quarantined");
    const scan = await service.scanAndPromote(
      fixture.context,
      upload.storageObjectId,
      new DeterministicMalwareScanner("clean"),
    );
    expect(scan.object).toMatchObject({ state: "clean", scanStatus: "clean" });
    expect(scan.object.objectKey).toContain(
      `tenants/${fixture.organizationId}/objects/`,
    );

    const version = await service.createEvidenceVersion(fixture.context, {
      storageObjectId: upload.storageObjectId,
      propertyId: fixture.propertyId,
      evidenceType: "roof-documentation",
      sourceType: "broker-upload",
      scopeType: "property",
    });
    expect(version).toMatchObject({
      sha256: sha256(body),
      reviewStatus: "unreviewed",
      storageKey: scan.object.objectKey,
    });
    await expect(
      database
        .update(schema.evidenceVersions)
        .set({ reviewStatus: "confirmed" })
        .where(eq(schema.evidenceVersions.id, version.id)),
    ).rejects.toThrow();

    const backup = await service.createBackup(fixture.context);
    expect(backup.items).toHaveLength(1);
    const restored = await service.readBackupObject(
      fixture.context,
      backup.manifestId,
      upload.storageObjectId,
    );
    expect(Buffer.from(restored)).toEqual(Buffer.from(body));
    await expect(
      database
        .update(schema.backupManifestItems)
        .set({ sha256: "0".repeat(64) })
        .where(
          eq(schema.backupManifestItems.backupManifestId, backup.manifestId),
        ),
    ).rejects.toThrow();
  });

  test("rejects traversal, cross-tenant finalization, metadata mismatch, infected content, and MIME spoofing", async () => {
    const alpha = await createTenantFixture(productionDatabase(), "alpha-storage");
    const beta = await createTenantFixture(productionDatabase(), "beta-storage");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new ProductionStorageService(
      productionDatabase(),
      adapter,
      { mode: "AES256" },
      () => currentTime,
    );
    const body = new TextEncoder().encode("%PDF-1.4\nclean bytes");
    await expect(
      adapter.put({
        key: `tenants/${alpha.organizationId}/../escape.pdf`,
        body,
        mimeType: "application/pdf",
        sha256: sha256(body),
      }),
    ).rejects.toBeInstanceOf(StorageKeyError);

    const upload = await service.requestUpload(alpha.context, {
      filename: "evidence.pdf",
      mimeType: "application/pdf",
      sizeBytes: body.byteLength,
      sha256: sha256(body),
    });
    await adapter.put({
      key: upload.objectKey,
      body,
      mimeType: "application/pdf",
      sha256: sha256(body),
    });
    await expect(
      service.finalizeUpload(
        beta.context,
        upload.storageObjectId,
        upload.grantId,
      ),
    ).rejects.toThrow(/not found/i);

    const mismatched = await service.requestUpload(alpha.context, {
      filename: "mismatch.pdf",
      mimeType: "application/pdf",
      sizeBytes: body.byteLength + 1,
      sha256: sha256(body),
    });
    await adapter.put({
      key: mismatched.objectKey,
      body,
      mimeType: "application/pdf",
      sha256: sha256(body),
    });
    await expect(
      service.finalizeUpload(
        alpha.context,
        mismatched.storageObjectId,
        mismatched.grantId,
      ),
    ).rejects.toBeInstanceOf(StorageValidationError);

    await service.finalizeUpload(
      alpha.context,
      upload.storageObjectId,
      upload.grantId,
    );
    const infected = await service.scanAndPromote(
      alpha.context,
      upload.storageObjectId,
      new DeterministicMalwareScanner("infected"),
    );
    expect(infected.object).toMatchObject({
      state: "rejected",
      scanStatus: "infected",
    });

    const spoofedBody = new TextEncoder().encode("not actually a pdf");
    const spoofed = await service.requestUpload(alpha.context, {
      filename: "spoofed.pdf",
      mimeType: "application/pdf",
      sizeBytes: spoofedBody.byteLength,
      sha256: sha256(spoofedBody),
    });
    await adapter.put({
      key: spoofed.objectKey,
      body: spoofedBody,
      mimeType: "application/pdf",
      sha256: sha256(spoofedBody),
    });
    await service.finalizeUpload(
      alpha.context,
      spoofed.storageObjectId,
      spoofed.grantId,
    );
    const spoofedScan = await service.scanAndPromote(
      alpha.context,
      spoofed.storageObjectId,
      new DeterministicMalwareScanner("clean"),
    );
    expect(spoofedScan.object).toMatchObject({
      state: "rejected",
      scanStatus: "error",
    });
    expect(spoofedScan.result.findings).toContain(
      "content-signature-does-not-match-declared-mime",
    );
  });

  test("enforces signed grant revocation, expiry, one-time use, retention, and legal hold", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "controls");
    const adapter = new DeterministicObjectStorageAdapter();
    const service = new ProductionStorageService(
      productionDatabase(),
      adapter,
      { mode: "AES256" },
      () => currentTime,
    );
    const body = new TextEncoder().encode("%PDF-1.4\ncontrols");
    const upload = await service.requestUpload(fixture.context, {
      filename: "controls.pdf",
      mimeType: "application/pdf",
      sizeBytes: body.byteLength,
      sha256: sha256(body),
      retentionUntil: "2026-08-02T12:00:00.000Z",
    });
    await adapter.put({ key: upload.objectKey, body, mimeType: "application/pdf", sha256: sha256(body) });
    await service.finalizeUpload(fixture.context, upload.storageObjectId, upload.grantId);
    await service.scanAndPromote(
      fixture.context,
      upload.storageObjectId,
      new DeterministicMalwareScanner(),
    );

    const revoked = await service.issueDownloadGrant(
      fixture.context,
      upload.storageObjectId,
      { purpose: "review" },
    );
    await service.revokeGrant(fixture.context, revoked.grantId, "review cancelled");
    await expect(
      service.redeemDownloadGrant(fixture.context, revoked.grantId),
    ).rejects.toBeInstanceOf(StorageGrantError);

    const expired = await service.issueDownloadGrant(
      fixture.context,
      upload.storageObjectId,
      { purpose: "review", ttlSeconds: 15 },
    );
    currentTime = new Date("2026-08-01T12:00:16.000Z");
    await expect(
      service.redeemDownloadGrant(fixture.context, expired.grantId),
    ).rejects.toBeInstanceOf(StorageGrantError);

    const active = await service.issueDownloadGrant(
      fixture.context,
      upload.storageObjectId,
      { purpose: "authorized review" },
    );
    const signed = await service.redeemDownloadGrant(
      fixture.context,
      active.grantId,
    );
    expect(signed.url).toContain("storage.example.test/download");
    await expect(
      service.redeemDownloadGrant(fixture.context, active.grantId),
    ).rejects.toBeInstanceOf(StorageGrantError);
    await expect(
      service.deleteObject(fixture.context, upload.storageObjectId, "requested"),
    ).rejects.toBeInstanceOf(StorageDeletionBlockedError);

    currentTime = new Date("2026-08-03T12:00:00.000Z");
    await service.setLegalHold(
      fixture.context,
      upload.storageObjectId,
      "Customer-approved preservation",
    );
    await expect(
      service.deleteObject(fixture.context, upload.storageObjectId, "requested"),
    ).rejects.toBeInstanceOf(StorageDeletionBlockedError);
  });
});

describe("S3-compatible adapter contract", () => {
  test("binds checksums, encryption, private bucket keys, and short expiries into signed commands", async () => {
    const signedCommands: Array<PutObjectCommand | GetObjectCommand> = [];
    const sentCommands: unknown[] = [];
    const client = new S3Client({ region: "us-west-2" });
    const adapter = new S3CompatibleStorageAdapter({
      bucket: "private-evidence",
      region: "us-west-2",
      encryption: { mode: "aws:kms", keyId: "alias/fortify-evidence" },
      client,
      sender: {
        send: async (command: unknown) => {
          sentCommands.push(command);
          return {};
        },
      } as unknown as Pick<S3Client, "send">,
      signer: async (_client, command, options) => {
        signedCommands.push(command);
        return `https://signed.example.test/${options.expiresIn}`;
      },
    });
    const checksum = "a".repeat(64);
    const upload = await adapter.presignUpload({
      key: "tenants/org-alpha/quarantine/object/evidence.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128,
      sha256: checksum,
      expiresInSeconds: 120,
    });
    expect(upload.url).toBe("https://signed.example.test/120");
    const put = signedCommands[0] as PutObjectCommand;
    expect(put.input).toMatchObject({
      Bucket: "private-evidence",
      Key: "tenants/org-alpha/quarantine/object/evidence.pdf",
      ContentType: "application/pdf",
      ContentLength: 128,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: "alias/fortify-evidence",
      ChecksumSHA256: Buffer.from(checksum, "hex").toString("base64"),
    });
    await adapter.presignDownload({
      key: "tenants/org-alpha/objects/object/evidence.pdf",
      filename: "evidence.pdf",
      expiresInSeconds: 45,
    });
    expect(signedCommands[1]).toBeInstanceOf(GetObjectCommand);
    expect(sentCommands).toHaveLength(0);
  });
});

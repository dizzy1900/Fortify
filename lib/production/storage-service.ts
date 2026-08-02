import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_BYTES,
  assertTenantObjectKey,
  normalizeFilename,
  type EncryptionSettings,
  type ObjectStorageAdapter,
} from "@/lib/production/object-storage";
import {
  appendAudit,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export interface MalwareScanner {
  readonly name: string;
  readonly engineVersion: string;
  scan(input: {
    body: Uint8Array;
    filename: string;
    mimeType: string;
  }): Promise<{ status: "clean" | "infected" | "error"; findings: string[] }>;
}

export class DeterministicMalwareScanner implements MalwareScanner {
  readonly name = "fortify-deterministic-fixture";
  readonly engineVersion = "fixture-1";

  constructor(private readonly result: "clean" | "infected" | "error" = "clean") {}

  async scan() {
    return {
      status: this.result,
      findings:
        this.result === "clean"
          ? []
          : [
              this.result === "infected"
                ? "deterministic-fixture-signature"
                : "deterministic-fixture-scanner-error",
            ],
    };
  }
}

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

export class StorageGrantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageGrantError";
  }
}

export class StorageDeletionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageDeletionBlockedError";
  }
}

function digest(body: Uint8Array) {
  return createHash("sha256").update(body).digest("hex");
}

function iso(now: Date) {
  return now.toISOString();
}

function validateDeclaredUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}) {
  if (!input.filename.trim()) throw new StorageValidationError("A filename is required.");
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(input.mimeType))
    throw new StorageValidationError("The declared MIME type is not allowed.");
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0)
    throw new StorageValidationError("The declared file size must be positive.");
  if (input.sizeBytes > MAX_EVIDENCE_BYTES)
    throw new StorageValidationError("The file exceeds the 25 MiB evidence limit.");
  if (!/^[a-f0-9]{64}$/.test(input.sha256))
    throw new StorageValidationError("A lowercase hexadecimal SHA-256 checksum is required.");
}

function bytesMatchMime(body: Uint8Array, mimeType: string) {
  if (mimeType === "application/pdf")
    return Buffer.from(body.subarray(0, 5)).toString("ascii") === "%PDF-";
  if (mimeType === "image/png")
    return Buffer.from(body.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
  if (mimeType === "image/jpeg")
    return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return body[0] === 0x50 && body[1] === 0x4b;
  if (mimeType === "text/csv" || mimeType === "text/plain")
    return !Buffer.from(body.subarray(0, 1024)).includes(0);
  return false;
}

export class ProductionStorageService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly encryption: EncryptionSettings,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async requestUpload(
    context: TenantContext,
    input: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      sha256: string;
      retentionUntil?: string;
      expiresInSeconds?: number;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "storage_object",
      resourceOrganizationId: context.organizationId,
    });
    validateDeclaredUpload(input);
    const now = this.clock();
    const expiresInSeconds = Math.min(Math.max(input.expiresInSeconds ?? 300, 30), 900);
    const objectId = randomUUID();
    const grantId = randomUUID();
    const filename = normalizeFilename(input.filename);
    const objectKey = `tenants/${context.organizationId}/quarantine/${objectId}/${filename}`;
    assertTenantObjectKey(objectKey, context.organizationId);
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();
    const at = iso(now);

    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.storageObjects).values({
        id: objectId,
        ...tenantRecord(context, at),
        provider: this.storage.provider,
        bucket: this.storage.bucket,
        objectKey,
        originalFilename: filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
        checksumAlgorithm: "sha256",
        encryptionMode: this.encryption.mode,
        encryptionKeyId:
          this.encryption.mode === "aws:kms" ? this.encryption.keyId : undefined,
        state: "pending_upload",
        scanStatus: "pending",
        retentionUntil: input.retentionUntil,
      });
      await transaction.insert(schema.storageAccessGrants).values({
        id: grantId,
        ...tenantRecord(context, at),
        storageObjectId: objectId,
        operation: "upload",
        purpose: "quarantine-upload",
        principalSubject: context.actorSubject,
        expiresAt,
        maxUses: 1,
        useCount: 0,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.upload_requested",
        resourceType: "storage_object",
        resourceId: objectId,
        detail: { objectKey, mimeType: input.mimeType, sizeBytes: input.sizeBytes, grantId },
        occurredAt: at,
      });
    });

    return {
      storageObjectId: objectId,
      grantId,
      objectKey,
      operation: await this.storage.presignUpload({
        key: objectKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
        expiresInSeconds,
      }),
    };
  }

  async finalizeUpload(context: TenantContext, storageObjectId: string, grantId: string) {
    assertAuthorized(context, {
      action: "update",
      resource: "storage_object",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const object = rows[0];
    if (!object) throw new TenantResourceNotFoundError("Storage object");
    if (object.state !== "pending_upload")
      throw new StorageValidationError("Only pending uploads can be finalized.");
    assertTenantObjectKey(object.objectKey, context.organizationId);
    const metadata = await this.storage.head(object.objectKey);
    if (!metadata)
      throw new StorageValidationError("The uploaded object is not present in private storage.");
    if (
      metadata.sizeBytes !== object.sizeBytes ||
      metadata.mimeType !== object.mimeType ||
      metadata.sha256 !== object.sha256 ||
      metadata.encryptionMode !== object.encryptionMode
    )
      throw new StorageValidationError(
        "Uploaded object metadata does not match the authorized size, MIME type, checksum, and encryption settings.",
      );
    const at = iso(this.clock());
    return this.database.transaction(async (transaction) => {
      const grants = await transaction
        .select()
        .from(schema.storageAccessGrants)
        .where(
          and(
            eq(schema.storageAccessGrants.id, grantId),
            eq(schema.storageAccessGrants.organizationId, context.organizationId),
            eq(schema.storageAccessGrants.storageObjectId, storageObjectId),
          ),
        )
        .limit(1);
      const grant = grants[0];
      if (
        !grant ||
        grant.operation !== "upload" ||
        grant.principalSubject !== context.actorSubject ||
        grant.revokedAt ||
        grant.useCount >= grant.maxUses ||
        new Date(grant.expiresAt).getTime() <= this.clock().getTime()
      )
        throw new StorageGrantError("The upload grant is expired, revoked, exhausted, or out of scope.");
      await transaction
        .update(schema.storageAccessGrants)
        .set({ usedAt: at, useCount: grant.useCount + 1, updatedAt: at, updatedBy: context.actorSubject, revision: grant.revision + 1 })
        .where(eq(schema.storageAccessGrants.id, grantId));
      const updated = await transaction
        .update(schema.storageObjects)
        .set({ state: "quarantined", updatedAt: at, updatedBy: context.actorSubject, revision: object.revision + 1 })
        .where(
          and(
            eq(schema.storageObjects.id, storageObjectId),
            eq(schema.storageObjects.organizationId, context.organizationId),
          ),
        )
        .returning();
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.upload_quarantined",
        resourceType: "storage_object",
        resourceId: storageObjectId,
        detail: { grantId, sha256: object.sha256 },
        occurredAt: at,
      });
      return updated[0];
    });
  }

  async scanAndPromote(context: TenantContext, storageObjectId: string, scanner: MalwareScanner) {
    assertAuthorized(context, {
      action: "update",
      resource: "malware_scan_result",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const object = rows[0];
    if (!object) throw new TenantResourceNotFoundError("Storage object");
    if (object.state !== "quarantined")
      throw new StorageValidationError("Only quarantined objects can be scanned.");
    assertTenantObjectKey(object.objectKey, context.organizationId);
    const body = await this.storage.read(object.objectKey);
    const exactBytes =
      body.byteLength === object.sizeBytes && digest(body) === object.sha256;
    const contentMatches = exactBytes && bytesMatchMime(body, object.mimeType);
    const result = contentMatches
      ? await scanner.scan({
          body,
          filename: object.originalFilename,
          mimeType: object.mimeType,
        })
      : {
          status: "error" as const,
          findings: [
            exactBytes
              ? "content-signature-does-not-match-declared-mime"
              : "stored-bytes-do-not-match-authorized-size-or-checksum",
          ],
        };
    const at = iso(this.clock());
    const cleanKey = `tenants/${context.organizationId}/objects/${storageObjectId}/${object.originalFilename}`;
    if (result.status === "clean")
      await this.storage.copy(object.objectKey, cleanKey);

    return this.database.transaction(async (transaction) => {
      const scanId = randomUUID();
      await transaction.insert(schema.malwareScanResults).values({
        id: scanId,
        ...tenantRecord(context, at),
        storageObjectId,
        scanner: scanner.name,
        engineVersion: scanner.engineVersion,
        status: result.status,
        findings: result.findings,
        scannedAt: at,
      });
      const updated = await transaction
        .update(schema.storageObjects)
        .set({
          objectKey: result.status === "clean" ? cleanKey : object.objectKey,
          state: result.status === "clean" ? "clean" : "rejected",
          scanStatus: result.status,
          updatedAt: at,
          updatedBy: context.actorSubject,
          revision: object.revision + 1,
        })
        .where(
          and(
            eq(schema.storageObjects.id, storageObjectId),
            eq(schema.storageObjects.organizationId, context.organizationId),
          ),
        )
        .returning();
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action:
          result.status === "clean"
            ? "storage.scan_clean"
            : "storage.scan_rejected",
        resourceType: "storage_object",
        resourceId: storageObjectId,
        detail: { scanId, scanner: scanner.name, status: result.status, findings: result.findings },
        occurredAt: at,
      });
      return { object: updated[0], scanId, result };
    });
  }

  async createEvidenceVersion(
    context: TenantContext,
    input: {
      storageObjectId: string;
      propertyId: string;
      evidenceType: string;
      sourceType: string;
      scopeType: string;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "evidence_version",
      resourceOrganizationId: context.organizationId,
    });
    const objects = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, input.storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const object = objects[0];
    if (!object || object.state !== "clean" || object.scanStatus !== "clean")
      throw new StorageValidationError("Evidence versions require a clean scanned object.");
    const at = iso(this.clock());
    const evidenceItemId = randomUUID();
    const evidenceVersionId = randomUUID();
    return this.database.transaction(async (transaction) => {
      const properties = await transaction
        .select({ id: schema.properties.id })
        .from(schema.properties)
        .where(
          and(
            eq(schema.properties.id, input.propertyId),
            eq(schema.properties.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!properties[0]) throw new TenantResourceNotFoundError("Property");
      await transaction.insert(schema.evidenceItems).values({
        id: evidenceItemId,
        ...tenantRecord(context, at),
        propertyId: input.propertyId,
        evidenceType: input.evidenceType,
        currentVersionId: evidenceVersionId,
      });
      const versions = await transaction
        .insert(schema.evidenceVersions)
        .values({
          id: evidenceVersionId,
          ...tenantRecord(context, at),
          evidenceItemId,
          versionNumber: 1,
          filename: object.originalFilename,
          mimeType: object.mimeType,
          sizeBytes: object.sizeBytes,
          sha256: object.sha256,
          storageKey: object.objectKey,
          sourceType: input.sourceType,
          receivedAt: at,
          scopeType: input.scopeType,
          reviewStatus: "unreviewed",
        })
        .returning();
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "evidence.version_created_from_clean_object",
        resourceType: "evidence_version",
        resourceId: evidenceVersionId,
        detail: { storageObjectId: input.storageObjectId, sha256: object.sha256 },
        occurredAt: at,
      });
      return versions[0];
    });
  }

  async issueDownloadGrant(
    context: TenantContext,
    storageObjectId: string,
    input: { purpose: string; ttlSeconds?: number },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "storage_access_grant",
      resourceOrganizationId: context.organizationId,
    });
    const objects = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!objects[0] || objects[0].state !== "clean")
      throw new StorageValidationError("Only clean objects can be downloaded.");
    const now = this.clock();
    const ttlSeconds = Math.min(Math.max(input.ttlSeconds ?? 60, 15), 300);
    const grantId = randomUUID();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.storageAccessGrants).values({
        id: grantId,
        ...tenantRecord(context, iso(now)),
        storageObjectId,
        operation: "download",
        purpose: input.purpose,
        principalSubject: context.actorSubject,
        expiresAt,
        maxUses: 1,
        useCount: 0,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.download_grant_issued",
        resourceType: "storage_access_grant",
        resourceId: grantId,
        detail: { storageObjectId, purpose: input.purpose, expiresAt },
        occurredAt: iso(now),
      });
    });
    return { grantId, expiresAt };
  }

  async redeemDownloadGrant(context: TenantContext, grantId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "storage_object",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select({ grant: schema.storageAccessGrants, object: schema.storageObjects })
      .from(schema.storageAccessGrants)
      .innerJoin(
        schema.storageObjects,
        eq(schema.storageAccessGrants.storageObjectId, schema.storageObjects.id),
      )
      .where(
        and(
          eq(schema.storageAccessGrants.id, grantId),
          eq(schema.storageAccessGrants.organizationId, context.organizationId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const row = rows[0];
    const now = this.clock();
    if (
      !row ||
      row.grant.operation !== "download" ||
      row.grant.principalSubject !== context.actorSubject ||
      row.grant.revokedAt ||
      row.grant.useCount >= row.grant.maxUses ||
      new Date(row.grant.expiresAt).getTime() <= now.getTime() ||
      row.object.state !== "clean"
    )
      throw new StorageGrantError("The download grant is expired, revoked, exhausted, or out of scope.");
    assertTenantObjectKey(row.object.objectKey, context.organizationId);
    const remainingSeconds = Math.max(
      1,
      Math.min(60, Math.floor((new Date(row.grant.expiresAt).getTime() - now.getTime()) / 1000)),
    );
    const operation = await this.storage.presignDownload({
      key: row.object.objectKey,
      filename: row.object.originalFilename,
      expiresInSeconds: remainingSeconds,
    });
    const at = iso(now);
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(schema.storageAccessGrants)
        .set({ usedAt: at, useCount: row.grant.useCount + 1, updatedAt: at, updatedBy: context.actorSubject, revision: row.grant.revision + 1 })
        .where(eq(schema.storageAccessGrants.id, grantId));
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.download_redeemed",
        resourceType: "storage_access_grant",
        resourceId: grantId,
        detail: { storageObjectId: row.object.id, expiresInSeconds: remainingSeconds },
        occurredAt: at,
      });
    });
    return operation;
  }

  async revokeGrant(context: TenantContext, grantId: string, reason: string) {
    assertAuthorized(context, {
      action: "update",
      resource: "storage_access_grant",
      resourceOrganizationId: context.organizationId,
    });
    const at = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(schema.storageAccessGrants)
        .set({ revokedAt: at, lifecycleStatus: "archived", updatedAt: at, updatedBy: context.actorSubject })
        .where(
          and(
            eq(schema.storageAccessGrants.id, grantId),
            eq(schema.storageAccessGrants.organizationId, context.organizationId),
          ),
        )
        .returning();
      if (!updated[0]) throw new TenantResourceNotFoundError("Storage grant");
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.grant_revoked",
        resourceType: "storage_access_grant",
        resourceId: grantId,
        detail: { reason },
        occurredAt: at,
      });
    });
  }

  async setLegalHold(context: TenantContext, storageObjectId: string, reason: string) {
    assertAuthorized(context, {
      action: "manage",
      resource: "storage_object",
      resourceOrganizationId: context.organizationId,
    });
    if (!reason.trim()) throw new StorageValidationError("A legal-hold reason is required.");
    const at = iso(this.clock());
    return this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(schema.storageObjects)
        .set({ legalHold: true, legalHoldReason: reason, lifecycleStatus: "legal_hold", updatedAt: at, updatedBy: context.actorSubject })
        .where(
          and(
            eq(schema.storageObjects.id, storageObjectId),
            eq(schema.storageObjects.organizationId, context.organizationId),
          ),
        )
        .returning();
      if (!updated[0]) throw new TenantResourceNotFoundError("Storage object");
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.legal_hold_set",
        resourceType: "storage_object",
        resourceId: storageObjectId,
        detail: { reason },
        occurredAt: at,
      });
      return updated[0];
    });
  }

  async deleteObject(context: TenantContext, storageObjectId: string, reason: string) {
    assertAuthorized(context, {
      action: "delete",
      resource: "storage_object",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.id, storageObjectId),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const object = rows[0];
    if (!object) throw new TenantResourceNotFoundError("Storage object");
    if (object.legalHold)
      throw new StorageDeletionBlockedError("Deletion is blocked by an active legal hold.");
    if (object.retentionUntil && new Date(object.retentionUntil).getTime() > this.clock().getTime())
      throw new StorageDeletionBlockedError("Deletion is blocked by the retention period.");
    const pendingAt = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(schema.storageObjects)
        .set({ state: "pending_deletion", lifecycleStatus: "pending_deletion", updatedAt: pendingAt, updatedBy: context.actorSubject })
        .where(eq(schema.storageObjects.id, storageObjectId));
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.deletion_requested",
        resourceType: "storage_object",
        resourceId: storageObjectId,
        detail: { reason },
        occurredAt: pendingAt,
      });
    });
    await this.storage.delete(object.objectKey);
    const deletedAt = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(schema.storageObjects)
        .set({ state: "deleted", lifecycleStatus: "deleted", deletedAt, deletedReason: reason, updatedAt: deletedAt, updatedBy: context.actorSubject })
        .where(eq(schema.storageObjects.id, storageObjectId));
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.object_deleted",
        resourceType: "storage_object",
        resourceId: storageObjectId,
        detail: { reason },
        occurredAt: deletedAt,
      });
    });
  }

  async createBackup(context: TenantContext) {
    assertAuthorized(context, {
      action: "create",
      resource: "backup_manifest",
      resourceOrganizationId: context.organizationId,
    });
    const objects = await this.database
      .select()
      .from(schema.storageObjects)
      .where(
        and(
          eq(schema.storageObjects.organizationId, context.organizationId),
          eq(schema.storageObjects.state, "clean"),
        ),
      );
    const manifestId = randomUUID();
    const at = iso(this.clock());
    const items: Array<{ object: (typeof objects)[number]; backupKey: string }> = [];
    for (const object of objects) {
      assertTenantObjectKey(object.objectKey, context.organizationId);
      const backupKey = `tenants/${context.organizationId}/backups/${manifestId}/${object.id}/${object.originalFilename}`;
      await this.storage.copy(object.objectKey, backupKey);
      const restored = await this.storage.read(backupKey);
      if (restored.byteLength !== object.sizeBytes || digest(restored) !== object.sha256)
        throw new StorageValidationError("Backup readback did not match the source object.");
      items.push({ object, backupKey });
    }
    const manifestPayload = items.map(({ object, backupKey }) => ({
      storageObjectId: object.id,
      sourceKey: object.objectKey,
      backupKey,
      sha256: object.sha256,
      sizeBytes: object.sizeBytes,
    }));
    const manifestHash = createHash("sha256")
      .update(JSON.stringify(manifestPayload))
      .digest("hex");
    await this.database.transaction(async (transaction) => {
      await transaction.insert(schema.backupManifests).values({
        id: manifestId,
        ...tenantRecord(context, at),
        provider: this.storage.provider,
        status: "complete",
        objectCount: items.length,
        totalBytes: items.reduce((sum, item) => sum + item.object.sizeBytes, 0),
        manifestHash,
        completedAt: at,
      });
      for (const { object, backupKey } of items)
        await transaction.insert(schema.backupManifestItems).values({
          id: randomUUID(),
          ...tenantRecord(context, at),
          backupManifestId: manifestId,
          storageObjectId: object.id,
          sourceKey: object.objectKey,
          backupKey,
          sha256: object.sha256,
          sizeBytes: object.sizeBytes,
        });
      await transaction
        .update(schema.storageObjects)
        .set({ backedUpAt: at, updatedAt: at, updatedBy: context.actorSubject })
        .where(
          and(
            eq(schema.storageObjects.organizationId, context.organizationId),
            eq(schema.storageObjects.state, "clean"),
          ),
        );
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "storage.backup_completed",
        resourceType: "backup_manifest",
        resourceId: manifestId,
        detail: { objectCount: items.length, manifestHash },
        occurredAt: at,
      });
    });
    return { manifestId, manifestHash, items: manifestPayload };
  }

  async readBackupObject(context: TenantContext, manifestId: string, storageObjectId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "backup_manifest_item",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select()
      .from(schema.backupManifestItems)
      .where(
        and(
          eq(schema.backupManifestItems.organizationId, context.organizationId),
          eq(schema.backupManifestItems.backupManifestId, manifestId),
          eq(schema.backupManifestItems.storageObjectId, storageObjectId),
        ),
      )
      .limit(1);
    const item = rows[0];
    if (!item) throw new TenantResourceNotFoundError("Backup manifest item");
    assertTenantObjectKey(item.backupKey, context.organizationId);
    const body = await this.storage.read(item.backupKey);
    if (body.byteLength !== item.sizeBytes || digest(body) !== item.sha256)
      throw new StorageValidationError("Restored bytes do not match the immutable backup manifest.");
    return body;
  }
}

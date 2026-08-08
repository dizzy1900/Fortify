import { and, desc, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  type IntegrationCredentialResolver,
  type IntegrationDirection,
  type IntegrationProvider,
  IntegrationProviderError,
  type IntegrationProviderType,
  type IntegrationRecord,
  verifyIntegrationWebhook,
} from "@/lib/production/integration-providers";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  appendAudit,
  digest,
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export class IntegrationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationValidationError";
  }
}

export class IntegrationStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationStateError";
  }
}

const required = (value: string, label: string) => {
  const normalized = value.trim();
  if (!normalized) throw new IntegrationValidationError(`${label} is required.`);
  return normalized;
};

const sha256 = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

const human = (context: TenantContext, confirmed: boolean, action: string) => {
  if (context.principalType !== "membership" || !confirmed)
    throw new IntegrationStateError(
      `${action} requires explicit confirmation by a human organization member.`,
    );
};

const containsSecretKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsSecretKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) =>
      /(secret|password|token|api.?key|private.?key|credential)/i.test(key) ||
      containsSecretKey(nested),
  );
};

type ConnectionStatus =
  | "disconnected"
  | "configured"
  | "connected"
  | "degraded"
  | "disabled";

export class IntegrationService {
  private readonly providers = new Map<string, IntegrationProvider>();

  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    providers: IntegrationProvider[],
    private readonly credentialResolver: IntegrationCredentialResolver,
    private readonly clock: () => Date = () => new Date(),
  ) {
    for (const provider of providers) {
      const key = this.providerMapKey(
        provider.type,
        provider.key,
        provider.version,
      );
      if (this.providers.has(key))
        throw new Error(`Duplicate integration provider registration: ${key}`);
      this.providers.set(key, provider);
    }
  }

  private providerMapKey(type: string, key: string, version: string) {
    return `${type}:${key}:${version}`;
  }

  private providerFor(connection: typeof schema.integrationConnections.$inferSelect) {
    const provider = this.providers.get(
      this.providerMapKey(
        connection.providerType,
        connection.providerKey,
        connection.providerVersion,
      ),
    );
    if (!provider)
      throw new IntegrationStateError(
        "The pinned provider implementation is unavailable; no synchronization ran.",
      );
    if (
      (connection.connectionMode === "deterministic_fixture") !== provider.fixture
    )
      throw new IntegrationStateError(
        "The configured connection mode does not match the pinned provider implementation.",
      );
    return provider;
  }

  private async connection(
    organizationId: string,
    connectionId: string,
  ) {
    const rows = await this.database
      .select()
      .from(schema.integrationConnections)
      .where(
        and(
          eq(schema.integrationConnections.organizationId, organizationId),
          eq(schema.integrationConnections.id, connectionId),
        ),
      )
      .limit(1);
    if (!rows[0])
      throw new IntegrationStateError(
        "Integration connection was not found in the active tenant.",
      );
    return rows[0];
  }

  private async credentialFor(
    connection: typeof schema.integrationConnections.$inferSelect,
  ) {
    if (connection.connectionMode === "deterministic_fixture") return undefined;
    if (!connection.apiCredentialId)
      throw new IntegrationStateError(
        "A live connection requires a scoped credential reference.",
      );
    const rows = await this.database
      .select({ credential: schema.apiCredentials, account: schema.serviceAccounts })
      .from(schema.apiCredentials)
      .innerJoin(
        schema.serviceAccounts,
        eq(schema.serviceAccounts.id, schema.apiCredentials.serviceAccountId),
      )
      .where(
        and(
          eq(schema.apiCredentials.id, connection.apiCredentialId),
          eq(
            schema.apiCredentials.organizationId,
            connection.organizationId,
          ),
          eq(
            schema.serviceAccounts.organizationId,
            connection.organizationId,
          ),
        ),
      )
      .limit(1);
    const row = rows[0];
    const at = this.clock().getTime();
    if (
      !row ||
      row.credential.revokedAt ||
      row.account.revokedAt ||
      row.account.status !== "active" ||
      (row.credential.expiresAt && Date.parse(row.credential.expiresAt) <= at) ||
      (row.account.expiresAt && Date.parse(row.account.expiresAt) <= at)
    )
      throw new IntegrationStateError(
        "The live provider credential is unavailable, expired, or revoked.",
      );
    return this.credentialResolver.resolve({
      organizationId: connection.organizationId,
      credentialId: row.credential.id,
      providerType: connection.providerType as IntegrationProviderType,
    });
  }

  async configureConnection(
    context: TenantContext,
    input: {
      canonicalKey: string;
      name: string;
      providerType: IntegrationProviderType;
      providerKey: string;
      providerVersion: string;
      connectionMode: "deterministic_fixture" | "live";
      apiCredentialId?: string;
      configuration: Record<string, unknown>;
      capabilities: IntegrationDirection[];
      dataClasses: string[];
      pageSize: number;
      rateLimitPerMinute: number;
      humanConfirmed: boolean;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "integration_connection",
      resourceOrganizationId: context.organizationId,
    });
    human(context, input.humanConfirmed, "Integration configuration");
    if (containsSecretKey(input.configuration))
      throw new IntegrationValidationError(
        "Connection configuration cannot contain inline secrets, tokens, passwords, API keys, or credential material.",
      );
    if (!input.capabilities.length || !input.dataClasses.length)
      throw new IntegrationValidationError(
        "At least one capability and governed data class are required.",
      );
    const provider = this.providers.get(
      this.providerMapKey(
        input.providerType,
        required(input.providerKey, "Provider key"),
        required(input.providerVersion, "Provider version"),
      ),
    );
    if (!provider)
      throw new IntegrationStateError(
        "The exact provider key and version are not registered in this runtime.",
      );
    if (
      (input.connectionMode === "deterministic_fixture") !== provider.fixture
    )
      throw new IntegrationStateError(
        "Fixture and live provider modes cannot be interchanged.",
      );
    if (input.capabilities.some((item) => !provider.capabilities.includes(item)))
      throw new IntegrationValidationError(
        "The requested capability is not supported by the pinned provider.",
      );
    if (input.connectionMode === "live" && !input.apiCredentialId)
      throw new IntegrationValidationError(
        "A live connection requires a scoped API credential reference.",
      );
    if (input.apiCredentialId) {
      const credential = await this.database
        .select()
        .from(schema.apiCredentials)
        .where(
          and(
            eq(schema.apiCredentials.id, input.apiCredentialId),
            eq(schema.apiCredentials.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!credential[0] || credential[0].revokedAt)
        throw new IntegrationStateError(
          "The credential reference is unavailable in the active tenant.",
        );
    }
    const at = this.clock().toISOString();
    const connectionId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.integrationConnections).values({
        id: connectionId,
        ...tenantRecord(context, at),
        canonicalKey: required(input.canonicalKey, "Connection key"),
        name: required(input.name, "Connection name"),
        providerType: input.providerType,
        providerKey: provider.key,
        providerVersion: provider.version,
        connectionMode: input.connectionMode,
        status: "configured",
        apiCredentialId: input.apiCredentialId,
        configuration: input.configuration,
        capabilities: [...new Set(input.capabilities)],
        dataClasses: [...new Set(input.dataClasses)],
        pageSize: input.pageSize,
        rateLimitPerMinute: input.rateLimitPerMinute,
        ownerSubject: context.actorSubject,
      });
      await db.insert(schema.integrationConnectionEvents).values({
        id: randomUUID(),
        ...tenantRecord(context, at),
        connectionId,
        eventType: "configured",
        nextStatus: "configured",
        reason:
          input.connectionMode === "deterministic_fixture"
            ? "Human-confirmed deterministic fixture configuration; no live system connected."
            : "Human-confirmed live provider configuration with a scoped credential reference.",
        humanConfirmed: true,
        actorSubject: context.actorSubject,
        occurredAt: at,
      });
      await appendAudit(db, context, {
        action: "integration.connection_configured",
        resourceType: "integration_connection",
        resourceId: connectionId,
        detail: {
          providerType: input.providerType,
          providerKey: provider.key,
          providerVersion: provider.version,
          connectionMode: input.connectionMode,
          credentialStoredInline: false,
        },
        occurredAt: at,
      });
    });
    return { connectionId, status: "configured" as const };
  }

  async transitionConnection(
    context: TenantContext,
    input: {
      connectionId: string;
      nextStatus: ConnectionStatus;
      reason: string;
      humanConfirmed: boolean;
    },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "integration_connection",
      resourceOrganizationId: context.organizationId,
    });
    human(context, input.humanConfirmed, "Integration status change");
    const connection = await this.connection(
      context.organizationId,
      input.connectionId,
    );
    if (connection.status === "disabled")
      throw new IntegrationStateError(
        "A disabled connection cannot be reactivated without a new governed connection.",
      );
    if (input.nextStatus === "connected") {
      const provider = this.providerFor(connection);
      const credential = await this.credentialFor(connection);
      const health = await provider.health({
        organizationId: context.organizationId,
        connectionId: connection.id,
        credential,
      });
      if (health.status !== "healthy")
        throw new IntegrationStateError(
          "A connection cannot be activated until its exact provider reports healthy.",
        );
    }
    const eventType =
      input.nextStatus === "connected"
        ? "connected"
        : input.nextStatus === "degraded"
          ? "degraded"
          : input.nextStatus === "disabled"
            ? "disabled"
            : "disconnected";
    const at = this.clock().toISOString();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db
        .update(schema.integrationConnections)
        .set({
          status: input.nextStatus,
          updatedAt: at,
          updatedBy: context.actorSubject,
          revision: connection.revision + 1,
        })
        .where(
          and(
            eq(schema.integrationConnections.id, connection.id),
            eq(
              schema.integrationConnections.organizationId,
              context.organizationId,
            ),
          ),
        );
      await db.insert(schema.integrationConnectionEvents).values({
        id: randomUUID(),
        ...tenantRecord(context, at),
        connectionId: connection.id,
        eventType,
        previousStatus: connection.status,
        nextStatus: input.nextStatus,
        reason: required(input.reason, "Status-change reason"),
        humanConfirmed: true,
        actorSubject: context.actorSubject,
        occurredAt: at,
      });
      await appendAudit(db, context, {
        action: `integration.connection_${eventType}`,
        resourceType: "integration_connection",
        resourceId: connection.id,
        detail: {
          previousStatus: connection.status,
          nextStatus: input.nextStatus,
          reason: input.reason,
        },
        occurredAt: at,
      });
    });
    return { connectionId: connection.id, status: input.nextStatus };
  }

  async createSchemaVersion(
    context: TenantContext,
    input: {
      connectionId: string;
      schemaKey: string;
      direction: "pull" | "push" | "bidirectional";
      resourceKinds: string[];
      mapping: Record<string, unknown>;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "integration_schema_version",
      resourceOrganizationId: context.organizationId,
    });
    const connection = await this.connection(
      context.organizationId,
      input.connectionId,
    );
    const provider = this.providerFor(connection);
    const directions: IntegrationDirection[] =
      input.direction === "bidirectional"
        ? ["pull", "push"]
        : [input.direction];
    if (directions.some((direction) => !provider.capabilities.includes(direction)))
      throw new IntegrationValidationError(
        "The schema direction exceeds the pinned provider capability.",
      );
    if (!input.resourceKinds.length || !Object.keys(input.mapping).length)
      throw new IntegrationValidationError(
        "A versioned schema requires resource kinds and an explicit field mapping.",
      );
    if (containsSecretKey(input.mapping))
      throw new IntegrationValidationError(
        "Schema mappings cannot contain credential material.",
      );
    const previous = await this.database
      .select()
      .from(schema.integrationSchemaVersions)
      .where(
        and(
          eq(
            schema.integrationSchemaVersions.organizationId,
            context.organizationId,
          ),
          eq(
            schema.integrationSchemaVersions.connectionId,
            connection.id,
          ),
        ),
      )
      .orderBy(desc(schema.integrationSchemaVersions.versionNumber))
      .limit(1);
    const at = this.clock().toISOString();
    const schemaVersionId = randomUUID();
    const versionNumber = (previous[0]?.versionNumber ?? 0) + 1;
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      if (previous[0])
        await db
          .update(schema.integrationSchemaVersions)
          .set({ status: "superseded", updatedAt: at, updatedBy: context.actorSubject })
          .where(eq(schema.integrationSchemaVersions.id, previous[0].id));
      await db.insert(schema.integrationSchemaVersions).values({
        id: schemaVersionId,
        ...tenantRecord(context, at),
        connectionId: connection.id,
        versionNumber,
        schemaKey: required(input.schemaKey, "Schema key"),
        direction: input.direction,
        resourceKinds: [...new Set(input.resourceKinds.map((item) => required(item, "Resource kind")))],
        mapping: input.mapping,
        sourceSchemaHash: digest(input.mapping),
        status: "active",
        effectiveAt: at,
        authoredBy: context.actorSubject,
        supersedesVersionId: previous[0]?.id,
      });
      await appendAudit(db, context, {
        action: "integration.schema_version_created",
        resourceType: "integration_schema_version",
        resourceId: schemaVersionId,
        detail: {
          connectionId: connection.id,
          versionNumber,
          direction: input.direction,
          resourceKinds: input.resourceKinds,
          sourceSchemaHash: digest(input.mapping),
        },
        occurredAt: at,
      });
    });
    return { schemaVersionId, versionNumber, sourceSchemaHash: digest(input.mapping) };
  }

  async queueSync(
    context: TenantContext,
    input: {
      connectionId: string;
      schemaVersionId: string;
      direction: IntegrationDirection;
      resourceKind: string;
      idempotencyKey: string;
      cursorBefore?: string;
      pageSize?: number;
      records?: IntegrationRecord[];
      maxAttempts?: number;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "integration_sync_job",
      resourceOrganizationId: context.organizationId,
    });
    const connection = await this.connection(
      context.organizationId,
      input.connectionId,
    );
    if (!(["connected", "degraded"] as string[]).includes(connection.status))
      throw new IntegrationStateError(
        "Synchronization requires a connected or explicitly degraded connection.",
      );
    const versions = await this.database
      .select()
      .from(schema.integrationSchemaVersions)
      .where(
        and(
          eq(schema.integrationSchemaVersions.id, input.schemaVersionId),
          eq(
            schema.integrationSchemaVersions.organizationId,
            context.organizationId,
          ),
          eq(
            schema.integrationSchemaVersions.connectionId,
            connection.id,
          ),
          eq(schema.integrationSchemaVersions.status, "active"),
        ),
      )
      .limit(1);
    const version = versions[0];
    if (!version)
      throw new IntegrationStateError(
        "Synchronization requires the exact active schema version for this connection.",
      );
    if (
      (version.direction !== "bidirectional" && version.direction !== input.direction) ||
      !version.resourceKinds.includes(input.resourceKind)
    )
      throw new IntegrationValidationError(
        "The requested direction or resource kind is outside the active schema version.",
      );
    if (input.direction === "push" && !input.records?.length)
      throw new IntegrationValidationError(
        "A push synchronization requires at least one explicitly supplied record.",
      );
    const pageSize = input.pageSize ?? connection.pageSize;
    if (pageSize > connection.pageSize)
      throw new IntegrationValidationError(
        "The sync page size cannot exceed the governed connection limit.",
      );
    const requestPayload = {
      direction: input.direction,
      resourceKind: input.resourceKind,
      cursorBefore: input.cursorBefore ?? null,
      pageSize,
      records: input.records ?? [],
    };
    const requestHash = digest(requestPayload);
    const existing = await this.database
      .select()
      .from(schema.integrationSyncJobs)
      .where(
        and(
          eq(schema.integrationSyncJobs.organizationId, context.organizationId),
          eq(schema.integrationSyncJobs.connectionId, connection.id),
          eq(schema.integrationSyncJobs.idempotencyKey, required(input.idempotencyKey, "Idempotency key")),
        ),
      )
      .limit(1);
    if (existing[0]) {
      if (existing[0].requestHash !== requestHash)
        throw new IntegrationStateError(
          "The integration idempotency key is already bound to a different request.",
        );
      return { jobId: existing[0].id, status: existing[0].status, replayed: true };
    }
    const at = this.clock().toISOString();
    const jobId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.integrationSyncJobs).values({
        id: jobId,
        ...tenantRecord(context, at),
        connectionId: connection.id,
        schemaVersionId: version.id,
        direction: input.direction,
        resourceKind: required(input.resourceKind, "Resource kind"),
        idempotencyKey: required(input.idempotencyKey, "Idempotency key"),
        requestHash,
        requestPayload,
        cursorBefore: input.cursorBefore,
        pageSize,
        status: "queued",
        maxAttempts: input.maxAttempts ?? 3,
        availableAt: at,
        requestedBy: context.actorSubject,
        requestedAt: at,
      });
      await appendAudit(db, context, {
        action: "integration.sync_queued",
        resourceType: "integration_sync_job",
        resourceId: jobId,
        detail: {
          connectionId: connection.id,
          schemaVersionId: version.id,
          direction: input.direction,
          resourceKind: input.resourceKind,
          requestHash,
        },
        occurredAt: at,
      });
    });
    return { jobId, status: "queued" as const, replayed: false };
  }

  async executeSyncJob(
    context: TenantContext,
    input: { jobId: string; workerId: string },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "integration_sync_job",
      resourceOrganizationId: context.organizationId,
    });
    const jobs = await this.database
      .select({
        job: schema.integrationSyncJobs,
        connection: schema.integrationConnections,
        schemaVersion: schema.integrationSchemaVersions,
      })
      .from(schema.integrationSyncJobs)
      .innerJoin(
        schema.integrationConnections,
        eq(schema.integrationConnections.id, schema.integrationSyncJobs.connectionId),
      )
      .innerJoin(
        schema.integrationSchemaVersions,
        eq(schema.integrationSchemaVersions.id, schema.integrationSyncJobs.schemaVersionId),
      )
      .where(
        and(
          eq(schema.integrationSyncJobs.id, input.jobId),
          eq(schema.integrationSyncJobs.organizationId, context.organizationId),
          eq(schema.integrationConnections.organizationId, context.organizationId),
          eq(schema.integrationSchemaVersions.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const row = jobs[0];
    if (!row)
      throw new IntegrationStateError(
        "The integration sync job was not found in the active tenant.",
      );
    if (row.job.status === "succeeded")
      return { jobId: row.job.id, status: "succeeded" as const, replayed: true };
    if (row.job.status === "dead_letter")
      throw new IntegrationStateError(
        "A dead-lettered job requires an explicit append-only replay job.",
      );
    if (Date.parse(row.job.availableAt) > this.clock().getTime())
      throw new IntegrationStateError("The retry backoff window has not elapsed.");
    const provider = this.providerFor(row.connection);
    const credential = await this.credentialFor(row.connection);
    const at = this.clock().toISOString();
    const attemptNumber = row.job.attemptCount + 1;
    await this.database
      .update(schema.integrationSyncJobs)
      .set({
        status: "running",
        attemptCount: attemptNumber,
        leaseOwner: required(input.workerId, "Worker identifier"),
        leaseExpiresAt: new Date(Date.parse(at) + 60_000).toISOString(),
        updatedAt: at,
        updatedBy: context.actorSubject,
      })
      .where(eq(schema.integrationSyncJobs.id, row.job.id));
    try {
      const requestBase = {
        organizationId: context.organizationId,
        connectionId: row.connection.id,
        resourceKind: row.job.resourceKind,
        schemaVersion: `${row.schemaVersion.schemaKey}@${row.schemaVersion.versionNumber}`,
        credential,
      };
      const requestRecords = Array.isArray(row.job.requestPayload.records)
        ? (row.job.requestPayload.records as IntegrationRecord[])
        : [];
      const finishedAt = this.clock().toISOString();
      let recordsRead: number;
      let recordsWritten: number;
      let recordsRejected: number;
      let cursorAfter: string | undefined;
      let sourceReference: string;
      let responsePayload: Record<string, unknown>;
      let rateLimitRemaining: number | undefined;
      let rateLimitResetAt: string | undefined;
      if (row.job.direction === "pull") {
        const providerResult = await provider.pullPage({
          ...requestBase,
          cursor: row.job.cursorBefore ?? undefined,
          pageSize: row.job.pageSize,
        });
        recordsRead = providerResult.records.length;
        recordsWritten = providerResult.records.length;
        recordsRejected = 0;
        cursorAfter = providerResult.nextCursor;
        sourceReference = providerResult.sourceReference;
        responsePayload = { records: providerResult.records };
        rateLimitRemaining = providerResult.rateLimitRemaining;
        rateLimitResetAt = providerResult.rateLimitResetAt;
      } else {
        const providerResult = await provider.pushBatch({
          ...requestBase,
          records: requestRecords,
        });
        recordsRead = requestRecords.length;
        recordsWritten = providerResult.accepted;
        recordsRejected = providerResult.rejected;
        cursorAfter = undefined;
        sourceReference = providerResult.sourceReference;
        responsePayload = { response: providerResult.response };
        rateLimitRemaining = providerResult.rateLimitRemaining;
        rateLimitResetAt = providerResult.rateLimitResetAt;
      }
      const receiptPayload = {
        schema: "fortify.integration-sync-receipt.1",
        jobId: row.job.id,
        attemptNumber,
        connectionId: row.connection.id,
        provider: {
          type: provider.type,
          key: provider.key,
          version: provider.version,
          fixture: provider.fixture,
        },
        schemaVersion: requestBase.schemaVersion,
        direction: row.job.direction,
        resourceKind: row.job.resourceKind,
        requestHash: row.job.requestHash,
        cursorBefore: row.job.cursorBefore ?? null,
        cursorAfter: cursorAfter ?? null,
        recordsRead,
        recordsWritten,
        recordsRejected,
        sourceReference,
        response: responsePayload,
        completedAt: finishedAt,
        externalAcceptanceImplied: false,
      };
      const receiptBody = new TextEncoder().encode(
        `${JSON.stringify(receiptPayload, null, 2)}\n`,
      );
      const payloadHash = sha256(receiptBody);
      const storageObjectId = randomUUID();
      const attemptId = randomUUID();
      const receiptId = randomUUID();
      const objectKey = `tenants/${context.organizationId}/integrations/${row.connection.id}/${row.job.id}/attempt-${attemptNumber}.json`;
      await this.storage.put({
        key: objectKey,
        body: receiptBody,
        mimeType: "application/json",
        sha256: payloadHash,
      });
      const [head, readback] = await Promise.all([
        this.storage.head(objectKey),
        this.storage.read(objectKey),
      ]);
      if (
        !head ||
        head.sha256 !== payloadHash ||
        head.sizeBytes !== receiptBody.byteLength ||
        sha256(readback) !== payloadHash
      )
        throw new IntegrationStateError(
          "Integration receipt failed exact-byte storage readback.",
        );
      try {
        await this.database.transaction(async (transaction) => {
          const db = transaction as unknown as ProductionDatabaseLike;
          await db.insert(schema.storageObjects).values({
            id: storageObjectId,
            ...tenantRecord(context, finishedAt),
            provider: this.storage.provider,
            bucket: this.storage.bucket,
            objectKey,
            originalFilename: `integration-sync-${row.job.id}.json`,
            mimeType: "application/json",
            sizeBytes: receiptBody.byteLength,
            sha256: payloadHash,
            checksumAlgorithm: "sha256",
            encryptionMode: head.encryptionMode,
            state: "clean",
            scanStatus: "clean",
          });
          await db.insert(schema.malwareScanResults).values({
            id: randomUUID(),
            ...tenantRecord(context, finishedAt),
            storageObjectId,
            scanner: "fortify-internal-integration-receipt",
            engineVersion: "fortify-integration-receipt-1",
            status: "clean",
            findings: [],
            scannedAt: finishedAt,
          });
          await db.insert(schema.integrationSyncAttempts).values({
            id: attemptId,
            ...tenantRecord(context, finishedAt),
            jobId: row.job.id,
            attemptNumber,
            status: "succeeded",
            providerKey: provider.key,
            providerVersion: provider.version,
            requestHash: row.job.requestHash,
            responseHash: payloadHash,
            cursorBefore: row.job.cursorBefore,
            cursorAfter,
            recordsRead,
            recordsWritten,
            recordsRejected,
            rateLimitRemaining,
            rateLimitResetAt,
            startedAt: at,
            finishedAt,
          });
          await db.insert(schema.integrationSyncReceipts).values({
            id: receiptId,
            ...tenantRecord(context, finishedAt),
            jobId: row.job.id,
            attemptId,
            storageObjectId,
            receiptType: row.job.direction === "pull" ? "pull_page" : "push_batch",
            schemaVersion: requestBase.schemaVersion,
            cursorBefore: row.job.cursorBefore,
            cursorAfter,
            pageCount: 1,
            recordsRead,
            recordsWritten,
            recordsRejected,
            payloadHash,
            sourceAuthority: provider.fixture
              ? "Fortify deterministic integration fixture"
              : provider.key,
            sourceReference,
            completedAt: finishedAt,
          });
          await db
            .update(schema.integrationSyncJobs)
            .set({
              status: "succeeded",
              completedAt: finishedAt,
              leaseOwner: null,
              leaseExpiresAt: null,
              lastErrorCode: null,
              lastErrorMessage: null,
              updatedAt: finishedAt,
              updatedBy: context.actorSubject,
            })
            .where(eq(schema.integrationSyncJobs.id, row.job.id));
          await appendAudit(db, context, {
            action: "integration.sync_succeeded",
            resourceType: "integration_sync_job",
            resourceId: row.job.id,
            detail: {
              attemptNumber,
              providerKey: provider.key,
              providerVersion: provider.version,
              fixture: provider.fixture,
              cursorAfter: cursorAfter ?? null,
              recordsRead,
              recordsWritten,
              recordsRejected,
              receiptHash: payloadHash,
              exactByteReadback: true,
              externalAcceptanceImplied: false,
            },
            occurredAt: finishedAt,
          });
        });
      } catch (error) {
        await this.storage.delete(objectKey);
        throw error;
      }
      return {
        jobId: row.job.id,
        status: "succeeded" as const,
        attemptNumber,
        receiptId,
        payloadHash,
        cursorAfter,
        recordsRead,
        recordsWritten,
        recordsRejected,
        replayed: false,
      };
    } catch (error) {
      const finishedAt = this.clock().toISOString();
      const providerError =
        error instanceof IntegrationProviderError
          ? error
          : new IntegrationProviderError(
              error instanceof Error ? error.message : "Integration provider failed.",
              false,
              "integration_execution_failed",
            );
      const retry = providerError.retryable && attemptNumber < row.job.maxAttempts;
      const status = retry ? "retry_scheduled" : "dead_letter";
      const availableAt = new Date(
        Date.parse(finishedAt) + (providerError.retryAfterSeconds ?? 30) * 1000,
      ).toISOString();
      await this.database.transaction(async (transaction) => {
        const db = transaction as unknown as ProductionDatabaseLike;
        await db.insert(schema.integrationSyncAttempts).values({
          id: randomUUID(),
          ...tenantRecord(context, finishedAt),
          jobId: row.job.id,
          attemptNumber,
          status: retry ? "failed_retryable" : "failed_terminal",
          providerKey: provider.key,
          providerVersion: provider.version,
          requestHash: row.job.requestHash,
          cursorBefore: row.job.cursorBefore,
          errorCode: providerError.code,
          errorMessage: providerError.message,
          startedAt: at,
          finishedAt,
        });
        await db
          .update(schema.integrationSyncJobs)
          .set({
            status,
            availableAt: retry ? availableAt : row.job.availableAt,
            leaseOwner: null,
            leaseExpiresAt: null,
            lastErrorCode: providerError.code,
            lastErrorMessage: providerError.message,
            deadLetteredAt: retry ? null : finishedAt,
            updatedAt: finishedAt,
            updatedBy: context.actorSubject,
          })
          .where(eq(schema.integrationSyncJobs.id, row.job.id));
        await appendAudit(db, context, {
          action: retry
            ? "integration.sync_retry_scheduled"
            : "integration.sync_dead_lettered",
          resourceType: "integration_sync_job",
          resourceId: row.job.id,
          detail: {
            attemptNumber,
            errorCode: providerError.code,
            retryable: providerError.retryable,
            availableAt: retry ? availableAt : null,
          },
          occurredAt: finishedAt,
        });
      });
      return {
        jobId: row.job.id,
        status,
        attemptNumber,
        errorCode: providerError.code,
        availableAt: retry ? availableAt : undefined,
      };
    }
  }

  async replayDeadLetter(
    context: TenantContext,
    input: { jobId: string; idempotencyKey: string; humanConfirmed: boolean },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "integration_sync_job",
      resourceOrganizationId: context.organizationId,
    });
    human(context, input.humanConfirmed, "Dead-letter replay");
    const original = await this.database
      .select()
      .from(schema.integrationSyncJobs)
      .where(
        and(
          eq(schema.integrationSyncJobs.id, input.jobId),
          eq(schema.integrationSyncJobs.organizationId, context.organizationId),
          eq(schema.integrationSyncJobs.status, "dead_letter"),
        ),
      )
      .limit(1);
    if (!original[0])
      throw new IntegrationStateError(
        "Only a dead-lettered job can create an append-only replay.",
      );
    const at = this.clock().toISOString();
    const jobId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.integrationSyncJobs).values({
        ...original[0],
        id: jobId,
        ...tenantRecord(context, at),
        supersedesJobId: original[0].id,
        idempotencyKey: required(input.idempotencyKey, "Replay idempotency key"),
        status: "queued",
        attemptCount: 0,
        availableAt: at,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        requestedBy: context.actorSubject,
        requestedAt: at,
        completedAt: null,
        deadLetteredAt: null,
      });
      await appendAudit(db, context, {
        action: "integration.dead_letter_replayed",
        resourceType: "integration_sync_job",
        resourceId: jobId,
        detail: { supersedesJobId: original[0].id, requestHash: original[0].requestHash },
        occurredAt: at,
      });
    });
    return { jobId, supersedesJobId: original[0].id, status: "queued" as const };
  }

  async checkHealth(context: TenantContext, connectionId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "integration_provider_health_check",
      resourceOrganizationId: context.organizationId,
    });
    const connection = await this.connection(context.organizationId, connectionId);
    const provider = this.providerFor(connection);
    const credential = await this.credentialFor(connection);
    const health = await provider.health({
      organizationId: context.organizationId,
      connectionId,
      credential,
    });
    const at = this.clock().toISOString();
    const healthCheckId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.integrationProviderHealthChecks).values({
        id: healthCheckId,
        ...tenantRecord(context, at),
        connectionId,
        status: health.status,
        providerKey: provider.key,
        providerVersion: provider.version,
        latencyMs: health.latencyMs,
        rateLimitRemaining: health.rateLimitRemaining,
        detail: health.detail,
        checkedAt: at,
      });
      await db
        .update(schema.integrationConnections)
        .set({ lastHealthAt: at, updatedAt: at, updatedBy: context.actorSubject })
        .where(eq(schema.integrationConnections.id, connectionId));
      await appendAudit(db, context, {
        action: "integration.health_checked",
        resourceType: "integration_provider_health_check",
        resourceId: healthCheckId,
        detail: { connectionId, status: health.status, providerKey: provider.key },
        occurredAt: at,
      });
    });
    return { healthCheckId, ...health };
  }

  async createWebhookEndpoint(
    context: TenantContext,
    input: {
      connectionId: string;
      apiCredentialId: string;
      endpointKey: string;
      eventTypes: string[];
      toleranceSeconds: number;
      humanConfirmed: boolean;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "integration_webhook_endpoint",
      resourceOrganizationId: context.organizationId,
    });
    human(context, input.humanConfirmed, "Webhook endpoint activation");
    const connection = await this.connection(
      context.organizationId,
      input.connectionId,
    );
    if (connection.status !== "connected")
      throw new IntegrationStateError(
        "Webhook activation requires a connected integration.",
      );
    const credentials = await this.database
      .select()
      .from(schema.apiCredentials)
      .where(
        and(
          eq(schema.apiCredentials.id, input.apiCredentialId),
          eq(schema.apiCredentials.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (
      !credentials[0] ||
      credentials[0].revokedAt ||
      !credentials[0].scopes.includes("integration:webhook:receive")
    )
      throw new IntegrationStateError(
        "Webhook activation requires an active credential scoped to integration:webhook:receive.",
      );
    if (!input.eventTypes.length)
      throw new IntegrationValidationError(
        "At least one webhook event type is required.",
      );
    const at = this.clock().toISOString();
    const endpointId = randomUUID();
    await this.database.transaction(async (transaction) => {
      const db = transaction as unknown as ProductionDatabaseLike;
      await db.insert(schema.integrationWebhookEndpoints).values({
        id: endpointId,
        ...tenantRecord(context, at),
        connectionId: connection.id,
        apiCredentialId: credentials[0].id,
        endpointKey: required(input.endpointKey, "Endpoint key"),
        eventTypes: [...new Set(input.eventTypes)],
        signatureAlgorithm: "hmac_sha256",
        toleranceSeconds: input.toleranceSeconds,
        status: "active",
        lastRotatedAt: at,
      });
      await appendAudit(db, context, {
        action: "integration.webhook_activated",
        resourceType: "integration_webhook_endpoint",
        resourceId: endpointId,
        detail: {
          connectionId: connection.id,
          eventTypes: input.eventTypes,
          signatureAlgorithm: "hmac_sha256",
          secretStoredInline: false,
        },
        occurredAt: at,
      });
    });
    return { endpointId, endpointKey: input.endpointKey, status: "active" as const };
  }

  async receiveWebhook(input: {
    endpointKey: string;
    externalEventId: string;
    eventType: string;
    timestamp: string;
    signature: string;
    body: Uint8Array;
  }) {
    if (!input.body.byteLength || input.body.byteLength > 5 * 1024 * 1024)
      throw new IntegrationValidationError(
        "Webhook bodies must be between 1 byte and 5 MiB.",
      );
    const endpoints = await this.database
      .select({
        endpoint: schema.integrationWebhookEndpoints,
        connection: schema.integrationConnections,
        credential: schema.apiCredentials,
      })
      .from(schema.integrationWebhookEndpoints)
      .innerJoin(
        schema.integrationConnections,
        eq(schema.integrationConnections.id, schema.integrationWebhookEndpoints.connectionId),
      )
      .innerJoin(
        schema.apiCredentials,
        eq(schema.apiCredentials.id, schema.integrationWebhookEndpoints.apiCredentialId),
      )
      .where(eq(schema.integrationWebhookEndpoints.endpointKey, input.endpointKey))
      .limit(1);
    const row = endpoints[0];
    if (
      !row ||
      row.endpoint.status !== "active" ||
      row.connection.status !== "connected" ||
      row.credential.revokedAt
    )
      throw new IntegrationStateError(
        "The webhook endpoint is unavailable or revoked.",
      );
    if (!row.endpoint.eventTypes.includes(input.eventType))
      throw new IntegrationStateError(
        "The webhook event type is outside the endpoint allowlist.",
      );
    const existing = await this.database
      .select()
      .from(schema.integrationWebhookDeliveries)
      .where(
        and(
          eq(
            schema.integrationWebhookDeliveries.organizationId,
            row.endpoint.organizationId,
          ),
          eq(schema.integrationWebhookDeliveries.endpointId, row.endpoint.id),
          eq(
            schema.integrationWebhookDeliveries.externalEventId,
            input.externalEventId,
          ),
        ),
      )
      .limit(1);
    if (existing[0])
      return {
        deliveryId: existing[0].id,
        jobId: existing[0].syncJobId,
        replayed: true,
      };
    const secret = await this.credentialResolver.resolve({
      organizationId: row.endpoint.organizationId,
      credentialId: row.credential.id,
      providerType: row.connection.providerType as IntegrationProviderType,
    });
    verifyIntegrationWebhook({
      secret,
      timestamp: input.timestamp,
      body: input.body,
      signature: input.signature,
      toleranceSeconds: row.endpoint.toleranceSeconds,
      now: this.clock(),
    });
    try {
      const payload = JSON.parse(new TextDecoder().decode(input.body));
      if (!payload || typeof payload !== "object" || Array.isArray(payload))
        throw new Error("Webhook payload must be an object.");
    } catch {
      throw new IntegrationValidationError(
        "A signed webhook body must contain a valid JSON object.",
      );
    }
    const schemas = await this.database
      .select()
      .from(schema.integrationSchemaVersions)
      .where(
        and(
          eq(
            schema.integrationSchemaVersions.organizationId,
            row.endpoint.organizationId,
          ),
          eq(
            schema.integrationSchemaVersions.connectionId,
            row.connection.id,
          ),
          eq(schema.integrationSchemaVersions.status, "active"),
        ),
      )
      .orderBy(desc(schema.integrationSchemaVersions.versionNumber))
      .limit(1);
    if (!schemas[0])
      throw new IntegrationStateError(
        "Webhook intake requires an active schema version.",
      );
    const at = this.clock().toISOString();
    const context: TenantContext = {
      organizationId: row.endpoint.organizationId,
      actorSubject: `webhook:${row.endpoint.endpointKey}`,
      principalType: "service_account",
      grantedScopes: ["integration_sync_job:create"],
    };
    const bodySha256 = sha256(input.body);
    const storageObjectId = randomUUID();
    const deliveryId = randomUUID();
    const jobId = randomUUID();
    const objectKey = `tenants/${context.organizationId}/integrations/${row.connection.id}/webhooks/${deliveryId}.json`;
    await this.storage.put({
      key: objectKey,
      body: input.body,
      mimeType: "application/json",
      sha256: bodySha256,
    });
    const [head, readback] = await Promise.all([
      this.storage.head(objectKey),
      this.storage.read(objectKey),
    ]);
    if (
      !head ||
      head.sha256 !== bodySha256 ||
      head.sizeBytes !== input.body.byteLength ||
      sha256(readback) !== bodySha256
    ) {
      await this.storage.delete(objectKey);
      throw new IntegrationStateError(
        "Webhook body failed exact-byte quarantine readback.",
      );
    }
    try {
      await this.database.transaction(async (transaction) => {
        const db = transaction as unknown as ProductionDatabaseLike;
        await db.insert(schema.storageObjects).values({
          id: storageObjectId,
          ...tenantRecord(context, at),
          provider: this.storage.provider,
          bucket: this.storage.bucket,
          objectKey,
          originalFilename: `webhook-${input.externalEventId}.json`,
          mimeType: "application/json",
          sizeBytes: input.body.byteLength,
          sha256: bodySha256,
          checksumAlgorithm: "sha256",
          encryptionMode: head.encryptionMode,
          state: "quarantined",
          scanStatus: "pending",
        });
        const requestPayload = {
          webhookDeliveryId: deliveryId,
          storageObjectId,
          externalEventId: input.externalEventId,
          eventType: input.eventType,
        };
        await db.insert(schema.integrationSyncJobs).values({
          id: jobId,
          ...tenantRecord(context, at),
          connectionId: row.connection.id,
          schemaVersionId: schemas[0].id,
          direction: "pull",
          resourceKind: `webhook:${input.eventType}`,
          idempotencyKey: `webhook:${row.endpoint.id}:${input.externalEventId}`,
          requestHash: digest(requestPayload),
          requestPayload,
          pageSize: 1,
          status: "queued",
          maxAttempts: 3,
          availableAt: at,
          requestedBy: context.actorSubject,
          requestedAt: at,
        });
        await db.insert(schema.integrationWebhookDeliveries).values({
          id: deliveryId,
          ...tenantRecord(context, at),
          endpointId: row.endpoint.id,
          syncJobId: jobId,
          storageObjectId,
          externalEventId: required(input.externalEventId, "External event identifier"),
          eventType: input.eventType,
          signatureValid: true,
          signatureTimestamp: input.timestamp,
          bodySha256,
          receivedAt: at,
        });
        await appendAudit(db, context, {
          action: "integration.webhook_received",
          resourceType: "integration_webhook_delivery",
          resourceId: deliveryId,
          detail: {
            endpointId: row.endpoint.id,
            connectionId: row.connection.id,
            externalEventId: input.externalEventId,
            eventType: input.eventType,
            bodySha256,
            signatureValid: true,
            quarantineState: "pending",
          },
          occurredAt: at,
        });
      });
    } catch (error) {
      await this.storage.delete(objectKey);
      throw error;
    }
    return { deliveryId, jobId, bodySha256, replayed: false };
  }

  async readSyncReceipt(context: TenantContext, receiptId: string) {
    assertAuthorized(context, {
      action: "read",
      resource: "integration_sync_receipt",
      resourceOrganizationId: context.organizationId,
    });
    const rows = await this.database
      .select({
        receipt: schema.integrationSyncReceipts,
        storage: schema.storageObjects,
      })
      .from(schema.integrationSyncReceipts)
      .innerJoin(
        schema.storageObjects,
        eq(schema.storageObjects.id, schema.integrationSyncReceipts.storageObjectId),
      )
      .where(
        and(
          eq(schema.integrationSyncReceipts.id, receiptId),
          eq(
            schema.integrationSyncReceipts.organizationId,
            context.organizationId,
          ),
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    if (!rows[0])
      throw new IntegrationStateError(
        "Integration receipt was not found in the active tenant.",
      );
    const body = await this.storage.read(rows[0].storage.objectKey);
    if (
      body.byteLength !== rows[0].storage.sizeBytes ||
      sha256(body) !== rows[0].receipt.payloadHash
    )
      throw new IntegrationStateError(
        "Integration receipt failed exact-byte readback.",
      );
    return { body, receipt: rows[0].receipt };
  }

}

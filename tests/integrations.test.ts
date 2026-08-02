import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  DeterministicIntegrationProvider,
  type IntegrationCredentialResolver,
  IntegrationProviderError,
  providerBoundaryCatalog,
  signIntegrationWebhook,
  UnavailableIntegrationProvider,
} from "@/lib/production/integration-providers";
import {
  IntegrationService,
  IntegrationStateError,
  IntegrationValidationError,
} from "@/lib/production/integration-service";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const db = () => database as unknown as ProductionDatabaseLike;

class FixtureCredentialResolver implements IntegrationCredentialResolver {
  constructor(private readonly values = new Map<string, string>()) {}

  register(id: string, value: string) {
    this.values.set(id, value);
  }

  async resolve(input: { credentialId: string }) {
    const value = this.values.get(input.credentialId);
    if (!value)
      throw new IntegrationProviderError(
        "Fixture credential unavailable.",
        false,
        "credential_unavailable",
      );
    return value;
  }
}

const controlledClock = () => {
  let value = Date.parse("2026-08-02T12:00:00.000Z");
  return {
    now: () => new Date(value),
    advance(seconds: number) {
      value += seconds * 1000;
    },
  };
};

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
});

afterAll(async () => client.close());

async function createCredential(
  organizationId: string,
  actorSubject: string,
  key: string,
  scopes: string[],
) {
  const at = "2026-08-02T11:00:00.000Z";
  const context = {
    organizationId,
    actorSubject,
    principalType: "membership" as const,
    role: "organization_owner" as const,
    grantedScopes: [],
  };
  const accountId = `service-${key}`;
  const credentialId = `credential-${key}`;
  await db().insert(schema.serviceAccounts).values({
    id: accountId,
    ...tenantRecord(context, at),
    subject: `service:${key}`,
    name: `Integration service ${key}`,
    status: "active",
  });
  await db().insert(schema.apiCredentials).values({
    id: credentialId,
    ...tenantRecord(context, at),
    serviceAccountId: accountId,
    name: `Integration credential ${key}`,
    credentialPrefix: `fapi_${key}`,
    secretHash: "a".repeat(64),
    scopes,
  });
  return credentialId;
}

async function connectedFixture(
  key: string,
  input?: { failuresBeforeSuccess?: number; maxAttempts?: number },
) {
  const tenant = await createTenantFixture(db(), key);
  const clock = controlledClock();
  const provider = new DeterministicIntegrationProvider({
    type: "microsoft_graph_email",
    key: `graph-${key}`,
    version: "2026-07-graph-v1",
    failuresBeforeSuccess: input?.failuresBeforeSuccess,
    capabilities: ["pull"],
    records: [
      {
        externalId: `message-${key}-1`,
        resourceKind: "mail_message",
        externalVersion: "etag-1",
        observedAt: "2026-08-02T10:00:00.000Z",
        payload: {
          subject: "Fictional renewal evidence request",
          attachmentCount: 1,
          source: "deterministic fixture",
        },
      },
      {
        externalId: `message-${key}-2`,
        resourceKind: "mail_message",
        externalVersion: "etag-2",
        observedAt: "2026-08-02T10:05:00.000Z",
        payload: {
          subject: "Fictional clarification request",
          attachmentCount: 0,
          source: "deterministic fixture",
        },
      },
    ],
  });
  const resolver = new FixtureCredentialResolver();
  const storage = new DeterministicObjectStorageAdapter({
    mode: "aws:kms",
    keyId: "fixture-integration-key",
  });
  const service = new IntegrationService(
    db(),
    storage,
    [provider],
    resolver,
    clock.now,
  );
  const connection = await service.configureConnection(tenant.context, {
    canonicalKey: `graph-inbox-${key}`,
    name: "Microsoft Graph renewal inbox",
    providerType: "microsoft_graph_email",
    providerKey: provider.key,
    providerVersion: provider.version,
    connectionMode: "deterministic_fixture",
    configuration: {
      mailboxAlias: "renewals-fixture",
      folder: "Fortify intake",
      tenantAuthority: "fixture-only",
    },
    capabilities: ["pull"],
    dataClasses: ["carrier_confidential_material", "property_specific_data"],
    pageSize: 1,
    rateLimitPerMinute: 30,
    humanConfirmed: true,
  });
  await service.transitionConnection(tenant.context, {
    connectionId: connection.connectionId,
    nextStatus: "connected",
    reason: "Deterministic provider health verified for contract testing.",
    humanConfirmed: true,
  });
  const version = await service.createSchemaVersion(tenant.context, {
    connectionId: connection.connectionId,
    schemaKey: "fortify.graph-mail-intake",
    direction: "pull",
    resourceKinds: ["mail_message", "webhook:message.created"],
    mapping: {
      externalId: "message.id",
      externalVersion: "message.etag",
      subject: "message.subject",
      attachments: "message.attachments",
    },
  });
  return {
    tenant,
    clock,
    provider,
    resolver,
    storage,
    service,
    connection,
    version,
    maxAttempts: input?.maxAttempts ?? 3,
  };
}

describe("governed production integration control plane", () => {
  test("publishes explicit Graph, Gmail, Drive, AMS, property, model, and verifier boundaries", () => {
    expect(providerBoundaryCatalog.map((entry) => entry.type)).toEqual([
      "microsoft_graph_email",
      "gmail_email",
      "google_drive",
      "generic_ams",
      "applied_epic",
      "ams360",
      "property_management",
      "external_model",
      "verifier",
    ]);
    for (const entry of providerBoundaryCatalog) {
      expect(entry.resources.length).toBeGreaterThan(0);
      expect(entry.directions.length).toBeGreaterThan(0);
      const unavailable = new UnavailableIntegrationProvider(entry.type);
      expect(unavailable.fixture).toBe(false);
    }
  });

  test("rejects inline secrets and a fixture/live mode mismatch", async () => {
    const tenant = await createTenantFixture(db(), "integration-config");
    const provider = new DeterministicIntegrationProvider({
      type: "gmail_email",
      key: "gmail-fixture",
      capabilities: ["pull"],
    });
    const service = new IntegrationService(
      db(),
      new DeterministicObjectStorageAdapter(),
      [provider],
      new FixtureCredentialResolver(),
    );
    await expect(
      service.configureConnection(tenant.context, {
        canonicalKey: "gmail-secret",
        name: "Gmail intake",
        providerType: "gmail_email",
        providerKey: provider.key,
        providerVersion: provider.version,
        connectionMode: "deterministic_fixture",
        configuration: { accessToken: "must-not-persist" },
        capabilities: ["pull"],
        dataClasses: ["carrier_confidential_material"],
        pageSize: 50,
        rateLimitPerMinute: 60,
        humanConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(IntegrationValidationError);
    await expect(
      service.configureConnection(tenant.context, {
        canonicalKey: "gmail-live-mismatch",
        name: "Gmail live intake",
        providerType: "gmail_email",
        providerKey: provider.key,
        providerVersion: provider.version,
        connectionMode: "live",
        apiCredentialId: "not-a-credential",
        configuration: { mailboxAlias: "renewals" },
        capabilities: ["pull"],
        dataClasses: ["carrier_confidential_material"],
        pageSize: 50,
        rateLimitPerMinute: 60,
        humanConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(IntegrationStateError);
  });

  test("paginates Graph fixture intake with idempotency and exact encrypted receipts", async () => {
    const setup = await connectedFixture("integration-page");
    const first = await setup.service.queueSync(setup.tenant.context, {
      connectionId: setup.connection.connectionId,
      schemaVersionId: setup.version.schemaVersionId,
      direction: "pull",
      resourceKind: "mail_message",
      idempotencyKey: "graph-mail-page-1",
      pageSize: 1,
    });
    const idempotent = await setup.service.queueSync(setup.tenant.context, {
      connectionId: setup.connection.connectionId,
      schemaVersionId: setup.version.schemaVersionId,
      direction: "pull",
      resourceKind: "mail_message",
      idempotencyKey: "graph-mail-page-1",
      pageSize: 1,
    });
    expect(idempotent).toMatchObject({ jobId: first.jobId, replayed: true });
    const executed = await setup.service.executeSyncJob(setup.tenant.context, {
      jobId: first.jobId,
      workerId: "integration-worker-1",
    });
    expect(executed).toMatchObject({
      status: "succeeded",
      recordsRead: 1,
      recordsWritten: 1,
      recordsRejected: 0,
      cursorAfter: "1",
    });
    if (!("receiptId" in executed) || typeof executed.receiptId !== "string")
      throw new Error("Receipt was not created.");
    const receiptId = executed.receiptId;
    const receipt = await setup.service.readSyncReceipt(
      setup.tenant.context,
      receiptId,
    );
    expect(receipt.receipt.payloadHash).toBe(executed.payloadHash);
    expect(JSON.parse(new TextDecoder().decode(receipt.body))).toMatchObject({
      provider: { fixture: true, key: setup.provider.key },
      cursorAfter: "1",
      recordsRead: 1,
      externalAcceptanceImplied: false,
    });
    const second = await setup.service.queueSync(setup.tenant.context, {
      connectionId: setup.connection.connectionId,
      schemaVersionId: setup.version.schemaVersionId,
      direction: "pull",
      resourceKind: "mail_message",
      idempotencyKey: "graph-mail-page-2",
      cursorBefore: "1",
      pageSize: 1,
    });
    const secondResult = await setup.service.executeSyncJob(
      setup.tenant.context,
      { jobId: second.jobId, workerId: "integration-worker-1" },
    );
    expect(secondResult).toMatchObject({
      status: "succeeded",
      recordsRead: 1,
      cursorAfter: undefined,
    });
    const workspace = await setup.service.getWorkspace(setup.tenant.context);
    expect(workspace.receipts).toHaveLength(2);
    expect(workspace.attempts).toHaveLength(2);
    expect(workspace.boundaries).toMatchObject({
      liveCredentialsAvailable: false,
      fixtureModeExplicit: true,
      externalAcceptanceImplied: false,
    });
  });

  test("preserves retry attempts, dead-letters exhaustion, and appends a replay job", async () => {
    const setup = await connectedFixture("integration-retry", {
      failuresBeforeSuccess: 2,
      maxAttempts: 2,
    });
    const queued = await setup.service.queueSync(setup.tenant.context, {
      connectionId: setup.connection.connectionId,
      schemaVersionId: setup.version.schemaVersionId,
      direction: "pull",
      resourceKind: "mail_message",
      idempotencyKey: "retry-source-job",
      pageSize: 1,
      maxAttempts: 2,
    });
    const first = await setup.service.executeSyncJob(setup.tenant.context, {
      jobId: queued.jobId,
      workerId: "integration-worker-retry",
    });
    expect(first).toMatchObject({
      status: "retry_scheduled",
      errorCode: "fixture_rate_limited",
    });
    setup.clock.advance(31);
    const second = await setup.service.executeSyncJob(setup.tenant.context, {
      jobId: queued.jobId,
      workerId: "integration-worker-retry",
    });
    expect(second).toMatchObject({
      status: "dead_letter",
      attemptNumber: 2,
    });
    const replay = await setup.service.replayDeadLetter(setup.tenant.context, {
      jobId: queued.jobId,
      idempotencyKey: "retry-replay-job",
      humanConfirmed: true,
    });
    expect(replay).toMatchObject({ supersedesJobId: queued.jobId, status: "queued" });
    const replayed = await setup.service.executeSyncJob(setup.tenant.context, {
      jobId: replay.jobId,
      workerId: "integration-worker-retry",
    });
    expect(replayed.status).toBe("succeeded");
    const attempts = await db()
      .select()
      .from(schema.integrationSyncAttempts)
      .where(eq(schema.integrationSyncAttempts.organizationId, setup.tenant.organizationId));
    expect(attempts).toHaveLength(3);
    expect(attempts.map((attempt) => attempt.status)).toEqual(
      expect.arrayContaining(["failed_retryable", "failed_terminal", "succeeded"]),
    );
  });

  test("requires a scoped credential and exact HMAC before quarantining webhook bytes", async () => {
    const setup = await connectedFixture("integration-webhook");
    const credentialId = await createCredential(
      setup.tenant.organizationId,
      setup.tenant.context.actorSubject,
      "webhook",
      ["integration:webhook:receive"],
    );
    const secret = "fixture-webhook-secret-with-sufficient-entropy";
    setup.resolver.register(credentialId, secret);
    const endpoint = await setup.service.createWebhookEndpoint(
      setup.tenant.context,
      {
        connectionId: setup.connection.connectionId,
        apiCredentialId: credentialId,
        endpointKey: "graph-message-events",
        eventTypes: ["message.created"],
        toleranceSeconds: 300,
        humanConfirmed: true,
      },
    );
    const body = new TextEncoder().encode(
      JSON.stringify({ id: "graph-event-1", resource: "message-fixture-3" }),
    );
    const timestamp = setup.clock.now().toISOString();
    await expect(
      setup.service.receiveWebhook({
        endpointKey: endpoint.endpointKey,
        externalEventId: "graph-event-1",
        eventType: "message.created",
        timestamp,
        signature: "0".repeat(64),
        body,
      }),
    ).rejects.toMatchObject({ code: "webhook_signature_invalid" });
    const signature = signIntegrationWebhook(secret, timestamp, body);
    const accepted = await setup.service.receiveWebhook({
      endpointKey: endpoint.endpointKey,
      externalEventId: "graph-event-1",
      eventType: "message.created",
      timestamp,
      signature,
      body,
    });
    expect(accepted).toMatchObject({ replayed: false });
    const duplicate = await setup.service.receiveWebhook({
      endpointKey: endpoint.endpointKey,
      externalEventId: "graph-event-1",
      eventType: "message.created",
      timestamp,
      signature,
      body,
    });
    expect(duplicate).toMatchObject({
      deliveryId: accepted.deliveryId,
      jobId: accepted.jobId,
      replayed: true,
    });
    const stored = await db()
      .select()
      .from(schema.storageObjects)
      .where(eq(schema.storageObjects.organizationId, setup.tenant.organizationId));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ state: "quarantined", scanStatus: "pending" });
  });

  test("database guards reject cross-tenant references independently of the service", async () => {
    const alpha = await connectedFixture("integration-tenant-alpha");
    const beta = await createTenantFixture(db(), "integration-tenant-beta");
    await expect(
      db().insert(schema.integrationConnectionEvents).values({
        id: "cross-tenant-integration-event",
        ...tenantRecord(beta.context, "2026-08-02T13:00:00.000Z"),
        connectionId: alpha.connection.connectionId,
        eventType: "connected",
        previousStatus: "configured",
        nextStatus: "connected",
        reason: "Cross-tenant attack fixture must fail.",
        humanConfirmed: true,
        actorSubject: beta.context.actorSubject,
        occurredAt: "2026-08-02T13:00:00.000Z",
      }),
    ).rejects.toThrow(/same organization|tenant|organization/i);
  });

  test("records provider health without converting fixture availability into live validation", async () => {
    const setup = await connectedFixture("integration-health");
    const health = await setup.service.checkHealth(
      setup.tenant.context,
      setup.connection.connectionId,
    );
    expect(health).toMatchObject({
      status: "healthy",
      latencyMs: 0,
      rateLimitRemaining: 999,
    });
    expect(health.detail).toContain("fixture");
    const workspace = await setup.service.getWorkspace(setup.tenant.context);
    expect(workspace.healthChecks).toHaveLength(1);
    expect(workspace.healthChecks[0].providerVersion).toBe(setup.provider.version);
  });
});

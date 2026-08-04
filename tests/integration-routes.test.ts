import { PGlite } from "@electric-sql/pglite";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import * as schema from "@/db/production/schema";
import type { OrganizationRole } from "@/lib/production/authorization";
import { IdentityService } from "@/lib/production/identity-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

const routeState = vi.hoisted(() => ({
  database: undefined as ProductionDatabaseLike | undefined,
}));

vi.mock("@/db/production/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/db/production/client")>();
  return {
    ...original,
    getProductionDatabase: () => routeState.database,
  };
});

import { POST as checkHealth } from "@/app/api/production/integrations/connections/[connectionId]/health/route";
import { POST as transitionConnection } from "@/app/api/production/integrations/connections/[connectionId]/status/route";
import { POST as configureConnection } from "@/app/api/production/integrations/connections/route";
import { POST as createSchemaVersion } from "@/app/api/production/integrations/schemas/route";
import { POST as replayDeadLetter } from "@/app/api/production/integrations/sync-jobs/[jobId]/replay/route";
import { POST as executeSyncJob } from "@/app/api/production/integrations/sync-jobs/[jobId]/run/route";
import { POST as queueSync } from "@/app/api/production/integrations/sync-jobs/route";
import { POST as createWebhookEndpoint } from "@/app/api/production/integrations/webhook-endpoints/route";
import { GET as getIntegrationWorkspace } from "@/app/api/production/integrations/workspace/route";

type TenantFixture = Awaited<ReturnType<typeof createTenantFixture>>;
type Session = Awaited<ReturnType<IdentityService["issueSession"]>>;
type ConnectedFixture = {
  fixture: TenantFixture;
  owner: Session;
  credentialId: string;
  connectionId: string;
  schemaVersionId: string;
};

const at = "2026-08-04T12:00:00.000Z";

function request(url: string, credential: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", `fortify_session=${credential}`);
  return new NextRequest(url, {
    method: init?.method,
    headers,
    body: init?.body,
  });
}

function jsonBody(value: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  };
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  if (!value || typeof value !== "object") return keys;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

describe("integration request binding", () => {
  let client: PGlite;
  let database: PgliteDatabase<typeof schema>;
  let productionDatabase: ProductionDatabaseLike;

  beforeAll(async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FORTIFY_RUNTIME_MODE", "production");
    vi.stubEnv("DATABASE_URL", "postgres://migration.example.test/fortify");
    vi.stubEnv(
      "FORTIFY_APP_DATABASE_URL",
      "postgres://application.example.test/fortify",
    );
    vi.stubEnv(
      "FORTIFY_REQUEST_HASH_KEY",
      "fixture-request-hash-key-32-characters",
    );
    vi.stubEnv("FORTIFY_STORAGE_BUCKET", "request-bound-fixture-bucket");
    vi.stubEnv("FORTIFY_STORAGE_REGION", "us-west-2");
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
    productionDatabase = database as unknown as ProductionDatabaseLike;
    routeState.database = productionDatabase;
  }, 90_000);

  afterAll(async () => {
    routeState.database = undefined;
    await client.close();
    vi.unstubAllEnvs();
  });

  async function issueSession(
    fixture: TenantFixture,
    subject: string,
    role: OrganizationRole,
  ) {
    const membership = await createActiveMembership(productionDatabase, {
      organizationId: fixture.organizationId,
      subject,
      role,
    });
    return new IdentityService(productionDatabase).issueSession({
      profile: membership.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3_600,
    });
  }

  async function createCredential(fixture: TenantFixture, key: string) {
    const owned = tenantRecord(fixture.context, at);
    const serviceAccountId = `integration-service-${key}`;
    const credentialId = `integration-credential-${key}`;
    await productionDatabase.insert(schema.serviceAccounts).values({
      id: serviceAccountId,
      ...owned,
      subject: `service:integration-${key}`,
      name: `Integration service ${key}`,
      status: "active",
    });
    await productionDatabase.insert(schema.apiCredentials).values({
      id: credentialId,
      ...owned,
      serviceAccountId,
      name: `Integration credential ${key}`,
      credentialPrefix: `fapi_integration_${key}`,
      secretHash: "a".repeat(64),
      scopes: [
        "integration_connection:read",
        "integration_sync_job:create",
        "integration:webhook:receive",
      ],
    });
    return credentialId;
  }

  function connectionInput(credentialId: string, key: string) {
    return {
      canonicalKey: `request-bound-graph-${key}`,
      name: `Request-bound Graph connection ${key}`,
      providerType: "microsoft_graph_email",
      providerKey: "unavailable-microsoft_graph_email",
      providerVersion: "unconfigured",
      connectionMode: "live",
      apiCredentialId: credentialId,
      configuration: {
        mailboxAlias: `renewals-${key}`,
        folder: "Fortify intake",
      },
      capabilities: ["pull"],
      dataClasses: ["carrier_confidential_material", "property_specific_data"],
      pageSize: 25,
      rateLimitPerMinute: 30,
      humanConfirmed: true,
    };
  }

  async function connectedFixture(key: string): Promise<ConnectedFixture> {
    const fixture = await createTenantFixture(productionDatabase, key);
    const owner = await issueSession(
      fixture,
      `integration-owner-${key}`,
      "organization_owner",
    );
    const credentialId = await createCredential(fixture, key);
    const connectionResponse = await configureConnection(
      request(
        "https://fortify.test/api/production/integrations/connections",
        owner.token,
        jsonBody(connectionInput(credentialId, key)),
      ),
    );
    expect(connectionResponse.status).toBe(201);
    const connection = (await connectionResponse.json()) as {
      connectionId: string;
    };
    await productionDatabase
      .update(schema.integrationConnections)
      .set({
        status: "connected",
        updatedAt: at,
        updatedBy: fixture.context.actorSubject,
      })
      .where(
        and(
          eq(schema.integrationConnections.id, connection.connectionId),
          eq(
            schema.integrationConnections.organizationId,
            fixture.organizationId,
          ),
        ),
      );
    const schemaResponse = await createSchemaVersion(
      request(
        "https://fortify.test/api/production/integrations/schemas",
        owner.token,
        jsonBody({
          connectionId: connection.connectionId,
          schemaKey: `fortify.graph-mail-${key}`,
          direction: "pull",
          resourceKinds: ["mail_message"],
          mapping: {
            externalId: "message.id",
            externalVersion: "message.etag",
            subject: "message.subject",
          },
        }),
      ),
    );
    expect(schemaResponse.status).toBe(201);
    const schemaVersion = (await schemaResponse.json()) as {
      schemaVersionId: string;
    };
    return {
      fixture,
      owner,
      credentialId,
      connectionId: connection.connectionId,
      schemaVersionId: schemaVersion.schemaVersionId,
    };
  }

  test("isolates integration configuration and minimizes the administrative workspace", async () => {
    const alpha = await createTenantFixture(
      productionDatabase,
      "integration-routes-alpha",
    );
    const beta = await connectedFixture("integration-routes-beta");
    const owner = await issueSession(
      alpha,
      "integration-routes-alpha-owner",
      "organization_owner",
    );
    const auditor = await issueSession(
      alpha,
      "integration-routes-alpha-auditor",
      "read_only_auditor",
    );
    const credentialId = await createCredential(
      alpha,
      "integration-routes-alpha",
    );
    const emptyWorkspace = await getIntegrationWorkspace(
      request(
        "https://fortify.test/api/production/integrations/workspace",
        owner.token,
      ),
    );
    expect(emptyWorkspace.status).toBe(200);
    expect(emptyWorkspace.headers.get("cache-control")).toBe("no-store");
    expect(await emptyWorkspace.json()).toMatchObject({ connections: [] });
    const denied = await configureConnection(
      request(
        "https://fortify.test/api/production/integrations/connections",
        auditor.token,
        jsonBody(connectionInput(credentialId, "auditor-denied")),
      ),
    );
    expect(denied.status).toBe(403);
    const crossTenantCredential = await configureConnection(
      request(
        "https://fortify.test/api/production/integrations/connections",
        owner.token,
        jsonBody(connectionInput(beta.credentialId, "cross-tenant-credential")),
      ),
    );
    expect(crossTenantCredential.status).toBe(409);
    const configured = await configureConnection(
      request(
        "https://fortify.test/api/production/integrations/connections",
        owner.token,
        jsonBody(connectionInput(credentialId, "alpha-created")),
      ),
    );
    expect(configured.status).toBe(201);
    const created = (await configured.json()) as { connectionId: string };
    const inlineSecret = await configureConnection(
      request(
        "https://fortify.test/api/production/integrations/connections",
        owner.token,
        jsonBody({
          ...connectionInput(credentialId, "inline-secret"),
          configuration: { apiKey: "must-not-persist" },
        }),
      ),
    );
    expect(inlineSecret.status).toBe(400);
    const crossTenantSchema = await createSchemaVersion(
      request(
        "https://fortify.test/api/production/integrations/schemas",
        owner.token,
        jsonBody({
          connectionId: beta.connectionId,
          schemaKey: "must-not-cross-tenant",
          direction: "pull",
          resourceKinds: ["mail_message"],
          mapping: { externalId: "message.id" },
        }),
      ),
    );
    expect(crossTenantSchema.status).toBe(409);
    const schemaResponse = await createSchemaVersion(
      request(
        "https://fortify.test/api/production/integrations/schemas",
        owner.token,
        jsonBody({
          connectionId: created.connectionId,
          schemaKey: "fortify.graph-mail-alpha",
          direction: "pull",
          resourceKinds: ["mail_message"],
          mapping: {
            externalId: "message.id",
            externalVersion: "message.etag",
          },
        }),
      ),
    );
    expect(schemaResponse.status).toBe(201);
    const workspaceResponse = await getIntegrationWorkspace(
      request(
        "https://fortify.test/api/production/integrations/workspace",
        owner.token,
      ),
    );
    const workspace = await workspaceResponse.json();
    expect(workspace.connections).toHaveLength(1);
    expect(workspace.connections[0].id).toBe(created.connectionId);
    expect(workspace.schemas).toHaveLength(1);
    const keys = collectKeys(workspace);
    for (const forbidden of [
      "organizationId",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "revision",
      "lifecycleStatus",
      "apiCredentialId",
      "configuration",
      "idempotencyKey",
      "requestHash",
      "requestPayload",
      "leaseOwner",
      "leaseExpiresAt",
      "storageObjectId",
      "quarantineStorageObjectId",
      "errorMessage",
      "actorSubject",
      "humanConfirmed",
    ])
      expect(keys.has(forbidden), forbidden).toBe(false);
  });

  test("binds status, health, sync, replay, and webhook controls to the tenant request", async () => {
    const alpha = await connectedFixture("integration-routes-lifecycle");
    const beta = await connectedFixture("integration-routes-foreign");
    const endpointResponse = await createWebhookEndpoint(
      request(
        "https://fortify.test/api/production/integrations/webhook-endpoints",
        alpha.owner.token,
        jsonBody({
          connectionId: alpha.connectionId,
          apiCredentialId: alpha.credentialId,
          endpointKey: "integration-routes-lifecycle-events",
          eventTypes: ["message.created"],
          toleranceSeconds: 300,
          humanConfirmed: true,
        }),
      ),
    );
    expect(endpointResponse.status).toBe(201);
    const crossTenantEndpoint = await createWebhookEndpoint(
      request(
        "https://fortify.test/api/production/integrations/webhook-endpoints",
        alpha.owner.token,
        jsonBody({
          connectionId: beta.connectionId,
          apiCredentialId: beta.credentialId,
          endpointKey: "must-not-cross-tenant",
          eventTypes: ["message.created"],
          toleranceSeconds: 300,
          humanConfirmed: true,
        }),
      ),
    );
    expect(crossTenantEndpoint.status).toBe(409);
    const queueInput = {
      connectionId: alpha.connectionId,
      schemaVersionId: alpha.schemaVersionId,
      direction: "pull",
      resourceKind: "mail_message",
      idempotencyKey: "integration-routes-lifecycle-page-1",
      pageSize: 10,
      maxAttempts: 1,
    };
    const betaQueueResponse = await queueSync(
      request(
        "https://fortify.test/api/production/integrations/sync-jobs",
        beta.owner.token,
        jsonBody({
          ...queueInput,
          connectionId: beta.connectionId,
          schemaVersionId: beta.schemaVersionId,
          idempotencyKey: "integration-routes-foreign-page-1",
        }),
      ),
    );
    expect(betaQueueResponse.status).toBe(202);
    const betaJob = (await betaQueueResponse.json()) as { jobId: string };
    await productionDatabase
      .update(schema.integrationSyncJobs)
      .set({
        status: "running",
        attemptCount: 1,
        leaseOwner: "foreign-integration-worker",
        leaseExpiresAt: "2026-08-04T12:01:00.000Z",
        updatedAt: at,
        updatedBy: beta.fixture.context.actorSubject,
      })
      .where(eq(schema.integrationSyncJobs.id, betaJob.jobId));
    await productionDatabase
      .update(schema.integrationSyncJobs)
      .set({
        status: "dead_letter",
        deadLetteredAt: at,
        lastErrorCode: "provider_unconfigured",
        lastErrorMessage: "Foreign synthetic dead-letter fixture.",
        updatedAt: at,
        updatedBy: beta.fixture.context.actorSubject,
      })
      .where(eq(schema.integrationSyncJobs.id, betaJob.jobId));
    const queuedResponse = await queueSync(
      request(
        "https://fortify.test/api/production/integrations/sync-jobs",
        alpha.owner.token,
        jsonBody(queueInput),
      ),
    );
    expect(queuedResponse.status).toBe(202);
    const queued = (await queuedResponse.json()) as { jobId: string };
    const replayedQueue = await queueSync(
      request(
        "https://fortify.test/api/production/integrations/sync-jobs",
        alpha.owner.token,
        jsonBody(queueInput),
      ),
    );
    expect(replayedQueue.status).toBe(202);
    expect(await replayedQueue.json()).toMatchObject({
      jobId: queued.jobId,
      replayed: true,
    });
    const crossTenantQueue = await queueSync(
      request(
        "https://fortify.test/api/production/integrations/sync-jobs",
        alpha.owner.token,
        jsonBody({
          ...queueInput,
          connectionId: beta.connectionId,
          schemaVersionId: beta.schemaVersionId,
          idempotencyKey: "must-not-cross-tenant",
        }),
      ),
    );
    expect(crossTenantQueue.status).toBe(409);
    const runResponse = await executeSyncJob(
      request(
        `https://fortify.test/api/production/integrations/sync-jobs/${queued.jobId}/run`,
        alpha.owner.token,
        jsonBody({ workerId: "integration-route-worker" }),
      ),
      { params: Promise.resolve({ jobId: queued.jobId }) },
    );
    expect(runResponse.status).toBe(409);
    expect(await runResponse.json()).toMatchObject({
      code: "credential_unavailable",
    });
    const persistedAfterRun = await productionDatabase
      .select({ status: schema.integrationSyncJobs.status })
      .from(schema.integrationSyncJobs)
      .where(eq(schema.integrationSyncJobs.id, queued.jobId));
    expect(persistedAfterRun[0]?.status).toBe("queued");
    const crossTenantRun = await executeSyncJob(
      request(
        `https://fortify.test/api/production/integrations/sync-jobs/${betaJob.jobId}/run`,
        alpha.owner.token,
        jsonBody({ workerId: "must-not-cross-tenant" }),
      ),
      { params: Promise.resolve({ jobId: betaJob.jobId }) },
    );
    expect(crossTenantRun.status).toBe(409);
    await productionDatabase
      .update(schema.integrationSyncJobs)
      .set({
        status: "running",
        attemptCount: 1,
        leaseOwner: "integration-route-worker",
        leaseExpiresAt: "2026-08-04T12:01:00.000Z",
        updatedAt: at,
        updatedBy: alpha.fixture.context.actorSubject,
      })
      .where(eq(schema.integrationSyncJobs.id, queued.jobId));
    await productionDatabase
      .update(schema.integrationSyncJobs)
      .set({
        status: "dead_letter",
        attemptCount: 1,
        deadLetteredAt: at,
        lastErrorCode: "provider_unconfigured",
        lastErrorMessage: "Synthetic dead-letter fixture.",
        updatedAt: at,
        updatedBy: alpha.fixture.context.actorSubject,
      })
      .where(eq(schema.integrationSyncJobs.id, queued.jobId));
    const replayResponse = await replayDeadLetter(
      request(
        `https://fortify.test/api/production/integrations/sync-jobs/${queued.jobId}/replay`,
        alpha.owner.token,
        jsonBody({
          idempotencyKey: "integration-routes-lifecycle-replay-1",
          humanConfirmed: true,
        }),
      ),
      { params: Promise.resolve({ jobId: queued.jobId }) },
    );
    expect(replayResponse.status).toBe(201);
    expect(await replayResponse.json()).toMatchObject({
      supersedesJobId: queued.jobId,
      status: "queued",
    });
    const crossTenantReplay = await replayDeadLetter(
      request(
        `https://fortify.test/api/production/integrations/sync-jobs/${betaJob.jobId}/replay`,
        alpha.owner.token,
        jsonBody({
          idempotencyKey: "must-not-cross-tenant",
          humanConfirmed: true,
        }),
      ),
      { params: Promise.resolve({ jobId: betaJob.jobId }) },
    );
    expect(crossTenantReplay.status).toBe(409);
    const healthResponse = await checkHealth(
      request(
        `https://fortify.test/api/production/integrations/connections/${alpha.connectionId}/health`,
        alpha.owner.token,
        jsonBody({}),
      ),
      { params: Promise.resolve({ connectionId: alpha.connectionId }) },
    );
    expect(healthResponse.status).toBe(409);
    expect(await healthResponse.json()).toMatchObject({
      code: "credential_unavailable",
    });
    const crossTenantHealth = await checkHealth(
      request(
        `https://fortify.test/api/production/integrations/connections/${beta.connectionId}/health`,
        alpha.owner.token,
        jsonBody({}),
      ),
      { params: Promise.resolve({ connectionId: beta.connectionId }) },
    );
    expect(crossTenantHealth.status).toBe(409);
    const transitionResponse = await transitionConnection(
      request(
        `https://fortify.test/api/production/integrations/connections/${alpha.connectionId}/status`,
        alpha.owner.token,
        jsonBody({
          nextStatus: "degraded",
          reason: "Live credential remains unavailable in this runtime.",
          humanConfirmed: true,
        }),
      ),
      { params: Promise.resolve({ connectionId: alpha.connectionId }) },
    );
    expect(transitionResponse.status).toBe(200);
    const crossTenantTransition = await transitionConnection(
      request(
        `https://fortify.test/api/production/integrations/connections/${beta.connectionId}/status`,
        alpha.owner.token,
        jsonBody({
          nextStatus: "degraded",
          reason: "Must not mutate another tenant.",
          humanConfirmed: true,
        }),
      ),
      { params: Promise.resolve({ connectionId: beta.connectionId }) },
    );
    expect(crossTenantTransition.status).toBe(409);
    const betaState = await productionDatabase
      .select({ status: schema.integrationConnections.status })
      .from(schema.integrationConnections)
      .where(eq(schema.integrationConnections.id, beta.connectionId));
    expect(betaState[0]?.status).toBe("connected");
    const workspaceResponse = await getIntegrationWorkspace(
      request(
        "https://fortify.test/api/production/integrations/workspace",
        alpha.owner.token,
      ),
    );
    const workspace = await workspaceResponse.json();
    expect(
      workspace.connections.map((item: { id: string }) => item.id),
    ).toEqual([alpha.connectionId]);
    expect(workspace.endpoints).toHaveLength(1);
    expect(workspace.jobs).toHaveLength(2);
  });
});

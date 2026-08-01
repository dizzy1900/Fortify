import { PGlite } from "@electric-sql/pglite";
import { count, eq, sql } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  IdempotencyConflictError,
  OptimisticConcurrencyError,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  SANDBOX_ORGANIZATION_ID,
  migrateDemoSeedToProduction,
} from "@/lib/production/seed-migration";
import { buildSeedState } from "@/lib/seed";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;

describe("normalized PostgreSQL tenant data plane", () => {
  beforeEach(async () => {
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  test("migrates a blank PostgreSQL-compatible database without DemoState storage", async () => {
    const tables = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    const triggers = await client.query<{ trigger_name: string }>(
      "select trigger_name from information_schema.triggers where trigger_schema = 'public' order by trigger_name",
    );
    expect(tables.rows.map((row) => row.table_name)).toHaveLength(43);
    expect(tables.rows.map((row) => row.table_name)).not.toContain("app_state");
    const triggerNames = [
      ...new Set(triggers.rows.map((row) => row.trigger_name)),
    ];
    expect(triggerNames).toEqual(
      expect.arrayContaining([
        "audit_events_no_delete",
        "audit_events_no_update",
        "evidence_versions_no_delete",
        "evidence_versions_no_update",
        "requirement_versions_no_delete",
        "requirement_versions_no_update",
        "submission_versions_no_delete",
        "submission_versions_no_update",
        "tenant_guard_communities_client",
        "tenant_guard_evidence_links_evidence",
        "tenant_guard_submissions_case",
        "tenant_guard_invitations_membership",
        "tenant_guard_external_access_case",
      ]),
    );
    expect(triggerNames.length).toBeGreaterThan(45);
  });

  test("isolates reads and mutations by explicit organization context", async () => {
    const alpha = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "alpha",
    );
    const beta = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "beta",
    );
    expect(await alpha.repository.listCommunities(alpha.context)).toHaveLength(1);
    expect(await beta.repository.listCommunities(beta.context)).toHaveLength(1);
    expect(
      await alpha.repository.getCommunity(alpha.context, beta.communityId),
    ).toBeNull();
    await expect(
      alpha.repository.updateCommunitySummary(
        alpha.context,
        beta.communityId,
        1,
        "Cross-tenant write",
      ),
    ).rejects.toBeInstanceOf(TenantResourceNotFoundError);
    await expect(
      database.insert(schema.communities).values({
        id: "community-cross-tenant",
        organizationId: alpha.organizationId,
        clientId: beta.clientId,
        name: "Invalid cross-tenant community",
        propertyClass: "condominium",
        summary: "Must never persist",
        createdAt: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-08-01T12:00:00.000Z",
        createdBy: alpha.context.actorSubject,
        updatedBy: alpha.context.actorSubject,
        revision: 1,
        lifecycleStatus: "active",
      }),
    ).rejects.toThrow();
    expect(
      await alpha.repository.getCommunity(
        alpha.context,
        "community-cross-tenant",
      ),
    ).toBeNull();
  });

  test("uses optimistic concurrency and commits audit with the mutation", async () => {
    const fixture = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "concurrency",
    );
    const updated = await fixture.repository.updateCommunitySummary(
      fixture.context,
      fixture.communityId,
      1,
      "Broker-confirmed summary",
    );
    expect(updated.revision).toBe(2);
    await expect(
      fixture.repository.updateCommunitySummary(
        fixture.context,
        fixture.communityId,
        1,
        "Stale write",
      ),
    ).rejects.toBeInstanceOf(OptimisticConcurrencyError);
    const events = await fixture.repository.listAuditEvents(fixture.context);
    expect(events.map((event) => event.action)).toEqual([
      "community.created",
      "community.summary_updated",
    ]);
    await expect(
      database
        .update(schema.auditEvents)
        .set({ action: "tampered" })
        .where(eq(schema.auditEvents.id, events[0].id)),
    ).rejects.toThrow();
    const unchangedAudit = await database
      .select({ action: schema.auditEvents.action })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.id, events[0].id));
    expect(unchangedAudit[0].action).toBe("community.created");
  });

  test("replays identical case creation and rejects idempotency key reuse", async () => {
    const fixture = await createTenantFixture(
      database as unknown as ProductionDatabaseLike,
      "idempotency",
    );
    const input = {
      id: "case-idempotency",
      policyId: fixture.policyId,
      title: "2027 renewal",
      status: "open",
      caseType: "renewal" as const,
      peril: "wildfire",
      jurisdiction: "US-CO",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
    };
    const first = await fixture.repository.createRenewalCase(
      fixture.context,
      "request-1",
      input,
    );
    const replay = await fixture.repository.createRenewalCase(
      fixture.context,
      "request-1",
      input,
    );
    expect(replay).toEqual(first);
    const caseCount = await database
      .select({ value: count() })
      .from(schema.renewalCases)
      .where(
        eq(schema.renewalCases.organizationId, fixture.organizationId),
      );
    expect(caseCount[0].value).toBe(1);
    await expect(
      fixture.repository.createRenewalCase(fixture.context, "request-1", {
        ...input,
        title: "Different request",
      }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  test("migrates the deterministic seed into an isolated synthetic organization", async () => {
    const seed = buildSeedState();
    const receipt = await migrateDemoSeedToProduction(
      database as unknown as ProductionDatabaseLike,
      seed,
    );
    expect(receipt.replayed).toBe(false);
    expect(receipt.organizationId).toBe(SANDBOX_ORGANIZATION_ID);
    expect(receipt.counts).toMatchObject({
      communities: 3,
      requirements: 28,
      evidenceVersions: 42,
      submissions: 3,
    });
    const replay = await migrateDemoSeedToProduction(
      database as unknown as ProductionDatabaseLike,
      seed,
    );
    expect(replay.replayed).toBe(true);
    const sandbox = await database
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, SANDBOX_ORGANIZATION_ID));
    expect(sandbox[0]).toMatchObject({
      environment: "sandbox",
      synthetic: true,
      crossCustomerAnalyticsOptIn: false,
    });
    const evidenceCount = await database
      .select({ value: count() })
      .from(schema.evidenceVersions)
      .where(
        eq(
          schema.evidenceVersions.organizationId,
          SANDBOX_ORGANIZATION_ID,
        ),
      );
    expect(evidenceCount[0].value).toBe(42);
    const evidence = await database
      .select({ id: schema.evidenceVersions.id })
      .from(schema.evidenceVersions)
      .limit(1);
    await expect(
      database
        .update(schema.evidenceVersions)
        .set({ reviewStatus: "tampered" })
        .where(eq(schema.evidenceVersions.id, evidence[0].id)),
    ).rejects.toThrow();
    const unchangedEvidence = await database
      .select({ reviewStatus: schema.evidenceVersions.reviewStatus })
      .from(schema.evidenceVersions)
      .where(eq(schema.evidenceVersions.id, evidence[0].id));
    expect(unchangedEvidence[0].reviewStatus).not.toBe("tampered");
    const stateTable = await database.execute(
      sql`select to_regclass('public.app_state') as name`,
    );
    expect(stateTable.rows[0]).toEqual({ name: null });
  });

  test("rolls back a failed seed migration without partial tenant records", async () => {
    const brokenSeed = structuredClone(buildSeedState());
    brokenSeed.evidence[1].sha256 = brokenSeed.evidence[0].sha256;
    await expect(
      migrateDemoSeedToProduction(
        database as unknown as ProductionDatabaseLike,
        brokenSeed,
      ),
    ).rejects.toThrow();
    const communitiesAfterFailure = await database
      .select({ value: count() })
      .from(schema.communities)
      .where(
        eq(schema.communities.organizationId, SANDBOX_ORGANIZATION_ID),
      );
    const receiptsAfterFailure = await database
      .select({ value: count() })
      .from(schema.idempotencyKeys)
      .where(
        eq(schema.idempotencyKeys.organizationId, SANDBOX_ORGANIZATION_ID),
      );
    expect(communitiesAfterFailure[0].value).toBe(0);
    expect(receiptsAfterFailure[0].value).toBe(0);
  });
});

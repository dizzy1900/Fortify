import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { PgQueryResultHKT } from "drizzle-orm/pg-core/session";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";

export interface TenantContext {
  organizationId: string;
  actorSubject: string;
}

export interface OrganizationInput {
  id: string;
  slug: string;
  name: string;
  kind: string;
  environment: "sandbox" | "production";
  synthetic: boolean;
  actorSubject: string;
}

export interface CommunityInput {
  id: string;
  clientId: string;
  name: string;
  propertyClass: string;
  summary?: string;
  externalSystem?: string;
  externalId?: string;
}

export interface RenewalCaseInput {
  id: string;
  policyId: string;
  title: string;
  status: string;
  caseType: "renewal" | "appeal";
  peril: string;
  jurisdiction: string;
  propertyClass: string;
  renewalDate: string;
  appealDeadline?: string;
  ownerSubject?: string;
}

export class TenantContextError extends Error {
  constructor(message = "A tenant and actor context is required.") {
    super(message);
    this.name = "TenantContextError";
  }
}

export class TenantResourceNotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} was not found in the active organization.`);
    this.name = "TenantResourceNotFoundError";
  }
}

export class OptimisticConcurrencyError extends Error {
  constructor(resource: string) {
    super(`${resource} changed since it was loaded.`);
    this.name = "OptimisticConcurrencyError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("The idempotency key was already used for a different request.");
    this.name = "IdempotencyConflictError";
  }
}

export type ProductionDatabaseLike = PgDatabase<
  PgQueryResultHKT,
  typeof schema
>;

const now = () => new Date().toISOString();

function requireContext(context: TenantContext) {
  if (!context.organizationId?.trim() || !context.actorSubject?.trim())
    throw new TenantContextError();
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function tenantRecord(context: TenantContext, at = now()) {
  return {
    organizationId: context.organizationId,
    createdAt: at,
    updatedAt: at,
    createdBy: context.actorSubject,
    updatedBy: context.actorSubject,
    revision: 1,
    lifecycleStatus: "active",
  };
}

async function appendAudit(
  database: ProductionDatabaseLike,
  context: TenantContext,
  input: {
    action: string;
    resourceType: string;
    resourceId: string;
    detail: Record<string, unknown>;
    occurredAt?: string;
  },
) {
  const previous = await database
    .select({ eventHash: schema.auditEvents.eventHash })
    .from(schema.auditEvents)
    .where(eq(schema.auditEvents.organizationId, context.organizationId))
    .orderBy(desc(schema.auditEvents.occurredAt), desc(schema.auditEvents.id))
    .limit(1);
  const occurredAt = input.occurredAt ?? now();
  const previousHash = previous[0]?.eventHash;
  const eventHash = digest({
    previousHash: previousHash ?? "GENESIS",
    organizationId: context.organizationId,
    actorSubject: context.actorSubject,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    detail: input.detail,
    occurredAt,
  });
  await database.insert(schema.auditEvents).values({
    id: randomUUID(),
    organizationId: context.organizationId,
    actorSubject: context.actorSubject,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    detail: input.detail,
    previousHash,
    eventHash,
    occurredAt,
  });
  return eventHash;
}

export class TenantRepository {
  constructor(readonly database: ProductionDatabaseLike) {}

  async bootstrapOrganization(input: OrganizationInput) {
    if (input.environment === "sandbox" && !input.synthetic)
      throw new Error("Sandbox organizations must be explicitly synthetic.");
    if (input.environment === "production" && input.synthetic)
      throw new Error("Production organizations cannot be marked synthetic.");
    const at = now();
    const inserted = await this.database
      .insert(schema.organizations)
      .values({
        id: input.id,
        slug: input.slug,
        name: input.name,
        kind: input.kind,
        environment: input.environment,
        synthetic: input.synthetic,
        crossCustomerAnalyticsOptIn: false,
        createdAt: at,
        updatedAt: at,
        createdBy: input.actorSubject,
        updatedBy: input.actorSubject,
        revision: 1,
        lifecycleStatus: "active",
      })
      .onConflictDoNothing({ target: schema.organizations.id })
      .returning();
    if (inserted[0]) return inserted[0];
    const existing = await this.database
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.id, input.id))
      .limit(1);
    return existing[0];
  }

  async createCommunity(context: TenantContext, input: CommunityInput) {
    requireContext(context);
    return this.database.transaction(async (transaction) => {
      const parent = await transaction
        .select({ id: schema.clients.id })
        .from(schema.clients)
        .where(
          and(
            eq(schema.clients.id, input.clientId),
            eq(schema.clients.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!parent[0]) throw new TenantResourceNotFoundError("Client");
      const at = now();
      const inserted = await transaction
        .insert(schema.communities)
        .values({
          id: input.id,
          ...tenantRecord(context, at),
          clientId: input.clientId,
          name: input.name,
          propertyClass: input.propertyClass,
          summary: input.summary ?? "",
          externalSystem: input.externalSystem,
          externalId: input.externalId,
        })
        .returning();
      await appendAudit(transaction, context, {
        action: "community.created",
        resourceType: "community",
        resourceId: input.id,
        detail: { name: input.name, propertyClass: input.propertyClass },
        occurredAt: at,
      });
      return inserted[0];
    });
  }

  async listCommunities(context: TenantContext) {
    requireContext(context);
    return this.database
      .select()
      .from(schema.communities)
      .where(
        and(
          eq(schema.communities.organizationId, context.organizationId),
          eq(schema.communities.lifecycleStatus, "active"),
        ),
      )
      .orderBy(schema.communities.name);
  }

  async getCommunity(context: TenantContext, communityId: string) {
    requireContext(context);
    const rows = await this.database
      .select()
      .from(schema.communities)
      .where(
        and(
          eq(schema.communities.organizationId, context.organizationId),
          eq(schema.communities.id, communityId),
          eq(schema.communities.lifecycleStatus, "active"),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async updateCommunitySummary(
    context: TenantContext,
    communityId: string,
    expectedRevision: number,
    summary: string,
  ) {
    requireContext(context);
    return this.database.transaction(async (transaction) => {
      const existing = await transaction
        .select({ id: schema.communities.id })
        .from(schema.communities)
        .where(
          and(
            eq(schema.communities.id, communityId),
            eq(schema.communities.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!existing[0]) throw new TenantResourceNotFoundError("Community");
      const at = now();
      const updated = await transaction
        .update(schema.communities)
        .set({
          summary,
          revision: expectedRevision + 1,
          updatedAt: at,
          updatedBy: context.actorSubject,
        })
        .where(
          and(
            eq(schema.communities.id, communityId),
            eq(schema.communities.organizationId, context.organizationId),
            eq(schema.communities.revision, expectedRevision),
          ),
        )
        .returning();
      if (!updated[0]) throw new OptimisticConcurrencyError("Community");
      await appendAudit(transaction, context, {
        action: "community.summary_updated",
        resourceType: "community",
        resourceId: communityId,
        detail: { revision: updated[0].revision },
        occurredAt: at,
      });
      return updated[0];
    });
  }

  async createRenewalCase(
    context: TenantContext,
    idempotencyKey: string,
    input: RenewalCaseInput,
  ) {
    requireContext(context);
    if (!idempotencyKey.trim()) throw new IdempotencyConflictError();
    const requestHash = digest(input);
    return this.database.transaction(async (transaction) => {
      const replay = await transaction
        .select()
        .from(schema.idempotencyKeys)
        .where(
          and(
            eq(schema.idempotencyKeys.organizationId, context.organizationId),
            eq(schema.idempotencyKeys.scope, "renewal_case.create"),
            eq(schema.idempotencyKeys.key, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) {
        if (replay[0].requestHash !== requestHash)
          throw new IdempotencyConflictError();
        return replay[0].responseJson as unknown as typeof schema.renewalCases.$inferSelect;
      }
      const policy = await transaction
        .select({ id: schema.policies.id })
        .from(schema.policies)
        .where(
          and(
            eq(schema.policies.id, input.policyId),
            eq(schema.policies.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!policy[0]) throw new TenantResourceNotFoundError("Policy");
      const at = now();
      const inserted = await transaction
        .insert(schema.renewalCases)
        .values({
          id: input.id,
          ...tenantRecord(context, at),
          policyId: input.policyId,
          title: input.title,
          status: input.status,
          caseType: input.caseType,
          peril: input.peril,
          jurisdiction: input.jurisdiction,
          propertyClass: input.propertyClass,
          renewalDate: input.renewalDate,
          appealDeadline: input.appealDeadline,
          ownerSubject: input.ownerSubject,
        })
        .returning();
      await appendAudit(transaction, context, {
        action: "renewal_case.created",
        resourceType: "renewal_case",
        resourceId: input.id,
        detail: {
          policyId: input.policyId,
          peril: input.peril,
          jurisdiction: input.jurisdiction,
        },
        occurredAt: at,
      });
      await transaction.insert(schema.idempotencyKeys).values({
        id: randomUUID(),
        ...tenantRecord(context, at),
        scope: "renewal_case.create",
        key: idempotencyKey,
        requestHash,
        responseJson: inserted[0] as unknown as Record<string, unknown>,
      });
      return inserted[0];
    });
  }

  async listAuditEvents(context: TenantContext) {
    requireContext(context);
    return this.database
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.organizationId, context.organizationId))
      .orderBy(schema.auditEvents.occurredAt, schema.auditEvents.id);
  }
}

export { appendAudit, digest, tenantRecord };

import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import * as schema from "@/db/production/schema";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { withTenantTransaction } from "@/lib/production/tenant-transaction";

const RECEIPT_SCHEMA = "fortify.managed-postgres-validation.v1" as const;

export type ManagedPostgresEnvironmentCheck = {
  key: string;
  ok: boolean;
  detail: string;
};

export type ManagedPostgresCheck = {
  name: string;
  status: "pass";
  detail: string;
};

export type ManagedPostgresValidationReceipt = {
  schema: typeof RECEIPT_SCHEMA;
  status: "pass";
  environment: "staging";
  checkedAt: string;
  checks: ManagedPostgresCheck[];
};

export type ManagedPostgresFailureReceipt = {
  schema: typeof RECEIPT_SCHEMA;
  status: "fail";
  environment: "staging" | "unresolved";
  checkedAt: string;
  failedCheck: string;
  detail: "Managed PostgreSQL validation failed closed.";
};

export class ManagedPostgresValidationError extends Error {
  constructor(
    readonly check: string,
    message: string,
  ) {
    super(message);
    this.name = "ManagedPostgresValidationError";
  }
}

type RoleRow = QueryResultRow & {
  rolcanlogin: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolinherit: boolean;
  rolname: string;
  rolreplication: boolean;
  rolsuper: boolean;
  rolbypassrls: boolean;
};

type SessionRow = QueryResultRow & {
  backend_pid: number;
  current_role: string;
  session_role: string;
  ssl: boolean;
};

type ContextRow = QueryResultRow & {
  actor: string | null;
  tenant: string | null;
};

type PolicyCoverageRow = QueryResultRow & {
  disabled_count: string;
  missing_count: string;
  policy_count: string;
  tenant_table_count: string;
};

type ProbeFixture = {
  alphaCommunityId: string;
  alphaOrganizationId: string;
  betaCommunityId: string;
  betaOrganizationId: string;
  slugSuffix: string;
};

function required(value: string | undefined) {
  return Boolean(value?.trim());
}

export function inspectManagedPostgresValidationEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ManagedPostgresEnvironmentCheck[] {
  const migrationUrl = environment.DATABASE_URL;
  const applicationUrl = environment.FORTIFY_APP_DATABASE_URL;
  return [
    {
      key: "FORTIFY_RUNTIME_MODE",
      ok: environment.FORTIFY_RUNTIME_MODE === "production",
      detail:
        environment.FORTIFY_RUNTIME_MODE === "production"
          ? "production"
          : "production_required",
    },
    {
      key: "FORTIFY_VALIDATION_ENVIRONMENT",
      ok: environment.FORTIFY_VALIDATION_ENVIRONMENT === "staging",
      detail:
        environment.FORTIFY_VALIDATION_ENVIRONMENT === "staging"
          ? "staging"
          : "staging_required",
    },
    {
      key: "DATABASE_URL",
      ok: required(migrationUrl),
      detail: required(migrationUrl) ? "configured" : "missing",
    },
    {
      key: "FORTIFY_APP_DATABASE_URL",
      ok: required(applicationUrl),
      detail: required(applicationUrl) ? "configured" : "missing",
    },
    {
      key: "FORTIFY_DATABASE_ROLE_SEPARATION",
      ok:
        required(migrationUrl) &&
        required(applicationUrl) &&
        migrationUrl !== applicationUrl,
      detail:
        required(migrationUrl) &&
        required(applicationUrl) &&
        migrationUrl !== applicationUrl
          ? "distinct_credentials"
          : "distinct_credentials_required",
    },
  ];
}

export function validateManagedPostgresValidationEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const failed = inspectManagedPostgresValidationEnvironment(environment).find(
    (check) => !check.ok,
  );
  if (failed)
    throw new ManagedPostgresValidationError(
      failed.key,
      `Managed PostgreSQL validation requires ${failed.key}.`,
    );
  return {
    migrationDatabaseUrl: environment.DATABASE_URL as string,
    applicationDatabaseUrl: environment.FORTIFY_APP_DATABASE_URL as string,
  };
}

export function createManagedPostgresFailureReceipt(
  error: unknown,
  environment: NodeJS.ProcessEnv = process.env,
  checkedAt = new Date().toISOString(),
): ManagedPostgresFailureReceipt {
  return {
    schema: RECEIPT_SCHEMA,
    status: "fail",
    environment:
      environment.FORTIFY_VALIDATION_ENVIRONMENT === "staging"
        ? "staging"
        : "unresolved",
    checkedAt,
    failedCheck:
      error instanceof ManagedPostgresValidationError
        ? error.check
        : "unexpected_failure",
    detail: "Managed PostgreSQL validation failed closed.",
  };
}

function assertCheck(
  condition: unknown,
  check: string,
  message: string,
): asserts condition {
  if (!condition) throw new ManagedPostgresValidationError(check, message);
}

function postgresErrorCode(error: unknown) {
  let current = error;
  const visited = new Set<unknown>();
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object" || visited.has(current))
      return undefined;
    visited.add(current);
    const candidate = current as { cause?: unknown; code?: unknown };
    if (typeof candidate.code === "string") return candidate.code;
    current = candidate.cause;
  }
  return undefined;
}

async function oneRow<Row extends QueryResultRow>(
  client: PoolClient,
  query: string,
  values: unknown[] = [],
) {
  const result = await client.query<Row>(query, values);
  assertCheck(
    result.rows.length === 1,
    "database_contract",
    "Expected one database result row.",
  );
  return result.rows[0] as Row;
}

async function readSession(client: PoolClient) {
  return oneRow<SessionRow>(
    client,
    `select
      pg_backend_pid() as backend_pid,
      current_user as current_role,
      session_user as session_role,
      coalesce((select ssl from pg_stat_ssl where pid = pg_backend_pid()), false) as ssl`,
  );
}

async function readContext(client: PoolClient) {
  return oneRow<ContextRow>(
    client,
    `select
      nullif(current_setting('fortify.organization_id', true), '') as tenant,
      nullif(current_setting('fortify.actor_subject', true), '') as actor`,
  );
}

async function beginTenant(
  client: PoolClient,
  organizationId?: string,
  actorSubject?: string,
) {
  await client.query("begin");
  await client.query("set local role fortify_app");
  if (organizationId && actorSubject) {
    await client.query(
      "select set_config('fortify.organization_id', $1, true)",
      [organizationId],
    );
    await client.query("select set_config('fortify.actor_subject', $1, true)", [
      actorSubject,
    ]);
  }
}

async function countFixtureRows(client: PoolClient, fixture: ProbeFixture) {
  const result = await oneRow<{ count: string }>(
    client,
    `select count(*)::text as count
     from communities
     where id = any($1::text[])`,
    [[fixture.alphaCommunityId, fixture.betaCommunityId]],
  );
  return Number(result.count);
}

function createFixture(): ProbeFixture {
  const suffix = randomUUID();
  return {
    slugSuffix: suffix,
    alphaOrganizationId: `managed-probe-alpha-${suffix}`,
    betaOrganizationId: `managed-probe-beta-${suffix}`,
    alphaCommunityId: `managed-probe-community-alpha-${suffix}`,
    betaCommunityId: `managed-probe-community-beta-${suffix}`,
  };
}

async function insertFixture(client: PoolClient, fixture: ProbeFixture) {
  await client.query("begin");
  try {
    await client.query(
      `insert into organizations
        (id, slug, name, kind, environment, synthetic, created_by, updated_by)
       values
        ($1, $2, 'Fortify managed validation alpha', 'validation_fixture', 'production', true, 'managed-postgres-validation', 'managed-postgres-validation'),
        ($3, $4, 'Fortify managed validation beta', 'validation_fixture', 'production', true, 'managed-postgres-validation', 'managed-postgres-validation')`,
      [
        fixture.alphaOrganizationId,
        `managed-probe-alpha-${fixture.slugSuffix}`,
        fixture.betaOrganizationId,
        `managed-probe-beta-${fixture.slugSuffix}`,
      ],
    );
    await client.query(
      `insert into communities
        (id, organization_id, name, property_class, summary, created_by, updated_by)
       values
        ($1, $2, 'Managed validation alpha community', 'condominium', 'Synthetic validation fixture', 'managed-postgres-validation', 'managed-postgres-validation'),
        ($3, $4, 'Managed validation beta community', 'condominium', 'Synthetic validation fixture', 'managed-postgres-validation', 'managed-postgres-validation')`,
      [
        fixture.alphaCommunityId,
        fixture.alphaOrganizationId,
        fixture.betaCommunityId,
        fixture.betaOrganizationId,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function deleteFixture(client: PoolClient, fixture: ProbeFixture) {
  await client.query("begin");
  try {
    await client.query("delete from communities where id = any($1::text[])", [
      [fixture.alphaCommunityId, fixture.betaCommunityId],
    ]);
    await client.query("delete from organizations where id = any($1::text[])", [
      [fixture.alphaOrganizationId, fixture.betaOrganizationId],
    ]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

export async function validateManagedPostgres(
  environment: NodeJS.ProcessEnv = process.env,
  checkedAt = new Date().toISOString(),
): Promise<ManagedPostgresValidationReceipt> {
  const { migrationDatabaseUrl, applicationDatabaseUrl } =
    validateManagedPostgresValidationEnvironment(environment);
  const migrationPool = new Pool({
    connectionString: migrationDatabaseUrl,
    application_name: "fortify-managed-validation-owner",
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 15_000,
    allowExitOnIdle: true,
  });
  const applicationPool = new Pool({
    connectionString: applicationDatabaseUrl,
    application_name: "fortify-managed-validation-app",
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 15_000,
    allowExitOnIdle: true,
  });
  const checks: ManagedPostgresCheck[] = [];
  const fixture = createFixture();
  let fixtureInserted = false;
  let migrationClient: PoolClient | undefined;
  let firstBackendPid = 0;
  let policyCoverage: PolicyCoverageRow | undefined;
  let cleanupFailure: unknown;

  try {
    migrationClient = await migrationPool.connect();
    const ownerSession = await readSession(migrationClient);
    assertCheck(
      ownerSession.ssl,
      "encrypted_transport",
      "The migration connection must use TLS.",
    );

    const applicationClient = await applicationPool.connect();
    try {
      const applicationSession = await readSession(applicationClient);
      firstBackendPid = applicationSession.backend_pid;
      assertCheck(
        applicationSession.ssl,
        "encrypted_transport",
        "The application connection must use TLS.",
      );
      assertCheck(
        ownerSession.session_role !== applicationSession.session_role,
        "distinct_logins",
        "Migration and application sessions must use distinct logins.",
      );

      const applicationRole = await oneRow<RoleRow>(
        applicationClient,
        `select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
                rolinherit, rolreplication, rolbypassrls
         from pg_roles where rolname = current_user`,
      );
      assertCheck(
        applicationRole.rolcanlogin &&
          !applicationRole.rolsuper &&
          !applicationRole.rolcreatedb &&
          !applicationRole.rolcreaterole &&
          !applicationRole.rolinherit &&
          !applicationRole.rolreplication &&
          !applicationRole.rolbypassrls,
        "application_login_attributes",
        "The application login must be LOGIN, NOINHERIT, and non-privileged.",
      );
      const membership = await oneRow<{ member: boolean }>(
        applicationClient,
        "select pg_has_role(current_user, 'fortify_app', 'MEMBER') as member",
      );
      assertCheck(
        membership.member,
        "application_role_membership",
        "The application login must be a member of fortify_app.",
      );
      const ownedTables = await oneRow<{ count: string }>(
        applicationClient,
        `select count(*)::text as count
         from pg_class relation
         join pg_namespace namespace on namespace.oid = relation.relnamespace
         where namespace.nspname = 'public'
           and relation.relkind in ('r', 'p')
           and pg_get_userbyid(relation.relowner) in (current_user, 'fortify_app')`,
      );
      assertCheck(
        Number(ownedTables.count) === 0,
        "application_table_ownership",
        "Neither the application login nor fortify_app may own public tables.",
      );

      const fortifyRole = await oneRow<RoleRow>(
        applicationClient,
        `select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
                rolinherit, rolreplication, rolbypassrls
         from pg_roles where rolname = 'fortify_app'`,
      );
      assertCheck(
        !fortifyRole.rolcanlogin &&
          !fortifyRole.rolsuper &&
          !fortifyRole.rolcreatedb &&
          !fortifyRole.rolcreaterole &&
          !fortifyRole.rolinherit &&
          !fortifyRole.rolreplication &&
          !fortifyRole.rolbypassrls,
        "fortify_app_role_attributes",
        "fortify_app must remain a non-login, non-privileged role.",
      );

      let directTableAccessDenied = false;
      try {
        await applicationClient.query("select count(*) from communities");
      } catch (error) {
        directTableAccessDenied = postgresErrorCode(error) === "42501";
      }
      assertCheck(
        directTableAccessDenied,
        "transaction_role_required",
        "The NOINHERIT application login must not query tenant tables before SET LOCAL ROLE.",
      );

      await beginTenant(applicationClient);
      const roleProbe = await readSession(applicationClient);
      assertCheck(
        roleProbe.current_role === "fortify_app" &&
          roleProbe.session_role === applicationSession.session_role,
        "set_local_role",
        "SET LOCAL ROLE must activate fortify_app without changing the login.",
      );

      policyCoverage = await oneRow<PolicyCoverageRow>(
        applicationClient,
        `with tenant_tables as (
           select distinct table_name
           from information_schema.columns
           where table_schema = 'public' and column_name = 'organization_id'
         ), policies as (
           select tablename
           from pg_policies
           where schemaname = 'public' and policyname = 'fortify_tenant_isolation'
         ), rls_state as (
           select relation.relname as table_name, relation.relrowsecurity
           from pg_class relation
           join pg_namespace namespace on namespace.oid = relation.relnamespace
           where namespace.nspname = 'public' and relation.relkind in ('r', 'p')
         )
         select
           (select count(*)::text from tenant_tables) as tenant_table_count,
           (select count(*)::text from policies) as policy_count,
           (select count(*)::text from tenant_tables
              where table_name not in (select tablename from policies)) as missing_count,
           (select count(*)::text from tenant_tables
              join rls_state using (table_name)
              where not relrowsecurity) as disabled_count`,
      );
      assertCheck(
        Number(policyCoverage.tenant_table_count) > 0 &&
          policyCoverage.missing_count === "0" &&
          policyCoverage.disabled_count === "0" &&
          policyCoverage.policy_count === policyCoverage.tenant_table_count,
        "tenant_policy_coverage",
        "Every tenant table must have the Fortify isolation policy.",
      );
      await applicationClient.query("rollback");
    } finally {
      applicationClient.release();
    }

    await insertFixture(migrationClient, fixture);
    fixtureInserted = true;

    const database = drizzle(applicationPool, { schema });
    const alphaContext = {
      organizationId: fixture.alphaOrganizationId,
      actorSubject: "managed-probe-alpha-actor",
      principalType: "membership" as const,
      role: "organization_owner" as const,
      grantedScopes: [],
    };
    const betaContext = {
      organizationId: fixture.betaOrganizationId,
      actorSubject: "managed-probe-beta-actor",
      principalType: "membership" as const,
      role: "organization_owner" as const,
      grantedScopes: [],
    };
    const alphaRows = await withTenantTransaction<
      Array<typeof schema.communities.$inferSelect>
    >(
      alphaContext,
      (transaction) => transaction.select().from(schema.communities),
      database as unknown as ProductionDatabaseLike,
    );
    assertCheck(
      alphaRows.length === 1 &&
        alphaRows[0]?.id === fixture.alphaCommunityId &&
        alphaRows[0]?.organizationId === fixture.alphaOrganizationId,
      "request_bound_alpha_read",
      "The request transaction must return only the alpha tenant row.",
    );
    const betaRows = await withTenantTransaction<
      Array<typeof schema.communities.$inferSelect>
    >(
      betaContext,
      (transaction) => transaction.select().from(schema.communities),
      database as unknown as ProductionDatabaseLike,
    );
    assertCheck(
      betaRows.length === 1 &&
        betaRows[0]?.id === fixture.betaCommunityId &&
        betaRows[0]?.organizationId === fixture.betaOrganizationId,
      "request_bound_beta_read",
      "The request transaction must return only the beta tenant row.",
    );

    let crossTenantWriteRejected = false;
    try {
      await withTenantTransaction(
        alphaContext,
        (transaction) =>
          transaction.insert(schema.communities).values({
            id: `managed-probe-cross-tenant-${fixture.slugSuffix}`,
            organizationId: fixture.betaOrganizationId,
            name: "Must be rejected by managed RLS",
            propertyClass: "condominium",
            summary: "Synthetic validation fixture",
            createdBy: alphaContext.actorSubject,
            updatedBy: alphaContext.actorSubject,
          }),
        database as unknown as ProductionDatabaseLike,
      );
    } catch (error) {
      crossTenantWriteRejected = postgresErrorCode(error) === "42501";
    }
    assertCheck(
      crossTenantWriteRejected,
      "cross_tenant_write_rejection",
      "Managed PostgreSQL must reject a cross-tenant insert.",
    );

    const resetClient = await applicationPool.connect();
    try {
      const reusedSession = await readSession(resetClient);
      assertCheck(
        reusedSession.backend_pid === firstBackendPid,
        "pooled_connection_reuse",
        "The one-connection pool must reuse the same backend session.",
      );

      const committedContext = await readContext(resetClient);
      assertCheck(
        committedContext.tenant === null && committedContext.actor === null,
        "commit_context_reset",
        "Tenant and actor settings must clear after commit.",
      );
      await beginTenant(resetClient);
      const unscopedAfterCommit = await countFixtureRows(resetClient, fixture);
      assertCheck(
        unscopedAfterCommit === 0,
        "commit_unscoped_read",
        "The reused connection must expose no tenant rows after commit.",
      );
      await resetClient.query("rollback");

      await beginTenant(
        resetClient,
        fixture.betaOrganizationId,
        "managed-probe-rollback-actor",
      );
      assertCheck(
        (await countFixtureRows(resetClient, fixture)) === 1,
        "rollback_scoped_read",
        "The rollback probe must see its selected tenant before rollback.",
      );
      await resetClient.query("rollback");
      const rolledBackContext = await readContext(resetClient);
      assertCheck(
        rolledBackContext.tenant === null && rolledBackContext.actor === null,
        "rollback_context_reset",
        "Tenant and actor settings must clear after rollback.",
      );
      await beginTenant(resetClient);
      const unscopedAfterRollback = await countFixtureRows(
        resetClient,
        fixture,
      );
      assertCheck(
        unscopedAfterRollback === 0,
        "rollback_unscoped_read",
        "The reused connection must expose no tenant rows after rollback.",
      );
      await resetClient.query("rollback");
    } finally {
      resetClient.release();
    }

    assertCheck(
      policyCoverage,
      "tenant_policy_coverage",
      "Tenant policy coverage was not measured.",
    );
    checks.push(
      {
        name: "encrypted_transport",
        status: "pass",
        detail: "migration_and_application_tls",
      },
      {
        name: "role_separation",
        status: "pass",
        detail: "distinct_non_owner_noinherit_application_login",
      },
      {
        name: "tenant_policy_coverage",
        status: "pass",
        detail: `${policyCoverage.policy_count}_of_${policyCoverage.tenant_table_count}`,
      },
      {
        name: "request_bound_rls",
        status: "pass",
        detail: "alpha_and_beta_reads_isolated_cross_write_rejected",
      },
      {
        name: "pooled_context_reset",
        status: "pass",
        detail: "same_backend_commit_and_rollback_clear_context",
      },
    );
  } finally {
    if (fixtureInserted && migrationClient) {
      try {
        await deleteFixture(migrationClient, fixture);
        checks.push({
          name: "fixture_cleanup",
          status: "pass",
          detail: "synthetic_probe_rows_removed",
        });
      } catch (cleanupError) {
        cleanupFailure = cleanupError;
      }
    }
    migrationClient?.release();
    await Promise.allSettled([migrationPool.end(), applicationPool.end()]);
    if (cleanupFailure)
      throw new ManagedPostgresValidationError(
        "fixture_cleanup",
        cleanupFailure instanceof Error
          ? cleanupFailure.message
          : "Managed validation fixture cleanup failed.",
      );
  }

  return {
    schema: RECEIPT_SCHEMA,
    status: "pass",
    environment: "staging",
    checkedAt,
    checks,
  };
}

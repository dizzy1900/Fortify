import { sql } from "drizzle-orm";
import { getProductionDatabase } from "@/db/production/client";
import {
  TenantContextError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export type TenantTransaction = ProductionDatabaseLike;

function requireTenantTransactionContext(context: TenantContext) {
  if (!context.organizationId?.trim() || !context.actorSubject?.trim())
    throw new TenantContextError();
}

export async function setApplicationTransactionRole(
  transaction: TenantTransaction,
) {
  await transaction.execute(sql`set local role fortify_app`);
}

export async function setTenantTransactionContext(
  transaction: TenantTransaction,
  context: TenantContext,
) {
  requireTenantTransactionContext(context);
  await transaction.execute(
    sql`select set_config('fortify.organization_id', ${context.organizationId}, true)`,
  );
  await transaction.execute(
    sql`select set_config('fortify.actor_subject', ${context.actorSubject}, true)`,
  );
}

/**
 * Runs global authentication/bootstrap work as the non-owner application role.
 * Tenant-owned records must not be accessed until the caller has resolved and
 * set an explicit tenant context on this transaction.
 */
export async function withApplicationTransaction<T>(
  operation: (transaction: TenantTransaction) => Promise<T>,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
): Promise<T> {
  return database.transaction(async (transaction) => {
    const applicationTransaction = transaction as unknown as TenantTransaction;
    await setApplicationTransactionRole(applicationTransaction);
    return operation(applicationTransaction);
  });
}

/**
 * Runs tenant work on one checked-out connection with transaction-local RLS
 * context. SET LOCAL prevents organization and actor state from surviving a
 * commit or rollback when the connection returns to the pool.
 */
export async function withTenantTransaction<T>(
  context: TenantContext,
  operation: (transaction: TenantTransaction) => Promise<T>,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
): Promise<T> {
  requireTenantTransactionContext(context);
  return withApplicationTransaction(async (tenantTransaction) => {
    await setTenantTransactionContext(tenantTransaction, context);
    return operation(tenantTransaction);
  }, database);
}

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
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`set local role fortify_app`);
    await transaction.execute(
      sql`select set_config('fortify.organization_id', ${context.organizationId}, true)`,
    );
    await transaction.execute(
      sql`select set_config('fortify.actor_subject', ${context.actorSubject}, true)`,
    );
    return operation(transaction as unknown as TenantTransaction);
  });
}

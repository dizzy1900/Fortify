import { sql } from "drizzle-orm";
import type { TenantTransaction } from "@/lib/production/tenant-transaction";

export type TenantBootstrapKind =
  | "session"
  | "api_credential"
  | "external_case"
  | "external_project"
  | "external_verification"
  | "webhook_endpoint"
  | "invitation"
  | "authentication_attempt"
  | "identity_membership";

export class TenantBootstrapNotFoundError extends Error {
  constructor() {
    super("No active tenant bootstrap record matched the request credential.");
    this.name = "TenantBootstrapNotFoundError";
  }
}

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | undefined)?.rows;
  return rows ?? [];
}

/**
 * Resolves only the organization identifier needed to enter RLS. The
 * SECURITY DEFINER function returns no identity, role, scope, or resource
 * data; the caller must revalidate the complete principal after setting the
 * transaction-local tenant context.
 */
export async function resolveTenantBootstrap(
  transaction: TenantTransaction,
  input: {
    kind: TenantBootstrapKind;
    lookupHash: string;
    credentialPrefix?: string;
  },
) {
  const result = await transaction.execute(
    sql`select public.fortify_resolve_request_tenant(
      ${input.kind},
      ${input.lookupHash},
      ${input.credentialPrefix ?? null}
    ) as organization_id`,
  );
  const organizationId = resultRows<{ organization_id: string | null }>(
    result,
  )[0]?.organization_id;
  if (!organizationId) throw new TenantBootstrapNotFoundError();
  return organizationId;
}

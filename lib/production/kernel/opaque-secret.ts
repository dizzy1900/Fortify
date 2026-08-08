import { createHash } from "node:crypto";

/**
 * Stable one-way digest for opaque credentials stored by bounded contexts.
 *
 * This primitive deliberately owns no identity workflow. Contexts may persist
 * only this digest while the identity context remains responsible for issuing
 * and authenticating credentials.
 */
export function hashOpaqueSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

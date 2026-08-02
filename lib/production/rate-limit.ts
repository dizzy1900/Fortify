import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export class RequestRateLimitError extends Error {
  constructor(
    public readonly retryAfterSeconds: number,
    message = "Request rate limit exceeded.",
  ) {
    super(message);
    this.name = "RequestRateLimitError";
  }
}

export async function consumeRequestRateLimit(
  database: ProductionDatabaseLike,
  request: Request,
  input: { scope: string; limit?: number; windowSeconds?: number },
) {
  const key = process.env.FORTIFY_REQUEST_HASH_KEY;
  if (!key || key.length < 32)
    throw new Error(
      "FORTIFY_REQUEST_HASH_KEY must contain at least 32 characters.",
    );
  const limit = input.limit ?? 120;
  const windowSeconds = input.windowSeconds ?? 60;
  const now = Date.now();
  const windowStartMs =
    Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const credentialClass =
    request.headers.get("authorization")?.split(" ")[0] ?? "cookie-session";
  const bucketHash = createHmac("sha256", key)
    .update(`${input.scope}:${windowStartMs}:${address}:${credentialClass}`)
    .digest("hex");
  const [row] = await database
    .insert(schema.requestRateLimitWindows)
    .values({
      bucketHash,
      scope: input.scope,
      windowStart: new Date(windowStartMs).toISOString(),
      requestCount: 1,
      requestLimit: limit,
      expiresAt: new Date(windowStartMs + windowSeconds * 2000).toISOString(),
      updatedAt: new Date(now).toISOString(),
    })
    .onConflictDoUpdate({
      target: schema.requestRateLimitWindows.bucketHash,
      set: {
        requestCount: sql`${schema.requestRateLimitWindows.requestCount} + 1`,
        updatedAt: new Date(now).toISOString(),
      },
    })
    .returning({ requestCount: schema.requestRateLimitWindows.requestCount });
  if (!row || row.requestCount > limit)
    throw new RequestRateLimitError(
      Math.max(
        1,
        Math.ceil((windowStartMs + windowSeconds * 1000 - now) / 1000),
      ),
    );
  return { remaining: limit - row.requestCount, limit, windowSeconds };
}

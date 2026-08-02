import { createHmac, randomUUID } from "node:crypto";

const SENSITIVE_KEY =
  /(authorization|cookie|secret|token|password|email|body|document|content|signature|database_url|client_secret)/i;

export function requestId(headers: Headers) {
  return headers.get("x-request-id") ?? randomUUID();
}

export function pseudonymousIdentifier(value: string) {
  const key = process.env.FORTIFY_REQUEST_HASH_KEY;
  if (!key) return "unavailable";
  return createHmac("sha256", key).update(value).digest("hex").slice(0, 20);
}

export function redactLogValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLogValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactLogValue(item),
      ]),
    );
  return value;
}

export function logOperationalEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {},
) {
  const entry = JSON.stringify(
    redactLogValue({
      timestamp: new Date().toISOString(),
      level,
      service: "fortify-web",
      event,
      ...fields,
    }),
  );
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

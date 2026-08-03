import { RuntimeConfigurationError } from "@/lib/runtime";

export type EnvironmentCheck = { key: string; ok: boolean; detail: string };

const REQUIRED_PRODUCTION_VALUES = [
  "DATABASE_URL",
  "FORTIFY_APP_DATABASE_URL",
  "FORTIFY_APP_ORIGIN",
  "FORTIFY_OIDC_PROVIDER_KEY",
  "FORTIFY_OIDC_ISSUER",
  "FORTIFY_OIDC_CLIENT_ID",
  "FORTIFY_OIDC_CLIENT_SECRET",
  "FORTIFY_STORAGE_BUCKET",
  "FORTIFY_STORAGE_REGION",
  "FORTIFY_STORAGE_KMS_KEY_ID",
  "FORTIFY_REQUEST_HASH_KEY",
] as const;

const PLACEHOLDER = /(replace[-_ ]?me|example\.com|changeme|todo)/i;

export function inspectProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): EnvironmentCheck[] {
  const checks: EnvironmentCheck[] = REQUIRED_PRODUCTION_VALUES.map((key) => {
    const value = environment[key]?.trim();
    return {
      key,
      ok: Boolean(value) && !PLACEHOLDER.test(value ?? ""),
      detail: !value
        ? "missing"
        : PLACEHOLDER.test(value)
          ? "placeholder"
          : "configured",
    };
  });
  const origin = environment.FORTIFY_APP_ORIGIN;
  checks.push({
    key: "FORTIFY_DATABASE_ROLE_SEPARATION",
    ok:
      Boolean(environment.DATABASE_URL) &&
      Boolean(environment.FORTIFY_APP_DATABASE_URL) &&
      environment.DATABASE_URL !== environment.FORTIFY_APP_DATABASE_URL,
    detail:
      environment.DATABASE_URL &&
      environment.FORTIFY_APP_DATABASE_URL &&
      environment.DATABASE_URL !== environment.FORTIFY_APP_DATABASE_URL
        ? "separate_migration_and_application_logins"
        : "separate_non_owner_application_login_required",
  });
  checks.push({
    key: "FORTIFY_APP_ORIGIN_HTTPS",
    ok: Boolean(origin?.startsWith("https://")),
    detail: origin?.startsWith("https://") ? "https" : "https_required",
  });
  checks.push({
    key: "FORTIFY_LOCAL_IDENTITY_DISABLED",
    ok: environment.FORTIFY_LOCAL_IDENTITY_ENABLED !== "true",
    detail:
      environment.FORTIFY_LOCAL_IDENTITY_ENABLED === "true"
        ? "must_be_disabled"
        : "disabled",
  });
  checks.push({
    key: "FORTIFY_REQUEST_HASH_KEY_ENTROPY",
    ok: (environment.FORTIFY_REQUEST_HASH_KEY?.length ?? 0) >= 32,
    detail:
      (environment.FORTIFY_REQUEST_HASH_KEY?.length ?? 0) >= 32
        ? "minimum_met"
        : "minimum_32_characters",
  });
  return checks;
}

export function validateProductionEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const failed = inspectProductionEnvironment(environment).filter(
    (check) => !check.ok,
  );
  if (failed.length)
    throw new RuntimeConfigurationError(
      `Production environment failed closed: ${failed.map((check) => check.key).join(", ")}.`,
    );
}

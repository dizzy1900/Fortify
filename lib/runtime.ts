export type FortifyRuntimeMode = "sandbox" | "production";

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

export function getRuntimeMode(
  environment: NodeJS.ProcessEnv = process.env,
): FortifyRuntimeMode {
  const configured = environment.FORTIFY_RUNTIME_MODE;
  if (configured === "sandbox" || configured === "production")
    return configured;
  if (configured)
    throw new RuntimeConfigurationError(
      "FORTIFY_RUNTIME_MODE must be sandbox or production.",
    );
  if (environment.NODE_ENV === "production")
    throw new RuntimeConfigurationError(
      "FORTIFY_RUNTIME_MODE is required in production; Fortify will not fall back to the sandbox data plane.",
    );
  return "sandbox";
}

export function requireSandboxRuntime() {
  if (getRuntimeMode() !== "sandbox")
    throw new RuntimeConfigurationError(
      "The deterministic demo data plane is available only in sandbox mode.",
    );
}

export function requireProductionRuntime() {
  if (getRuntimeMode() !== "production")
    throw new RuntimeConfigurationError(
      "The PostgreSQL data plane is available only in production mode.",
    );
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new RuntimeConfigurationError(
      "DATABASE_URL is required for the production PostgreSQL data plane.",
    );
  return { databaseUrl };
}

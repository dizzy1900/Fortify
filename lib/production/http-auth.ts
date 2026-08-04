import type { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import {
  DocumentPipelineStateError,
  DocumentPipelineValidationError,
} from "@/lib/production/document-pipeline-service";
import {
  AuthenticationError,
  hashOpaqueSecret,
  IdentityService,
  type ResolvedPrincipal,
} from "@/lib/production/identity-service";
import { AuthorizationDeniedError } from "@/lib/production/authorization";
import {
  IdempotencyConflictError,
  OptimisticConcurrencyError,
  TenantResourceNotFoundError,
} from "@/lib/production/repository";
import {
  PortfolioImportStateError,
  PortfolioImportValidationError,
} from "@/lib/production/portfolio-import-service";
import {
  ResiliencePlanningStateError,
  ResiliencePlanningValidationError,
} from "@/lib/production/resilience-planning-service";
import {
  PlaybookApplicabilityError,
  PlaybookStateError,
  PlaybookValidationError,
} from "@/lib/production/market-playbook-service";
import { PropertyGraphValidationError } from "@/lib/production/property-graph-service";
import {
  StorageDeletionBlockedError,
  StorageGrantError,
  StorageValidationError,
} from "@/lib/production/storage-service";
import {
  AccessControlStateError,
  AccessControlValidationError,
} from "@/lib/production/access-control-service";
import {
  BrokerageCaseStateError,
  BrokerageCaseValidationError,
} from "@/lib/production/brokerage-case-service";
import {
  GovernedSourceStateError,
  GovernedSourceValidationError,
} from "@/lib/production/governed-source-service";
import {
  FundingProjectStateError,
  FundingProjectService,
  FundingProjectValidationError,
} from "@/lib/production/funding-project-service";
import {
  VerificationService,
  VerificationStateError,
  VerificationValidationError,
} from "@/lib/production/verification-service";
import {
  ModelRecognitionStateError,
  ModelRecognitionValidationError,
} from "@/lib/production/model-recognition-service";
import {
  RecognitionStateError,
  RecognitionValidationError,
} from "@/lib/production/recognition-submission-service";
import {
  ProgrammeAnalyticsStateError,
  ProgrammeAnalyticsValidationError,
} from "@/lib/production/programme-analytics-service";
import {
  IntegrationStateError,
  IntegrationValidationError,
} from "@/lib/production/integration-service";
import { IntegrationProviderError } from "@/lib/production/integration-providers";
import {
  consumeRequestRateLimit,
  RequestRateLimitError,
} from "@/lib/production/rate-limit";
import { logOperationalEvent } from "@/lib/production/observability";
import {
  setApplicationTransactionRole,
  setTenantTransactionContext,
  type TenantTransaction,
} from "@/lib/production/tenant-transaction";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import {
  resolveTenantBootstrap,
  TenantBootstrapNotFoundError,
} from "@/lib/production/tenant-bootstrap";

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-fortify_session"
    : "fortify_session";

type RequestPrincipal =
  | ResolvedPrincipal
  | {
      authorization: Awaited<
        ReturnType<IdentityService["resolveApiCredential"]>
      >;
      expiresAt: string;
    };

type RequestCredential = {
  kind:
    | "session"
    | "api_credential"
    | "external_case"
    | "external_project"
    | "external_verification";
  token: string;
  tokenHash: string;
  credentialPrefix?: string;
};

function readRequestCredential(request: NextRequest): RequestCredential {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    const apiCredential = /^fapi_([a-f0-9]{16})_(.+)$/.exec(token);
    if (apiCredential)
      return {
        kind: "api_credential",
        token,
        tokenHash: hashOpaqueSecret(token),
        credentialPrefix: apiCredential[1],
      };
    if (token.startsWith("fexternal_"))
      return {
        kind: "external_case",
        token,
        tokenHash: hashOpaqueSecret(token),
      };
    if (token.startsWith("fproject_"))
      return {
        kind: "external_project",
        token,
        tokenHash: hashOpaqueSecret(token),
      };
    if (token.startsWith("fverify_"))
      return {
        kind: "external_verification",
        token,
        tokenHash: hashOpaqueSecret(token),
      };
    throw new AuthenticationError();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token?.startsWith("fsess_"))
    throw new AuthenticationError("A Fortify session is required.");
  return {
    kind: "session",
    token,
    tokenHash: hashOpaqueSecret(token),
  };
}

async function resolveCredentialPrincipal(
  credential: RequestCredential,
  database: ProductionDatabaseLike,
): Promise<RequestPrincipal> {
  const service = new IdentityService(database);
  if (credential.kind === "api_credential")
    return {
      authorization: await service.resolveApiCredential(credential.token),
      expiresAt: "credential-managed",
    };
  if (credential.kind === "external_case")
    return {
      authorization: await service.resolveExternalAccess(credential.token),
      expiresAt: "grant-managed",
    };
  if (credential.kind === "external_project")
    return {
      authorization: await new FundingProjectService(
        database,
      ).resolveExternalProjectToken(credential.token),
      expiresAt: "assignment-managed",
    };
  if (credential.kind === "external_verification")
    return {
      authorization: await new VerificationService(
        database,
      ).resolveExternalVerificationToken(credential.token),
      expiresAt: "verification-assignment-managed",
    };
  return service.resolveSession(credential.token);
}

export async function resolveRequestPrincipal(
  request: NextRequest,
): Promise<RequestPrincipal> {
  const database = getProductionDatabase();
  await consumeRequestRateLimit(database, request, {
    scope: "authenticated-api",
  });
  return resolveCredentialPrincipal(readRequestCredential(request), database);
}

export async function withAuthenticatedTenantRequest<T>(
  request: NextRequest,
  operation: (
    principal: RequestPrincipal,
    transaction: TenantTransaction,
  ) => Promise<T>,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  await consumeRequestRateLimit(database, request, {
    scope: "authenticated-api",
  });
  const credential = readRequestCredential(request);
  return database.transaction(async (rawTransaction) => {
    const transaction = rawTransaction as unknown as TenantTransaction;
    await setApplicationTransactionRole(transaction);
    let organizationId: string;
    try {
      organizationId = await resolveTenantBootstrap(transaction, {
        kind: credential.kind,
        lookupHash: credential.tokenHash,
        credentialPrefix: credential.credentialPrefix,
      });
    } catch (error) {
      if (error instanceof TenantBootstrapNotFoundError)
        throw new AuthenticationError();
      throw error;
    }
    await setTenantTransactionContext(transaction, {
      organizationId,
      actorSubject: `authentication:${credential.kind}`,
      principalType: "service_account",
      grantedScopes: [],
    });
    const principal = await resolveCredentialPrincipal(credential, transaction);
    if (principal.authorization.organizationId !== organizationId)
      throw new AuthenticationError();
    await setTenantTransactionContext(transaction, principal.authorization);
    return operation(principal, transaction);
  });
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: string,
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export function authenticationFailure(error: unknown) {
  if (error instanceof RequestRateLimitError)
    return Response.json(
      { error: error.message },
      {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      },
    );
  if (error instanceof AuthorizationDeniedError)
    return Response.json({ error: error.message }, { status: 403 });
  if (error instanceof TenantResourceNotFoundError)
    return Response.json({ error: error.message }, { status: 404 });
  if (error instanceof OptimisticConcurrencyError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof IdempotencyConflictError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof PortfolioImportValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof PortfolioImportStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof DocumentPipelineValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof DocumentPipelineStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof PlaybookValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof PlaybookStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof PlaybookApplicabilityError)
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.code === "no_match" ? 404 : 409 },
    );
  if (error instanceof PropertyGraphValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof StorageValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof StorageGrantError)
    return Response.json({ error: error.message }, { status: 403 });
  if (error instanceof StorageDeletionBlockedError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof AccessControlValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof AccessControlStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof BrokerageCaseValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof BrokerageCaseStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof GovernedSourceValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof GovernedSourceStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof ResiliencePlanningValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof ResiliencePlanningStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof FundingProjectValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof FundingProjectStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof VerificationValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof VerificationStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof ModelRecognitionValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof ModelRecognitionStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof RecognitionValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof RecognitionStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof ProgrammeAnalyticsValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof ProgrammeAnalyticsStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof IntegrationValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof IntegrationStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof IntegrationProviderError)
    return Response.json(
      { error: error.message, code: error.code },
      {
        status:
          error.code === "invalid_webhook" ? 401 : error.retryable ? 503 : 409,
      },
    );
  const isAuthenticationFailure =
    error instanceof AuthenticationError ||
    error instanceof TenantBootstrapNotFoundError;
  const message =
    error instanceof AuthenticationError
      ? error.message
      : "Authentication failed closed.";
  logOperationalEvent(
    isAuthenticationFailure ? "warn" : "error",
    "request.failed",
    { errorCode: error instanceof Error ? error.name : "UnknownError" },
  );
  return Response.json(
    { error: message },
    { status: isAuthenticationFailure ? 401 : 500 },
  );
}

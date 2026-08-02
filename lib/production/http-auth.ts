import type { NextRequest, NextResponse } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import {
  DocumentPipelineStateError,
  DocumentPipelineValidationError,
} from "@/lib/production/document-pipeline-service";
import {
  AuthenticationError,
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
import { VerificationService, VerificationStateError, VerificationValidationError } from "@/lib/production/verification-service";

export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-fortify_session"
    : "fortify_session";

export async function resolveRequestPrincipal(
  request: NextRequest,
): Promise<ResolvedPrincipal | { authorization: Awaited<ReturnType<IdentityService["resolveApiCredential"]>>; expiresAt: string }> {
  const service = new IdentityService(getProductionDatabase());
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice("Bearer ".length).trim();
    if (token.startsWith("fapi_"))
      return {
        authorization: await service.resolveApiCredential(token),
        expiresAt: "credential-managed",
      };
    if (token.startsWith("fexternal_"))
      return {
        authorization: await service.resolveExternalAccess(token),
        expiresAt: "grant-managed",
      };
    if (token.startsWith("fproject_"))
      return {
        authorization: await new FundingProjectService(getProductionDatabase()).resolveExternalProjectToken(token),
        expiresAt: "assignment-managed",
      };
    if (token.startsWith("fverify_"))
      return {
        authorization: await new VerificationService(getProductionDatabase()).resolveExternalVerificationToken(token),
        expiresAt: "verification-assignment-managed",
      };
    throw new AuthenticationError();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) throw new AuthenticationError("A Fortify session is required.");
  return service.resolveSession(token);
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
  if (error instanceof FundingProjectValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof FundingProjectStateError)
    return Response.json({ error: error.message }, { status: 409 });
  if (error instanceof VerificationValidationError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof VerificationStateError)
    return Response.json({ error: error.message }, { status: 409 });
  const message =
    error instanceof AuthenticationError
      ? error.message
      : "Authentication failed closed.";
  return Response.json(
    { error: message },
    { status: error instanceof AuthenticationError ? 401 : 500 },
  );
}

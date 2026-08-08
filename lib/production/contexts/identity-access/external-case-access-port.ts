import type { TenantContext } from "@/lib/production/repository";

export type CreateExternalCaseAccessInput = {
  caseId: string;
  principalType: "external_collaborator" | "external_reviewer";
  email: string;
  displayName: string;
  purpose: string;
  scopes: string[];
  expiresAt: string;
};

export type ExternalCaseAccess = {
  token: string;
  principalId: string;
  assignmentId: string;
  grantId: string;
};

/** Explicit identity-access command port for other bounded contexts. */
export interface ExternalCaseAccessIssuer {
  createExternalCaseAccess(
    context: TenantContext,
    input: CreateExternalCaseAccessInput,
  ): Promise<ExternalCaseAccess>;

  revokeExternalAccess(
    context: TenantContext,
    grantId: string,
    reason: string,
  ): Promise<void>;
}

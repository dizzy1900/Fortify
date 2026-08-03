import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  AuthorizationDeniedError,
  organizationRoles,
  resourceClasses,
  scopesForRole,
  type OrganizationRole,
  type ResourceAction,
  type ResourceClass,
} from "@/lib/production/authorization";
import {
  appendAudit,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export const accessDataDomains = [
  "property_identity",
  "evidence",
  "insurance_strategy",
  "funding",
  "verification",
  "programme",
  "audit",
] as const;

export type AccessDataDomain = (typeof accessDataDomains)[number];
export type AssignmentScope = "portfolio" | "case";

const caseAssignmentRoles = [
  "owner",
  "team_member",
  "contributor",
  "reviewer",
  "auditor",
] as const;
const portfolioAssignmentRoles = [
  "owner",
  "manager",
  "contributor",
  "verifier",
  "reviewer",
  "auditor",
] as const;
const resourceActions: ResourceAction[] = [
  "read",
  "create",
  "update",
  "delete",
  "manage",
];

export interface AccessAssignmentInput {
  scopeType: AssignmentScope;
  scopeId: string;
  membershipId: string;
  assignmentRole: string;
  accessPurpose: string;
  permissions: string[];
  dataDomains: AccessDataDomain[];
  expiresAt?: string;
}

export class AccessControlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessControlValidationError";
  }
}

export class AccessControlStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessControlStateError";
  }
}

function cleanUnique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function validatePermission(permission: string) {
  if (permission === "*" || permission.includes("*")) return false;
  const [resource, action, extra] = permission.split(":");
  return (
    !extra &&
    resourceClasses.includes(resource as ResourceClass) &&
    resourceActions.includes(action as ResourceAction)
  );
}

function validateAssignmentInput(input: AccessAssignmentInput, now: Date) {
  if (
    !input ||
    !["portfolio", "case"].includes(input.scopeType) ||
    typeof input.scopeId !== "string" ||
    typeof input.membershipId !== "string" ||
    typeof input.assignmentRole !== "string" ||
    typeof input.accessPurpose !== "string" ||
    !Array.isArray(input.permissions) ||
    !Array.isArray(input.dataDomains)
  )
    throw new AccessControlValidationError(
      "A complete, recognized assignment payload is required.",
    );
  if (!input.scopeId.trim() || !input.membershipId.trim())
    throw new AccessControlValidationError(
      "A scope and active membership are required.",
    );
  if (input.accessPurpose.trim().length < 8)
    throw new AccessControlValidationError(
      "Access purpose must contain at least eight characters.",
    );
  const roles =
    input.scopeType === "portfolio"
      ? portfolioAssignmentRoles
      : caseAssignmentRoles;
  if (!roles.includes(input.assignmentRole as never))
    throw new AccessControlValidationError(
      `The ${input.scopeType} assignment role is not supported.`,
    );
  if (
    input.permissions.length === 0 ||
    cleanUnique(input.permissions).some(
      (permission) => !validatePermission(permission),
    )
  )
    throw new AccessControlValidationError(
      "Assignments require explicit resource:action permissions without wildcards.",
    );
  if (
    input.dataDomains.length === 0 ||
    cleanUnique(input.dataDomains).some(
      (domain) => !accessDataDomains.includes(domain as AccessDataDomain),
    )
  )
    throw new AccessControlValidationError(
      "Assignments require at least one recognized data domain.",
    );
  if (input.expiresAt) {
    const expiry = new Date(input.expiresAt).getTime();
    if (!Number.isFinite(expiry) || expiry <= now.getTime())
      throw new AccessControlValidationError(
        "Assignment expiry must be a valid future timestamp.",
      );
  }
}

function enforceRoleBoundary(
  role: OrganizationRole,
  domains: AccessDataDomain[],
  permissions: string[],
) {
  const forbidden: Partial<Record<OrganizationRole, AccessDataDomain[]>> = {
    contractor_evidence_contributor: ["insurance_strategy", "funding", "audit"],
    evidence_contributor: ["insurance_strategy", "funding", "audit"],
    insurer_mga_reviewer: ["funding", "programme"],
    underwriter_reviewer: ["funding", "programme"],
    lender_funder_reviewer: ["insurance_strategy"],
  };
  const prohibited = forbidden[role] ?? [];
  if (domains.some((domain) => prohibited.includes(domain)))
    throw new AccessControlValidationError(
      "The selected data domains exceed the target role boundary.",
    );
  const roleScopes = new Set(scopesForRole(role));
  if (
    permissions.some((permission) => {
      const [resource] = permission.split(":");
      return (
        !roleScopes.has(permission) && !roleScopes.has(`${resource}:manage`)
      );
    })
  )
    throw new AccessControlValidationError(
      "The selected permissions exceed the target role ceiling.",
    );
}

function atIso(clock: () => Date) {
  return clock().toISOString();
}

export class AccessControlService {
  constructor(
    readonly database: ProductionDatabaseLike,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async createAssignment(context: TenantContext, input: AccessAssignmentInput) {
    const current = this.clock();
    validateAssignmentInput(input, current);
    const resource =
      input.scopeType === "portfolio"
        ? "portfolio_assignment"
        : "case_assignment";
    assertAuthorized(context, {
      action: "manage",
      resource,
      resourceOrganizationId: context.organizationId,
      ...(input.scopeType === "portfolio"
        ? { portfolioId: input.scopeId }
        : { caseId: input.scopeId }),
    });
    const permissions = cleanUnique(input.permissions);
    const dataDomains = cleanUnique(input.dataDomains) as AccessDataDomain[];
    const accessPurpose = input.accessPurpose.trim();
    const now = current.toISOString();

    return this.database.transaction(async (transaction) => {
      const memberships = await transaction
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.id, input.membershipId),
            eq(schema.memberships.organizationId, context.organizationId),
            eq(schema.memberships.status, "active"),
            eq(schema.memberships.lifecycleStatus, "active"),
          ),
        )
        .limit(1);
      const membership = memberships[0];
      if (!membership) throw new TenantResourceNotFoundError("Membership");
      if (!organizationRoles.includes(membership.role as OrganizationRole))
        throw new AccessControlStateError(
          "The target membership role is invalid.",
        );
      enforceRoleBoundary(
        membership.role as OrganizationRole,
        dataDomains,
        permissions,
      );

      const scopeRows =
        input.scopeType === "portfolio"
          ? await transaction
              .select({ id: schema.propertyPortfolios.id })
              .from(schema.propertyPortfolios)
              .where(
                and(
                  eq(schema.propertyPortfolios.id, input.scopeId),
                  eq(
                    schema.propertyPortfolios.organizationId,
                    context.organizationId,
                  ),
                  eq(schema.propertyPortfolios.lifecycleStatus, "active"),
                ),
              )
              .limit(1)
          : await transaction
              .select({ id: schema.renewalCases.id })
              .from(schema.renewalCases)
              .where(
                and(
                  eq(schema.renewalCases.id, input.scopeId),
                  eq(
                    schema.renewalCases.organizationId,
                    context.organizationId,
                  ),
                  eq(schema.renewalCases.lifecycleStatus, "active"),
                ),
              )
              .limit(1);
      if (!scopeRows[0])
        throw new TenantResourceNotFoundError(
          input.scopeType === "portfolio" ? "Portfolio" : "Renewal case",
        );

      const id = randomUUID();
      const base = {
        id,
        ...tenantRecord(context, now),
        membershipId: membership.id,
        assignmentRole: input.assignmentRole,
        accessPurpose,
        permissions,
        dataDomains,
        expiresAt: input.expiresAt,
      };
      if (input.scopeType === "portfolio")
        await transaction.insert(schema.portfolioAssignments).values({
          ...base,
          portfolioId: input.scopeId,
        });
      else
        await transaction.insert(schema.caseAssignments).values({
          ...base,
          caseId: input.scopeId,
        });

      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: `${resource}.created`,
          resourceType: resource,
          resourceId: id,
          detail: {
            membershipId: membership.id,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
            assignmentRole: input.assignmentRole,
            accessPurpose,
            permissions,
            dataDomains,
            expiresAt: input.expiresAt ?? null,
          },
          occurredAt: now,
        },
      );
      return { id, scopeType: input.scopeType };
    });
  }

  async revokeAssignment(
    context: TenantContext,
    scopeType: AssignmentScope,
    assignmentId: string,
    reason: string,
  ) {
    if (
      !["portfolio", "case"].includes(scopeType) ||
      typeof assignmentId !== "string" ||
      !assignmentId.trim() ||
      typeof reason !== "string"
    )
      throw new AccessControlValidationError(
        "A recognized assignment scope, identifier, and reason are required.",
      );
    const revocationReason = reason.trim();
    if (revocationReason.length < 4)
      throw new AccessControlValidationError(
        "A revocation reason of at least four characters is required.",
      );
    const resource =
      scopeType === "portfolio" ? "portfolio_assignment" : "case_assignment";
    const now = atIso(this.clock);
    return this.database.transaction(async (transaction) => {
      const table =
        scopeType === "portfolio"
          ? schema.portfolioAssignments
          : schema.caseAssignments;
      const rows = await transaction
        .select()
        .from(table)
        .where(
          and(
            eq(table.id, assignmentId),
            eq(table.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      const assignment = rows[0];
      if (!assignment) throw new TenantResourceNotFoundError("Assignment");
      const assignmentScope = assignment as typeof assignment & {
        portfolioId?: string;
        caseId?: string;
      };
      assertAuthorized(context, {
        action: "manage",
        resource,
        resourceOrganizationId: context.organizationId,
        ...(scopeType === "portfolio"
          ? { portfolioId: assignmentScope.portfolioId }
          : { caseId: assignmentScope.caseId }),
      });
      if (assignment.revokedAt)
        throw new AccessControlStateError("The assignment is already revoked.");
      const updated = await transaction
        .update(table)
        .set({
          revokedAt: now,
          revocationReason,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: assignment.revision + 1,
        })
        .where(and(eq(table.id, assignmentId), isNull(table.revokedAt)))
        .returning({ id: table.id });
      if (!updated[0])
        throw new AccessControlStateError(
          "The assignment changed before revocation.",
        );
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: `${resource}.revoked`,
          resourceType: resource,
          resourceId: assignmentId,
          detail: { reason: revocationReason },
          occurredAt: now,
        },
      );
      return { id: assignmentId, scopeType, revokedAt: now };
    });
  }

  async recordDataAccess(
    context: TenantContext,
    input: {
      accessPurpose: string;
      resourceType: string;
      resourceId: string;
      action:
        | "read"
        | "create"
        | "update"
        | "delete"
        | "manage"
        | "upload"
        | "download";
      outcome?: "allowed" | "denied";
      portfolioId?: string;
      caseId?: string;
      dataClasses: string[];
      requestId?: string;
    },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "data_access_log",
      resourceOrganizationId: context.organizationId,
      portfolioId: input.portfolioId,
      caseId: input.caseId,
    });
    const accessPurpose = input.accessPurpose.trim();
    if (accessPurpose.length < 8)
      throw new AccessControlValidationError(
        "Data access purpose must contain at least eight characters.",
      );
    const now = atIso(this.clock);
    const id = randomUUID();
    await this.database.insert(schema.dataAccessLogs).values({
      id,
      ...tenantRecord(context, now),
      principalType: context.principalType,
      actorSubject: context.actorSubject,
      accessPurpose,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      action: input.action,
      outcome: input.outcome ?? "allowed",
      portfolioId: input.portfolioId,
      caseId: input.caseId,
      dataClasses: cleanUnique(input.dataClasses),
      requestId: input.requestId?.trim() || undefined,
      occurredAt: now,
    });
    return { id, occurredAt: now };
  }

  async getWorkspace(context: TenantContext) {
    if (
      context.principalType !== "membership" ||
      !context.role ||
      ![
        "organization_owner",
        "brokerage_administrator",
        "practice_leader",
      ].includes(context.role)
    )
      throw new AuthorizationDeniedError(
        "The administrative access workspace requires tenant identity authority.",
      );
    assertAuthorized(context, {
      action: "read",
      resource: "portfolio_assignment",
      resourceOrganizationId: context.organizationId,
    });
    await this.recordDataAccess(context, {
      accessPurpose: "administer workforce access",
      resourceType: "access_control_workspace",
      resourceId: context.organizationId,
      action: "read",
      dataClasses: ["identity_profile", "authorization_assignment"],
    });
    const now = atIso(this.clock);
    const [
      organizations,
      memberships,
      identities,
      portfolios,
      cases,
      portfolioAssignments,
      caseAssignments,
      supportGrants,
      accessLogs,
      sessions,
      storageObjects,
    ] = await Promise.all([
      this.database
        .select({
          id: schema.organizations.id,
          name: schema.organizations.name,
          environment: schema.organizations.environment,
          synthetic: schema.organizations.synthetic,
        })
        .from(schema.organizations)
        .where(eq(schema.organizations.id, context.organizationId))
        .limit(1),
      this.database
        .select({
          id: schema.memberships.id,
          identityId: schema.memberships.identityId,
          role: schema.memberships.role,
          status: schema.memberships.status,
          acceptedAt: schema.memberships.acceptedAt,
          revokedAt: schema.memberships.revokedAt,
        })
        .from(schema.memberships)
        .where(eq(schema.memberships.organizationId, context.organizationId)),
      this.database
        .select({
          id: schema.identities.id,
          displayName: schema.identities.displayName,
          email: schema.identities.email,
          emailVerified: schema.identities.emailVerified,
          mfaCapable: schema.identities.mfaCapable,
        })
        .from(schema.identities)
        .innerJoin(
          schema.memberships,
          and(
            eq(schema.memberships.identityId, schema.identities.id),
            eq(schema.memberships.organizationId, context.organizationId),
          ),
        ),
      this.database
        .select({
          id: schema.propertyPortfolios.id,
          name: schema.propertyPortfolios.name,
          jurisdiction: schema.propertyPortfolios.jurisdiction,
          primaryPeril: schema.propertyPortfolios.primaryPeril,
        })
        .from(schema.propertyPortfolios)
        .where(
          eq(schema.propertyPortfolios.organizationId, context.organizationId),
        ),
      this.database
        .select({
          id: schema.renewalCases.id,
          title: schema.renewalCases.title,
          status: schema.renewalCases.status,
          renewalDate: schema.renewalCases.renewalDate,
        })
        .from(schema.renewalCases)
        .where(eq(schema.renewalCases.organizationId, context.organizationId)),
      this.database
        .select({
          id: schema.portfolioAssignments.id,
          portfolioId: schema.portfolioAssignments.portfolioId,
          membershipId: schema.portfolioAssignments.membershipId,
          teamId: schema.portfolioAssignments.teamId,
          assignmentRole: schema.portfolioAssignments.assignmentRole,
          accessPurpose: schema.portfolioAssignments.accessPurpose,
          permissions: schema.portfolioAssignments.permissions,
          dataDomains: schema.portfolioAssignments.dataDomains,
          expiresAt: schema.portfolioAssignments.expiresAt,
          revokedAt: schema.portfolioAssignments.revokedAt,
          revocationReason: schema.portfolioAssignments.revocationReason,
        })
        .from(schema.portfolioAssignments)
        .where(
          eq(
            schema.portfolioAssignments.organizationId,
            context.organizationId,
          ),
        ),
      this.database
        .select({
          id: schema.caseAssignments.id,
          caseId: schema.caseAssignments.caseId,
          membershipId: schema.caseAssignments.membershipId,
          assignmentRole: schema.caseAssignments.assignmentRole,
          accessPurpose: schema.caseAssignments.accessPurpose,
          permissions: schema.caseAssignments.permissions,
          dataDomains: schema.caseAssignments.dataDomains,
          expiresAt: schema.caseAssignments.expiresAt,
          revokedAt: schema.caseAssignments.revokedAt,
          revocationReason: schema.caseAssignments.revocationReason,
        })
        .from(schema.caseAssignments)
        .where(
          eq(schema.caseAssignments.organizationId, context.organizationId),
        ),
      this.database
        .select({
          id: schema.supportAccessGrants.id,
          reason: schema.supportAccessGrants.reason,
          scopes: schema.supportAccessGrants.scopes,
          expiresAt: schema.supportAccessGrants.expiresAt,
          revokedAt: schema.supportAccessGrants.revokedAt,
        })
        .from(schema.supportAccessGrants)
        .where(
          eq(schema.supportAccessGrants.organizationId, context.organizationId),
        ),
      this.database
        .select({
          id: schema.dataAccessLogs.id,
          actorSubject: schema.dataAccessLogs.actorSubject,
          accessPurpose: schema.dataAccessLogs.accessPurpose,
          resourceType: schema.dataAccessLogs.resourceType,
          resourceId: schema.dataAccessLogs.resourceId,
          action: schema.dataAccessLogs.action,
          outcome: schema.dataAccessLogs.outcome,
          dataClasses: schema.dataAccessLogs.dataClasses,
          occurredAt: schema.dataAccessLogs.occurredAt,
        })
        .from(schema.dataAccessLogs)
        .where(eq(schema.dataAccessLogs.organizationId, context.organizationId))
        .orderBy(desc(schema.dataAccessLogs.occurredAt))
        .limit(50),
      this.database
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(
          and(
            eq(schema.sessions.activeOrganizationId, context.organizationId),
            isNull(schema.sessions.revokedAt),
            gt(schema.sessions.expiresAt, now),
          ),
        ),
      this.database
        .select({
          encryptionMode: schema.storageObjects.encryptionMode,
          state: schema.storageObjects.state,
          scanStatus: schema.storageObjects.scanStatus,
        })
        .from(schema.storageObjects)
        .where(
          eq(schema.storageObjects.organizationId, context.organizationId),
        ),
    ]);
    const identityById = new Map(
      identities.map((identity) => [identity.id, identity]),
    );
    return {
      organization: organizations[0] ?? null,
      currentPrincipal: {
        actorSubject: context.actorSubject,
        role: context.role ?? null,
        assignedCaseIds: context.assignedCaseIds ?? null,
        assignedPortfolioIds: context.assignedPortfolioIds ?? null,
      },
      memberships: memberships.map((membership) => {
        const identity = membership.identityId
          ? identityById.get(membership.identityId)
          : undefined;
        return {
          id: membership.id,
          role: membership.role,
          status: membership.status,
          displayName: identity?.displayName ?? "Invitation pending",
          email: identity?.email ?? null,
          emailVerified: identity?.emailVerified ?? false,
          mfaCapable: identity?.mfaCapable ?? false,
          acceptedAt: membership.acceptedAt,
          revokedAt: membership.revokedAt,
        };
      }),
      portfolios,
      cases,
      portfolioAssignments,
      caseAssignments,
      supportGrants,
      accessLogs,
      securityPosture: {
        identityInterface:
          "OIDC authorization code with PKCE, state, and nonce",
        localProviderProductionState: "disabled",
        activeSessionCount: sessions.length,
        mfaCapableMembershipCount: memberships.filter((membership) => {
          const identity = membership.identityId
            ? identityById.get(membership.identityId)
            : undefined;
          return membership.status === "active" && identity?.mfaCapable;
        }).length,
        encryptedObjectCount: storageObjects.filter((object) =>
          ["AES256", "aws:kms"].includes(object.encryptionMode),
        ).length,
        quarantinedObjectCount: storageObjects.filter((object) =>
          ["pending_upload", "quarantined", "scanning"].includes(object.state),
        ).length,
        cleanObjectCount: storageObjects.filter(
          (object) => object.state === "clean" && object.scanStatus === "clean",
        ).length,
      },
    };
  }
}

export type AccessControlWorkspace = Awaited<
  ReturnType<AccessControlService["getWorkspace"]>
>;

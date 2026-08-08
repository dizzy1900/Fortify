import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  AuthorizationDeniedError,
} from "@/lib/production/authorization";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import type { StorageObjectQueryPort } from "@/lib/production/contexts/evidence-custody/storage-object-query-port";
import {
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

export type IdentityAccessWorkspaceQuery = QueryOperation<
  "identity_access.workspace",
  TenantContext
>;

export function identityAccessWorkspaceQuery(
  context: TenantContext,
): IdentityAccessWorkspaceQuery {
  return defineQuery({
    boundedContext: "identity_access",
    name: "identity_access.workspace",
    context,
    input: undefined,
  });
}

export interface IdentityAccessWorkspaceQueryPort {
  execute(
    query: IdentityAccessWorkspaceQuery,
  ): Promise<IdentityAccessWorkspace>;
}

export class IdentityAccessWorkspaceQueryService
  implements IdentityAccessWorkspaceQueryPort
{
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storageObjects: StorageObjectQueryPort,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async execute(query: IdentityAccessWorkspaceQuery) {
    const { context } = query;
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
    assertAuthorized(context, {
      action: "create",
      resource: "data_access_log",
      resourceOrganizationId: context.organizationId,
    });

    const now = this.clock().toISOString();
    await this.database.insert(schema.dataAccessLogs).values({
      id: randomUUID(),
      ...tenantRecord(context, now),
      principalType: context.principalType,
      actorSubject: context.actorSubject,
      accessPurpose: "administer workforce access",
      resourceType: "access_control_workspace",
      resourceId: context.organizationId,
      action: "read",
      outcome: "allowed",
      dataClasses: ["identity_profile", "authorization_assignment"],
      occurredAt: now,
    });

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
      storagePosture,
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
      this.storageObjects.summarizeCustody(context),
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
        ...storagePosture,
      },
    };
  }
}

export type IdentityAccessWorkspace = Awaited<
  ReturnType<IdentityAccessWorkspaceQueryService["execute"]>
>;

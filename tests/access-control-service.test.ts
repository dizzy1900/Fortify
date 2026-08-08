import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  AccessControlService,
  AccessControlValidationError,
} from "@/lib/production/access-control-service";
import {
  assertAuthorized,
  AuthorizationDeniedError,
} from "@/lib/production/authorization";
import {
  IdentityAccessWorkspaceQueryService,
  identityAccessWorkspaceQuery,
} from "@/lib/production/contexts/identity-access/workspace-query";
import { IdentityService } from "@/lib/production/identity-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
} from "@/lib/production/repository";
import {
  createActiveMembership,
  createTenantFixture,
} from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
let currentTime: Date;

const productionDatabase = () => database as unknown as ProductionDatabaseLike;

describe("purpose-scoped production access control", () => {
  beforeEach(async () => {
    currentTime = new Date("2026-08-01T12:00:00.000Z");
    client = new PGlite();
    database = drizzle(client, { schema });
    await migrate(database, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
    });
  });

  afterEach(async () => {
    await client.close();
  });

  async function createPortfolioAndCase(key: string) {
    const fixture = await createTenantFixture(productionDatabase(), key);
    const owned = tenantRecord(fixture.context, currentTime.toISOString());
    const portfolioId = `portfolio-${key}`;
    await database.insert(schema.propertyPortfolios).values({
      id: portfolioId,
      ...owned,
      clientId: fixture.clientId,
      name: `Portfolio ${key}`,
      jurisdiction: "US-CA",
      primaryPeril: "wildfire",
      sourceSystem: "test-fixture",
      sourceRecordId: `portfolio-${key}`,
      effectiveFrom: "2026-08-01",
      confidentialityState: "tenant_confidential",
      dataRightClass: "property_specific_data",
      rightsVerified: true,
    });
    const caseRecord = await fixture.repository.createRenewalCase(
      fixture.context,
      `case-${key}`,
      {
        id: `case-${key}`,
        policyId: fixture.policyId,
        title: `Renewal ${key}`,
        status: "open",
        caseType: "renewal",
        peril: "wildfire",
        jurisdiction: "US-CA",
        propertyClass: "condominium",
        renewalDate: "2027-01-01",
      },
    );
    return { ...fixture, portfolioId, caseId: caseRecord.id };
  }

  test("resolves live case, direct portfolio, and team portfolio assignments fail closed", async () => {
    const fixture = await createPortfolioAndCase("resolution");
    const member = await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: "assigned-manager",
      role: "property_manager",
    });
    const service = new AccessControlService(
      productionDatabase(),
      () => currentTime,
    );
    const portfolioAssignment = await service.createAssignment(
      fixture.context,
      {
        scopeType: "portfolio",
        scopeId: fixture.portfolioId,
        membershipId: member.membershipId,
        assignmentRole: "manager",
        accessPurpose: "manage property evidence",
        permissions: ["property:read", "evidence_item:create"],
        dataDomains: ["property_identity", "evidence"],
        expiresAt: "2026-08-01T13:00:00.000Z",
      },
    );
    await service.createAssignment(fixture.context, {
      scopeType: "case",
      scopeId: fixture.caseId,
      membershipId: member.membershipId,
      assignmentRole: "team_member",
      accessPurpose: "prepare renewal evidence",
      permissions: ["renewal_case:read", "evidence_item:create"],
      dataDomains: ["evidence"],
      expiresAt: "2026-08-01T13:00:00.000Z",
    });

    const identity = new IdentityService(
      productionDatabase(),
      () => currentTime,
    );
    const session = await identity.issueSession({
      profile: member.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 7200,
    });
    let resolved = await identity.resolveSession(session.token);
    expect(resolved.authorization.assignedPortfolioIds).toEqual([
      fixture.portfolioId,
    ]);
    expect(resolved.authorization.assignedCaseIds).toEqual([fixture.caseId]);
    expect(() =>
      assertAuthorized(resolved.authorization, {
        action: "read",
        resource: "property",
        resourceOrganizationId: fixture.organizationId,
        portfolioId: fixture.portfolioId,
      }),
    ).not.toThrow();
    expect(() =>
      assertAuthorized(resolved.authorization, {
        action: "update",
        resource: "property",
        resourceOrganizationId: fixture.organizationId,
        portfolioId: fixture.portfolioId,
      }),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(resolved.authorization, {
        action: "read",
        resource: "property",
        resourceOrganizationId: fixture.organizationId,
        portfolioId: "portfolio-not-assigned",
      }),
    ).toThrow(AuthorizationDeniedError);

    await service.revokeAssignment(
      fixture.context,
      "portfolio",
      portfolioAssignment.id,
      "portfolio responsibility changed",
    );
    resolved = await identity.resolveSession(session.token);
    expect(resolved.authorization.assignedPortfolioIds).toEqual([]);

    const teamId = "team-resolution";
    const owned = tenantRecord(fixture.context, currentTime.toISOString());
    await database.insert(schema.teams).values({
      id: teamId,
      ...owned,
      name: "Property operators",
    });
    await database.insert(schema.teamMemberships).values({
      id: "team-membership-resolution",
      ...owned,
      teamId,
      membershipId: member.membershipId,
    });
    await database.insert(schema.portfolioAssignments).values({
      id: "team-portfolio-assignment",
      ...owned,
      portfolioId: fixture.portfolioId,
      teamId,
      assignmentRole: "manager",
      accessPurpose: "team property operations",
      permissions: ["property:read"],
      dataDomains: ["property_identity"],
      expiresAt: "2026-08-01T13:00:00.000Z",
    });
    resolved = await identity.resolveSession(session.token);
    expect(resolved.authorization.assignedPortfolioIds).toEqual([
      fixture.portfolioId,
    ]);

    currentTime = new Date("2026-08-01T13:00:01.000Z");
    resolved = await identity.resolveSession(session.token);
    expect(resolved.authorization.assignedPortfolioIds).toEqual([]);
    expect(resolved.authorization.assignedCaseIds).toEqual([]);
  });

  test("enforces role data boundaries and immutable access records", async () => {
    const fixture = await createPortfolioAndCase("immutability");
    const contractor = await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: "contractor",
      role: "contractor_evidence_contributor",
    });
    const service = new AccessControlService(
      productionDatabase(),
      () => currentTime,
    );
    await expect(
      service.createAssignment(
        fixture.context,
        {} as Parameters<AccessControlService["createAssignment"]>[1],
      ),
    ).rejects.toBeInstanceOf(AccessControlValidationError);
    await expect(
      service.revokeAssignment(
        fixture.context,
        "invalid" as Parameters<AccessControlService["revokeAssignment"]>[1],
        "",
        "",
      ),
    ).rejects.toBeInstanceOf(AccessControlValidationError);
    await expect(
      service.createAssignment(fixture.context, {
        scopeType: "portfolio",
        scopeId: fixture.portfolioId,
        membershipId: contractor.membershipId,
        assignmentRole: "contributor",
        accessPurpose: "collect contractor evidence",
        permissions: ["evidence_item:create"],
        dataDomains: ["evidence", "insurance_strategy"],
      }),
    ).rejects.toBeInstanceOf(AccessControlValidationError);
    await expect(
      service.createAssignment(fixture.context, {
        scopeType: "portfolio",
        scopeId: fixture.portfolioId,
        membershipId: contractor.membershipId,
        assignmentRole: "contributor",
        accessPurpose: "collect contractor evidence",
        permissions: ["policy:read"],
        dataDomains: ["evidence"],
      }),
    ).rejects.toBeInstanceOf(AccessControlValidationError);
    const assignment = await service.createAssignment(fixture.context, {
      scopeType: "portfolio",
      scopeId: fixture.portfolioId,
      membershipId: contractor.membershipId,
      assignmentRole: "contributor",
      accessPurpose: "collect contractor evidence",
      permissions: ["evidence_item:create"],
      dataDomains: ["evidence"],
    });
    await expect(
      database
        .update(schema.portfolioAssignments)
        .set({ permissions: ["policy:read"], revision: 2 })
        .where(eq(schema.portfolioAssignments.id, assignment.id)),
    ).rejects.toThrow();
    await service.revokeAssignment(
      fixture.context,
      "portfolio",
      assignment.id,
      "contractor engagement ended",
    );

    const access = await service.recordDataAccess(fixture.context, {
      accessPurpose: "review evidence provenance",
      resourceType: "evidence_item",
      resourceId: "evidence-one",
      action: "read",
      portfolioId: fixture.portfolioId,
      dataClasses: ["evidence", "property_identity"],
    });
    await expect(
      database
        .update(schema.dataAccessLogs)
        .set({ outcome: "denied" })
        .where(eq(schema.dataAccessLogs.id, access.id)),
    ).rejects.toThrow();
    await expect(
      database
        .delete(schema.dataAccessLogs)
        .where(eq(schema.dataAccessLogs.id, access.id)),
    ).rejects.toThrow();
  });

  test("rejects cross-tenant portfolio assignments and access-log references", async () => {
    const alpha = await createPortfolioAndCase("access-alpha");
    const beta = await createPortfolioAndCase("access-beta");
    const betaMember = await createActiveMembership(productionDatabase(), {
      organizationId: beta.organizationId,
      subject: "beta-member",
      role: "property_manager",
    });
    const owned = tenantRecord(alpha.context, currentTime.toISOString());
    await expect(
      database.insert(schema.portfolioAssignments).values({
        id: "cross-tenant-portfolio-assignment",
        ...owned,
        portfolioId: alpha.portfolioId,
        membershipId: betaMember.membershipId,
        assignmentRole: "manager",
        accessPurpose: "must fail tenant guard",
        permissions: ["property:read"],
        dataDomains: ["property_identity"],
      }),
    ).rejects.toThrow();
    await expect(
      database.insert(schema.dataAccessLogs).values({
        id: "cross-tenant-access-log",
        ...owned,
        principalType: "membership",
        actorSubject: alpha.context.actorSubject,
        accessPurpose: "must fail tenant guard",
        resourceType: "property_portfolio",
        resourceId: beta.portfolioId,
        action: "read",
        outcome: "allowed",
        portfolioId: beta.portfolioId,
        dataClasses: ["property_identity"],
        occurredAt: currentTime.toISOString(),
      }),
    ).rejects.toThrow();
  });

  test("returns a tenant-safe administrative workspace and records its purpose", async () => {
    const fixture = await createPortfolioAndCase("workspace");
    const beta = await createPortfolioAndCase("workspace-beta");
    await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: fixture.context.actorSubject,
      role: "organization_owner",
    });
    const queryService = new IdentityAccessWorkspaceQueryService(
      productionDatabase(),
      () => currentTime,
    );
    const workspace = await queryService.execute(
      identityAccessWorkspaceQuery(fixture.context),
    );
    expect(workspace.organization?.id).toBe(fixture.organizationId);
    expect(workspace.portfolios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixture.portfolioId }),
      ]),
    );
    expect(workspace.memberships).toHaveLength(1);
    expect(workspace.securityPosture.localProviderProductionState).toBe(
      "disabled",
    );
    expect(workspace.accessLogs[0]).toMatchObject({
      accessPurpose: "administer workforce access",
      resourceType: "access_control_workspace",
      outcome: "allowed",
    });
    expect(JSON.stringify(workspace)).not.toContain(beta.organizationId);
    await expect(
      queryService.execute(
        identityAccessWorkspaceQuery({
          ...fixture.context,
          actorSubject: "identity:scoped-manager",
          role: "property_operator_administrator",
          assignedPortfolioIds: [fixture.portfolioId],
          assignedPortfolioScopes: {
            [fixture.portfolioId]: ["portfolio_assignment:manage"],
          },
        }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });

  test("requires the exact assigned scope when revoking another principal grant", async () => {
    const fixture = await createPortfolioAndCase("revoke-scope");
    const target = await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: "revoke-target",
      role: "property_manager",
    });
    const service = new AccessControlService(
      productionDatabase(),
      () => currentTime,
    );
    const assignment = await service.createAssignment(fixture.context, {
      scopeType: "portfolio",
      scopeId: fixture.portfolioId,
      membershipId: target.membershipId,
      assignmentRole: "manager",
      accessPurpose: "manage assigned property evidence",
      permissions: ["property:read"],
      dataDomains: ["property_identity", "evidence"],
    });
    await expect(
      service.revokeAssignment(
        {
          organizationId: fixture.organizationId,
          actorSubject: "identity:operator-admin",
          principalType: "membership",
          role: "property_operator_administrator",
          grantedScopes: [],
          assignedPortfolioIds: ["portfolio-different"],
          assignedPortfolioScopes: {
            "portfolio-different": ["portfolio_assignment:manage"],
          },
        },
        "portfolio",
        assignment.id,
        "must fail exact scope",
      ),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
  });
});

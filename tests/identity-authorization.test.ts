import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  AuthorizationDeniedError,
  resourceClasses,
  type AuthorizationContext,
} from "@/lib/production/authorization";
import {
  AuthenticationError,
  ExpiredCredentialError,
  IdentityService,
  RevokedCredentialError,
} from "@/lib/production/identity-service";
import {
  IdentityProviderConfigurationError,
  LocalDevelopmentIdentityProvider,
  OidcIdentityProvider,
  type VerifiedIdentityProfile,
} from "@/lib/production/identity-provider";
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

const productionDatabase = () =>
  database as unknown as ProductionDatabaseLike;

describe("production identity and deny-by-default authorization", () => {
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

  test("denies cross-tenant access for every production resource class", () => {
    expect(new Set(resourceClasses).size).toBe(resourceClasses.length);
    expect(resourceClasses).toHaveLength(164);
    const owner: AuthorizationContext = {
      organizationId: "org-alpha",
      actorSubject: "owner-alpha",
      principalType: "membership",
      role: "organization_owner",
      grantedScopes: [],
    };
    for (const resource of resourceClasses) {
      expect(() =>
        assertAuthorized(owner, {
          action: "read",
          resource,
          resourceOrganizationId: "org-beta",
        }),
      ).toThrow(AuthorizationDeniedError);
    }
    const auditor: AuthorizationContext = {
      ...owner,
      role: "read_only_auditor",
    };
    expect(() =>
      assertAuthorized(auditor, {
        action: "update",
        resource: "community",
        resourceOrganizationId: "org-alpha",
      }),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        { ...owner, principalType: "service_account", role: undefined },
        {
          action: "read",
          resource: "community",
          resourceOrganizationId: "org-alpha",
        },
      ),
    ).toThrow(AuthorizationDeniedError);
  });

  test("keeps resilience ecosystem roles inside explicit separation-of-duty boundaries", () => {
    const context = (role: AuthorizationContext["role"]): AuthorizationContext => ({
      organizationId: "org-boundary",
      actorSubject: `identity:${role}`,
      principalType: "membership",
      role,
      grantedScopes: [],
      assignedCaseIds: ["case-assigned"],
      assignedPortfolioIds: ["portfolio-assigned"],
    });
    const request = (
      resource: Parameters<typeof assertAuthorized>[1]["resource"],
      action: Parameters<typeof assertAuthorized>[1]["action"],
    ) => ({
      resource,
      action,
      resourceOrganizationId: "org-boundary",
      caseId: "case-assigned",
    });

    expect(() =>
      assertAuthorized(
        context("contractor_evidence_contributor"),
        request("policy", "read"),
      ),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        context("independent_verifier"),
        request("market_response", "create"),
      ),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        context("insurer_mga_reviewer"),
        request("evidence_item", "create"),
      ),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        context("lender_funder_reviewer"),
        request("submission", "create"),
      ),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        context("programme_administrator"),
        request("market_response", "create"),
      ),
    ).toThrow(AuthorizationDeniedError);
    expect(() =>
      assertAuthorized(
        context("insurer_mga_reviewer"),
        request("market_response", "create"),
      ),
    ).not.toThrow();
  });

  test("accepts a one-time invitation, issues an opaque session, and revokes membership sessions", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "identity");
    await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: fixture.context.actorSubject,
    });
    const service = new IdentityService(productionDatabase(), () => currentTime);
    const invitation = await service.inviteMembership(fixture.context, {
      email: "assistant@example.test",
      role: "assistant",
      ttlSeconds: 3600,
    });
    const storedInvitation = await database
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.id, invitation.invitationId));
    expect(storedInvitation[0].tokenHash).not.toContain(invitation.token);

    const profile: VerifiedIdentityProfile = {
      providerKey: "test-oidc",
      providerSubject: "assistant-subject",
      email: "assistant@example.test",
      emailVerified: true,
      displayName: "Assistant User",
      authenticationMethods: ["pwd", "mfa"],
      mfaCapable: true,
    };
    const accepted = await service.acceptInvitation(invitation.token, profile);
    await expect(
      service.acceptInvitation(invitation.token, profile),
    ).rejects.toBeInstanceOf(AuthenticationError);
    const session = await service.issueSession({
      profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 3600,
    });
    const resolved = await service.resolveSession(session.token);
    expect(resolved.authorization).toMatchObject({
      organizationId: fixture.organizationId,
      principalType: "membership",
      role: "assistant",
    });
    const storedSessions = await database
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, session.sessionId));
    expect(storedSessions[0].tokenHash).not.toContain(session.token);

    await service.revokeMembership(
      fixture.context,
      accepted.membership.id,
      "offboarding",
    );
    await expect(service.resolveSession(session.token)).rejects.toBeInstanceOf(
      RevokedCredentialError,
    );
  });

  test("enforces invitation and session expiry", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "expiry");
    const owner = await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: fixture.context.actorSubject,
    });
    const service = new IdentityService(productionDatabase(), () => currentTime);
    const session = await service.issueSession({
      profile: owner.profile,
      activeOrganizationId: fixture.organizationId,
      ttlSeconds: 30,
    });
    const invitation = await service.inviteMembership(fixture.context, {
      email: "late@example.test",
      role: "assistant",
      ttlSeconds: 30,
    });
    currentTime = new Date("2026-08-01T12:00:31.000Z");
    await expect(service.resolveSession(session.token)).rejects.toBeInstanceOf(
      ExpiredCredentialError,
    );
    await expect(
      service.acceptInvitation(invitation.token, {
        providerKey: "test-oidc",
        providerSubject: "late",
        email: "late@example.test",
        emailVerified: true,
        displayName: "Late User",
        authenticationMethods: ["pwd"],
        mfaCapable: false,
      }),
    ).rejects.toBeInstanceOf(ExpiredCredentialError);
  });

  test("limits API credentials to stored scopes and supports revocation", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "service");
    const service = new IdentityService(productionDatabase(), () => currentTime);
    const issued = await service.createServiceAccount(fixture.context, {
      name: "SOV importer",
      scopes: ["community:read"],
      expiresAt: "2026-08-02T12:00:00.000Z",
    });
    const principal = await service.resolveApiCredential(issued.token);
    expect(() =>
      assertAuthorized(principal, {
        action: "read",
        resource: "community",
        resourceOrganizationId: fixture.organizationId,
      }),
    ).not.toThrow();
    expect(() =>
      assertAuthorized(principal, {
        action: "update",
        resource: "community",
        resourceOrganizationId: fixture.organizationId,
      }),
    ).toThrow(AuthorizationDeniedError);
    await service.revokeApiCredential(
      fixture.context,
      issued.credentialId,
      "rotation",
    );
    await expect(
      service.resolveApiCredential(issued.token),
    ).rejects.toBeInstanceOf(RevokedCredentialError);
  });

  test("requires explicit expiring support grants and records revocation", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "support");
    await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: fixture.context.actorSubject,
    });
    const support = await createActiveMembership(productionDatabase(), {
      organizationId: fixture.organizationId,
      subject: "support-agent",
      role: "read_only_auditor",
      email: "support@example.test",
    });
    const service = new IdentityService(productionDatabase(), () => currentTime);
    const grant = await service.grantSupportAccess(fixture.context, {
      supportIdentityId: support.identityId,
      reason: "Customer-approved migration review",
      scopes: ["community:read", "audit_event:read"],
      expiresAt: "2026-08-01T13:00:00.000Z",
    });
    const principal = await service.resolveSupportAccess(
      support.identityId,
      fixture.organizationId,
    );
    expect(() =>
      assertAuthorized(principal, {
        action: "read",
        resource: "community",
        resourceOrganizationId: fixture.organizationId,
      }),
    ).not.toThrow();
    await service.revokeSupportAccess(
      fixture.context,
      grant.id,
      "review complete",
    );
    await expect(
      service.resolveSupportAccess(support.identityId, fixture.organizationId),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  test("scopes external access to one case and revokes the bearer grant", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "external");
    const caseRecord = await fixture.repository.createRenewalCase(
      fixture.context,
      "external-case",
      {
        id: "case-external",
        policyId: fixture.policyId,
        title: "External review case",
        status: "open",
        caseType: "renewal",
        peril: "wildfire",
        jurisdiction: "US-CO",
        propertyClass: "condominium",
        renewalDate: "2027-01-01",
      },
    );
    const service = new IdentityService(productionDatabase(), () => currentTime);
    const access = await service.createExternalCaseAccess(fixture.context, {
      caseId: caseRecord.id,
      principalType: "external_reviewer",
      email: "reviewer@example.test",
      displayName: "Market Reviewer",
      purpose: "Review submission evidence",
      scopes: ["submission:read", "market_response:create"],
      expiresAt: "2026-08-01T13:00:00.000Z",
    });
    const principal = await service.resolveExternalAccess(access.token);
    expect(() =>
      assertAuthorized(principal, {
        action: "read",
        resource: "submission",
        resourceOrganizationId: fixture.organizationId,
        caseId: caseRecord.id,
      }),
    ).not.toThrow();
    expect(() =>
      assertAuthorized(principal, {
        action: "read",
        resource: "submission",
        resourceOrganizationId: fixture.organizationId,
        caseId: "case-other",
      }),
    ).toThrow(AuthorizationDeniedError);
    await service.revokeExternalAccess(
      fixture.context,
      access.grantId,
      "review withdrawn",
    );
    await expect(
      service.resolveExternalAccess(access.token),
    ).rejects.toBeInstanceOf(RevokedCredentialError);
  });

  test("rejects direct cross-tenant references in every new tenant relation", async () => {
    const alpha = await createTenantFixture(productionDatabase(), "guard-alpha");
    const beta = await createTenantFixture(productionDatabase(), "guard-beta");
    const alphaMember = await createActiveMembership(productionDatabase(), {
      organizationId: alpha.organizationId,
      subject: alpha.context.actorSubject,
    });
    const betaMember = await createActiveMembership(productionDatabase(), {
      organizationId: beta.organizationId,
      subject: beta.context.actorSubject,
    });
    const at = "2026-08-01T12:00:00.000Z";
    const betaOwned = tenantRecord(beta.context, at);
    await database.insert(schema.teams).values({
      id: "team-beta",
      ...betaOwned,
      name: "Beta team",
    });
    await database.insert(schema.serviceAccounts).values({
      id: "service-beta",
      ...betaOwned,
      subject: "service:beta",
      name: "Beta service",
      status: "active",
    });
    await database.insert(schema.externalPrincipals).values({
      id: "external-beta",
      ...betaOwned,
      principalType: "external_reviewer",
      email: "beta-reviewer@example.test",
      displayName: "Beta reviewer",
      status: "active",
    });
    const betaCase = await beta.repository.createRenewalCase(
      beta.context,
      "guard-case",
      {
        id: "case-beta",
        policyId: beta.policyId,
        title: "Beta case",
        status: "open",
        caseType: "renewal",
        peril: "wildfire",
        jurisdiction: "US-CO",
        propertyClass: "condominium",
        renewalDate: "2027-01-01",
      },
    );
    const alphaOwned = tenantRecord(alpha.context, at);
    const attempts = [
      () => database.insert(schema.invitations).values({
        id: "cross-invitation",
        ...alphaOwned,
        membershipId: betaMember.membershipId,
        email: "cross@example.test",
        tokenHash: "cross-invitation-token",
        expiresAt: "2026-08-02T12:00:00.000Z",
      }),
      () => database.insert(schema.teamMemberships).values({
        id: "cross-team-member",
        ...alphaOwned,
        teamId: "team-beta",
        membershipId: alphaMember.membershipId,
      }),
      () => database.insert(schema.apiCredentials).values({
        id: "cross-api",
        ...alphaOwned,
        serviceAccountId: "service-beta",
        name: "Cross credential",
        credentialPrefix: "crossprefix",
        secretHash: "a".repeat(64),
        scopes: [],
      }),
      () => database.insert(schema.supportAccessGrants).values({
        id: "cross-support",
        ...alphaOwned,
        supportIdentityId: alphaMember.identityId,
        approvedByMembershipId: betaMember.membershipId,
        reason: "Must fail",
        scopes: [],
        expiresAt: "2026-08-02T12:00:00.000Z",
      }),
      () => database.insert(schema.caseAssignments).values({
        id: "cross-assignment",
        ...alphaOwned,
        caseId: betaCase.id,
        membershipId: alphaMember.membershipId,
        assignmentRole: "team_member",
        permissions: [],
      }),
      () => database.insert(schema.externalAccessGrants).values({
        id: "cross-external",
        ...alphaOwned,
        externalPrincipalId: "external-beta",
        caseId: betaCase.id,
        purpose: "Must fail",
        tokenHash: "cross-external-token",
        scopes: [],
        expiresAt: "2026-08-02T12:00:00.000Z",
      }),
    ];
    for (const attempt of attempts)
      await expect(attempt()).rejects.toThrow();
  });

  test("fails local identity closed and validates OIDC configuration", () => {
    expect(() =>
      new LocalDevelopmentIdentityProvider({
        NODE_ENV: "production",
        FORTIFY_LOCAL_IDENTITY_ENABLED: "true",
      }).authenticate({
        subject: "local-user",
        email: "local@example.test",
        displayName: "Local User",
      }),
    ).toThrow(IdentityProviderConfigurationError);
    expect(() =>
      new OidcIdentityProvider({
        key: "test",
        issuer: "http://identity.example.test",
        clientId: "client",
        clientSecret: "secret",
      }),
    ).toThrow(IdentityProviderConfigurationError);
    expect(
      new LocalDevelopmentIdentityProvider({
        NODE_ENV: "development",
        FORTIFY_LOCAL_IDENTITY_ENABLED: "true",
      }).authenticate({
        subject: "local-user",
        email: "LOCAL@example.test",
        displayName: "Local User",
      }),
    ).toMatchObject({
      providerKey: "local-development",
      email: "local@example.test",
      emailVerified: true,
    });
  });

  test("stores OIDC state server-side and consumes each attempt once", async () => {
    const fixture = await createTenantFixture(productionDatabase(), "oidc");
    const service = new IdentityService(productionDatabase(), () => currentTime);
    await service.registerAuthenticationAttempt("enterprise-oidc", {
      state: "state-secret",
      nonce: "nonce-secret",
      pkceVerifier: "pkce-secret",
      redirectUri: "https://fortify.example.test/api/auth/oidc/callback",
      returnTo: "//attacker.example.test",
      activeOrganizationId: fixture.organizationId,
    });
    const stored = await database.select().from(schema.authenticationAttempts);
    expect(stored[0].stateHash).not.toContain("state-secret");
    const consumed = await service.consumeAuthenticationAttempt(
      "enterprise-oidc",
      "state-secret",
    );
    expect(consumed).toMatchObject({
      returnTo: "/portfolio",
      activeOrganizationId: fixture.organizationId,
      nonce: "nonce-secret",
      pkceVerifier: "pkce-secret",
    });
    await expect(
      service.consumeAuthenticationAttempt("enterprise-oidc", "state-secret"),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });
});

import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  roleRequiresAssignment,
  type AuthorizationContext,
  type OrganizationRole,
} from "@/lib/production/authorization";
import type {
  AuthenticationAttemptMaterial,
  VerifiedIdentityProfile,
} from "./identity-provider";
import {
  appendAudit,
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "./repository";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const INVITATION_TTL_SECONDS = 60 * 60 * 24 * 7;

export class AuthenticationError extends Error {
  constructor(message = "Authentication failed.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class ExpiredCredentialError extends AuthenticationError {
  constructor(message = "The credential has expired.") {
    super(message);
    this.name = "ExpiredCredentialError";
  }
}

export class RevokedCredentialError extends AuthenticationError {
  constructor(message = "The credential has been revoked.") {
    super(message);
    this.name = "RevokedCredentialError";
  }
}

function iso(date: Date) {
  return date.toISOString();
}

function plusSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function hasExpired(value: string, now: Date) {
  return new Date(value).getTime() <= now.getTime();
}

export function hashOpaqueSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function opaqueSecret(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/portfolio";
}

function safeEqualHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

async function upsertIdentity(
  database: ProductionDatabaseLike,
  profile: VerifiedIdentityProfile,
  at: string,
) {
  const existing = await database
    .select()
    .from(schema.identities)
    .where(
      and(
        eq(schema.identities.providerKey, profile.providerKey),
        eq(schema.identities.providerSubject, profile.providerSubject),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const updated = await database
      .update(schema.identities)
      .set({
        email: profile.email.toLowerCase(),
        emailVerified: profile.emailVerified,
        displayName: profile.displayName,
        mfaCapable: profile.mfaCapable,
        lastAuthenticatedAt: at,
        updatedAt: at,
        updatedBy: `${profile.providerKey}:${profile.providerSubject}`,
        revision: existing[0].revision + 1,
      })
      .where(eq(schema.identities.id, existing[0].id))
      .returning();
    return updated[0];
  }
  const subject = `${profile.providerKey}:${profile.providerSubject}`;
  const inserted = await database
    .insert(schema.identities)
    .values({
      id: randomUUID(),
      providerKey: profile.providerKey,
      providerSubject: profile.providerSubject,
      email: profile.email.toLowerCase(),
      emailVerified: profile.emailVerified,
      displayName: profile.displayName,
      mfaCapable: profile.mfaCapable,
      lastAuthenticatedAt: at,
      createdAt: at,
      updatedAt: at,
      createdBy: subject,
      updatedBy: subject,
      revision: 1,
      lifecycleStatus: "active",
    })
    .returning();
  return inserted[0];
}

export interface ResolvedPrincipal {
  authorization: AuthorizationContext;
  identity: typeof schema.identities.$inferSelect;
  membership?: typeof schema.memberships.$inferSelect;
  expiresAt: string;
}

export class IdentityService {
  constructor(
    readonly database: ProductionDatabaseLike,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async registerAuthenticationAttempt(
    providerKey: string,
    attempt: AuthenticationAttemptMaterial,
  ) {
    const now = this.clock();
    const expiresAt = plusSeconds(now, 10 * 60);
    await this.database.insert(schema.authenticationAttempts).values({
      id: randomUUID(),
      providerKey,
      activeOrganizationId: attempt.activeOrganizationId,
      invitationId: attempt.invitationId,
      stateHash: hashOpaqueSecret(attempt.state),
      nonce: attempt.nonce,
      pkceVerifier: attempt.pkceVerifier,
      redirectUri: attempt.redirectUri,
      returnTo: safeReturnTo(attempt.returnTo),
      createdAt: iso(now),
      expiresAt: iso(expiresAt),
    });
  }

  async consumeAuthenticationAttempt(providerKey: string, state: string) {
    const current = this.clock();
    const now = iso(current);
    return this.database.transaction(async (transaction) => {
      const consumed = await transaction
        .update(schema.authenticationAttempts)
        .set({ consumedAt: now })
        .where(
          and(
            eq(schema.authenticationAttempts.providerKey, providerKey),
            eq(
              schema.authenticationAttempts.stateHash,
              hashOpaqueSecret(state),
            ),
            isNull(schema.authenticationAttempts.consumedAt),
            gt(schema.authenticationAttempts.expiresAt, now),
          ),
        )
        .returning();
      const attempt = consumed[0];
      if (!attempt) {
        const existing = await transaction
          .select({ expiresAt: schema.authenticationAttempts.expiresAt })
          .from(schema.authenticationAttempts)
          .where(
            and(
              eq(schema.authenticationAttempts.providerKey, providerKey),
              eq(
                schema.authenticationAttempts.stateHash,
                hashOpaqueSecret(state),
              ),
            ),
          )
          .limit(1);
        if (existing[0] && hasExpired(existing[0].expiresAt, current))
          throw new ExpiredCredentialError(
            "The authentication attempt expired.",
          );
        throw new AuthenticationError(
          "The authentication attempt is invalid or already used.",
        );
      }
      return {
        state,
        nonce: attempt.nonce,
        pkceVerifier: attempt.pkceVerifier,
        redirectUri: attempt.redirectUri,
        returnTo: attempt.returnTo,
        activeOrganizationId: attempt.activeOrganizationId ?? undefined,
        invitationId: attempt.invitationId ?? undefined,
      } satisfies AuthenticationAttemptMaterial;
    });
  }

  async issueSession(input: {
    profile: VerifiedIdentityProfile;
    activeOrganizationId?: string;
    ttlSeconds?: number;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const issuedAt = this.clock();
    const expiresAt = plusSeconds(
      issuedAt,
      input.ttlSeconds ?? SESSION_TTL_SECONDS,
    );
    const token = opaqueSecret("fsess");
    return this.database.transaction(async (transaction) => {
      const identity = await upsertIdentity(
        transaction as unknown as ProductionDatabaseLike,
        input.profile,
        iso(issuedAt),
      );
      const memberships = await transaction
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.identityId, identity.id),
            eq(schema.memberships.status, "active"),
            eq(schema.memberships.lifecycleStatus, "active"),
            ...(input.activeOrganizationId
              ? [
                  eq(
                    schema.memberships.organizationId,
                    input.activeOrganizationId,
                  ),
                ]
              : []),
          ),
        );
      if (memberships.length !== 1)
        throw new AuthenticationError(
          input.activeOrganizationId
            ? "No active membership exists for the requested organization."
            : "An organization must be selected for identities with zero or multiple memberships.",
        );
      const membership = memberships[0];
      const sessionId = randomUUID();
      await transaction.insert(schema.sessions).values({
        id: sessionId,
        identityId: identity.id,
        activeOrganizationId: membership.organizationId,
        tokenHash: hashOpaqueSecret(token),
        authenticationMethod: input.profile.providerKey,
        authenticationMethods: input.profile.authenticationMethods,
        issuedAt: iso(issuedAt),
        expiresAt: iso(expiresAt),
        lastSeenAt: iso(issuedAt),
        userAgent: input.userAgent?.slice(0, 500),
        ipHash: input.ipAddress ? hashOpaqueSecret(input.ipAddress) : undefined,
      });
      const context: TenantContext = {
        organizationId: membership.organizationId,
        actorSubject: `${input.profile.providerKey}:${input.profile.providerSubject}`,
        principalType: "membership",
        role: membership.role as OrganizationRole,
        grantedScopes: [],
        sessionId,
      };
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "session.created",
          resourceType: "session",
          resourceId: sessionId,
          detail: { identityId: identity.id, expiresAt: iso(expiresAt) },
          occurredAt: iso(issuedAt),
        },
      );
      return {
        token,
        sessionId,
        expiresAt: iso(expiresAt),
        returnTo: "/portfolio",
      };
    });
  }

  async resolveSession(token: string): Promise<ResolvedPrincipal> {
    if (!token.startsWith("fsess_")) throw new AuthenticationError();
    const current = this.clock();
    const now = iso(current);
    const rows = await this.database
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.tokenHash, hashOpaqueSecret(token)))
      .limit(1);
    const session = rows[0];
    if (!session) throw new AuthenticationError();
    if (session.revokedAt) throw new RevokedCredentialError();
    if (hasExpired(session.expiresAt, current))
      throw new ExpiredCredentialError();
    if (!session.activeOrganizationId)
      throw new AuthenticationError("The session has no active organization.");
    const identities = await this.database
      .select()
      .from(schema.identities)
      .where(
        and(
          eq(schema.identities.id, session.identityId),
          eq(schema.identities.lifecycleStatus, "active"),
        ),
      )
      .limit(1);
    const identity = identities[0];
    if (!identity)
      throw new RevokedCredentialError("The identity is inactive.");
    const memberships = await this.database
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.identityId, identity.id),
          eq(schema.memberships.organizationId, session.activeOrganizationId),
          eq(schema.memberships.status, "active"),
          eq(schema.memberships.lifecycleStatus, "active"),
        ),
      )
      .limit(1);
    const membership = memberships[0];
    if (!membership)
      throw new RevokedCredentialError(
        "The organization membership is inactive.",
      );
    const role = membership.role as OrganizationRole;
    let assignedCaseIds: string[] | undefined;
    let assignedPortfolioIds: string[] | undefined;
    let assignedCaseScopes: Record<string, string[]> | undefined;
    let assignedPortfolioScopes: Record<string, string[]> | undefined;
    if (roleRequiresAssignment(role)) {
      const teamMembershipRows = await this.database
        .select({ teamId: schema.teamMemberships.teamId })
        .from(schema.teamMemberships)
        .where(
          and(
            eq(
              schema.teamMemberships.organizationId,
              membership.organizationId,
            ),
            eq(schema.teamMemberships.membershipId, membership.id),
            eq(schema.teamMemberships.lifecycleStatus, "active"),
          ),
        );
      const teamIds = teamMembershipRows.map((row) => row.teamId);
      const [caseAssignmentRows, portfolioAssignmentRows] = await Promise.all([
        this.database
          .select({
            caseId: schema.caseAssignments.caseId,
            permissions: schema.caseAssignments.permissions,
          })
          .from(schema.caseAssignments)
          .where(
            and(
              eq(
                schema.caseAssignments.organizationId,
                membership.organizationId,
              ),
              eq(schema.caseAssignments.membershipId, membership.id),
              eq(schema.caseAssignments.lifecycleStatus, "active"),
              isNull(schema.caseAssignments.revokedAt),
              or(
                isNull(schema.caseAssignments.expiresAt),
                gt(schema.caseAssignments.expiresAt, now),
              ),
            ),
          ),
        this.database
          .select({
            portfolioId: schema.portfolioAssignments.portfolioId,
            permissions: schema.portfolioAssignments.permissions,
          })
          .from(schema.portfolioAssignments)
          .where(
            and(
              eq(
                schema.portfolioAssignments.organizationId,
                membership.organizationId,
              ),
              teamIds.length > 0
                ? or(
                    eq(schema.portfolioAssignments.membershipId, membership.id),
                    inArray(schema.portfolioAssignments.teamId, teamIds),
                  )
                : eq(schema.portfolioAssignments.membershipId, membership.id),
              eq(schema.portfolioAssignments.lifecycleStatus, "active"),
              isNull(schema.portfolioAssignments.revokedAt),
              or(
                isNull(schema.portfolioAssignments.expiresAt),
                gt(schema.portfolioAssignments.expiresAt, now),
              ),
            ),
          ),
      ]);
      assignedCaseIds = [
        ...new Set(caseAssignmentRows.map((row) => row.caseId)),
      ];
      assignedPortfolioIds = [
        ...new Set(portfolioAssignmentRows.map((row) => row.portfolioId)),
      ];
      assignedCaseScopes = {};
      for (const assignment of caseAssignmentRows)
        assignedCaseScopes[assignment.caseId] = [
          ...new Set([
            ...(assignedCaseScopes[assignment.caseId] ?? []),
            ...assignment.permissions,
          ]),
        ];
      assignedPortfolioScopes = {};
      for (const assignment of portfolioAssignmentRows)
        assignedPortfolioScopes[assignment.portfolioId] = [
          ...new Set([
            ...(assignedPortfolioScopes[assignment.portfolioId] ?? []),
            ...assignment.permissions,
          ]),
        ];
    }
    await this.database
      .update(schema.sessions)
      .set({ lastSeenAt: now })
      .where(eq(schema.sessions.id, session.id));
    return {
      authorization: {
        organizationId: membership.organizationId,
        actorSubject: `${identity.providerKey}:${identity.providerSubject}`,
        principalType: "membership",
        role,
        grantedScopes: [],
        assignedCaseIds,
        assignedPortfolioIds,
        assignedCaseScopes,
        assignedPortfolioScopes,
        sessionId: session.id,
      },
      identity,
      membership,
      expiresAt: session.expiresAt,
    };
  }

  async revokeSession(
    context: TenantContext,
    sessionId: string,
    reason: string,
  ) {
    const rows = await this.database
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1);
    const target = rows[0];
    if (!target || target.activeOrganizationId !== context.organizationId)
      throw new AuthenticationError(
        "The session was not found in the active organization.",
      );
    if (context.sessionId !== sessionId)
      assertAuthorized(context, {
        action: "manage",
        resource: "membership",
        resourceOrganizationId: context.organizationId,
      });
    const revokedAt = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      await transaction
        .update(schema.sessions)
        .set({ revokedAt, revocationReason: reason })
        .where(
          and(
            eq(schema.sessions.id, sessionId),
            isNull(schema.sessions.revokedAt),
          ),
        );
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "session.revoked",
          resourceType: "session",
          resourceId: sessionId,
          detail: { reason },
          occurredAt: revokedAt,
        },
      );
    });
  }

  async inviteMembership(
    context: TenantContext,
    input: { email: string; role: OrganizationRole; ttlSeconds?: number },
  ) {
    assertAuthorized(context, {
      action: "create",
      resource: "membership",
      resourceOrganizationId: context.organizationId,
    });
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@"))
      throw new AuthenticationError("A valid invitation email is required.");
    const token = opaqueSecret("finvite");
    const now = this.clock();
    const expiresAt = plusSeconds(
      now,
      input.ttlSeconds ?? INVITATION_TTL_SECONDS,
    );
    return this.database.transaction(async (transaction) => {
      const membershipId = randomUUID();
      const invitationId = randomUUID();
      await transaction.insert(schema.memberships).values({
        id: membershipId,
        ...tenantRecord(context, iso(now)),
        identitySubject: `invited:${invitationId}`,
        role: input.role,
        status: "invited",
        invitedAt: iso(now),
      });
      await transaction.insert(schema.invitations).values({
        id: invitationId,
        ...tenantRecord(context, iso(now)),
        membershipId,
        email,
        tokenHash: hashOpaqueSecret(token),
        expiresAt: iso(expiresAt),
      });
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "membership.invited",
          resourceType: "membership",
          resourceId: membershipId,
          detail: {
            invitationId,
            email,
            role: input.role,
            expiresAt: iso(expiresAt),
          },
          occurredAt: iso(now),
        },
      );
      return { token, invitationId, membershipId, expiresAt: iso(expiresAt) };
    });
  }

  async resolveInvitationForAuthentication(token: string) {
    const current = this.clock();
    const rows = await this.database
      .select()
      .from(schema.invitations)
      .where(eq(schema.invitations.tokenHash, hashOpaqueSecret(token)))
      .limit(1);
    const invitation = rows[0];
    if (!invitation)
      throw new AuthenticationError("The invitation is invalid.");
    if (invitation.revokedAt)
      throw new RevokedCredentialError("The invitation was revoked.");
    if (invitation.acceptedAt)
      throw new AuthenticationError("The invitation was already accepted.");
    if (hasExpired(invitation.expiresAt, current))
      throw new ExpiredCredentialError("The invitation expired.");
    return {
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
    };
  }

  async acceptInvitation(
    tokenOrId: string,
    profile: VerifiedIdentityProfile,
    lookup: "token" | "id" = "token",
  ) {
    const current = this.clock();
    const now = iso(current);
    return this.database.transaction(async (transaction) => {
      const claimed = await transaction
        .update(schema.invitations)
        .set({
          acceptedAt: now,
          updatedAt: now,
          updatedBy: `${profile.providerKey}:${profile.providerSubject}`,
        })
        .where(
          and(
            lookup === "token"
              ? eq(schema.invitations.tokenHash, hashOpaqueSecret(tokenOrId))
              : eq(schema.invitations.id, tokenOrId),
            isNull(schema.invitations.acceptedAt),
            isNull(schema.invitations.revokedAt),
            gt(schema.invitations.expiresAt, now),
          ),
        )
        .returning();
      const invitation = claimed[0];
      if (!invitation) {
        const existing = await transaction
          .select()
          .from(schema.invitations)
          .where(
            lookup === "token"
              ? eq(schema.invitations.tokenHash, hashOpaqueSecret(tokenOrId))
              : eq(schema.invitations.id, tokenOrId),
          )
          .limit(1);
        if (!existing[0])
          throw new AuthenticationError("The invitation is invalid.");
        if (existing[0].revokedAt)
          throw new RevokedCredentialError("The invitation was revoked.");
        if (hasExpired(existing[0].expiresAt, current))
          throw new ExpiredCredentialError("The invitation expired.");
        throw new AuthenticationError("The invitation was already accepted.");
      }
      if (invitation.email !== profile.email.trim().toLowerCase())
        throw new AuthenticationError(
          "The authenticated email does not match the invitation.",
        );
      const identity = await upsertIdentity(
        transaction as unknown as ProductionDatabaseLike,
        profile,
        now,
      );
      const memberships = await transaction
        .update(schema.memberships)
        .set({
          identityId: identity.id,
          identitySubject: `${profile.providerKey}:${profile.providerSubject}`,
          status: "active",
          acceptedAt: now,
          updatedAt: now,
          updatedBy: `${profile.providerKey}:${profile.providerSubject}`,
        })
        .where(
          and(
            eq(schema.memberships.id, invitation.membershipId),
            eq(schema.memberships.organizationId, invitation.organizationId),
            eq(schema.memberships.status, "invited"),
          ),
        )
        .returning();
      const membership = memberships[0];
      if (!membership)
        throw new AuthenticationError("The invitation membership is inactive.");
      const context: TenantContext = {
        organizationId: invitation.organizationId,
        actorSubject: membership.identitySubject,
        principalType: "membership",
        role: membership.role as OrganizationRole,
        grantedScopes: [],
      };
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "membership.invitation_accepted",
          resourceType: "membership",
          resourceId: membership.id,
          detail: { invitationId: invitation.id, identityId: identity.id },
          occurredAt: now,
        },
      );
      return { identity, membership };
    });
  }

  async acceptInvitationById(
    invitationId: string,
    profile: VerifiedIdentityProfile,
  ) {
    return this.acceptInvitation(invitationId, profile, "id");
  }

  async revokeInvitation(
    context: TenantContext,
    invitationId: string,
    reason: string,
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "invitation",
      resourceOrganizationId: context.organizationId,
    });
    const now = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      const invitations = await transaction
        .select()
        .from(schema.invitations)
        .where(
          and(
            eq(schema.invitations.id, invitationId),
            eq(schema.invitations.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      const invitation = invitations[0];
      if (!invitation)
        throw new AuthenticationError("The invitation was not found.");
      if (invitation.acceptedAt)
        throw new AuthenticationError(
          "An accepted invitation cannot be revoked; revoke the membership instead.",
        );
      await transaction
        .update(schema.invitations)
        .set({
          revokedAt: now,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: invitation.revision + 1,
        })
        .where(eq(schema.invitations.id, invitation.id));
      await transaction
        .update(schema.memberships)
        .set({
          status: "revoked",
          revokedAt: now,
          updatedAt: now,
          updatedBy: context.actorSubject,
        })
        .where(
          and(
            eq(schema.memberships.id, invitation.membershipId),
            eq(schema.memberships.organizationId, context.organizationId),
          ),
        );
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "membership.invitation_revoked",
          resourceType: "invitation",
          resourceId: invitation.id,
          detail: { membershipId: invitation.membershipId, reason },
          occurredAt: now,
        },
      );
    });
  }

  async revokeMembership(
    context: TenantContext,
    membershipId: string,
    reason: string,
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "membership",
      resourceOrganizationId: context.organizationId,
    });
    const revokedAt = iso(this.clock());
    return this.database.transaction(async (transaction) => {
      const rows = await transaction
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.id, membershipId),
            eq(schema.memberships.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      const membership = rows[0];
      if (!membership)
        throw new AuthenticationError("The membership was not found.");
      if (membership.role === "organization_owner") {
        const owners = await transaction
          .select({ id: schema.memberships.id })
          .from(schema.memberships)
          .where(
            and(
              eq(schema.memberships.organizationId, context.organizationId),
              eq(schema.memberships.role, "organization_owner"),
              eq(schema.memberships.status, "active"),
            ),
          );
        if (owners.length === 1)
          throw new AuthenticationError(
            "The final active organization owner cannot be revoked.",
          );
      }
      await transaction
        .update(schema.memberships)
        .set({
          status: "revoked",
          revokedAt,
          updatedAt: revokedAt,
          updatedBy: context.actorSubject,
          revision: membership.revision + 1,
        })
        .where(eq(schema.memberships.id, membershipId));
      if (membership.identityId)
        await transaction
          .update(schema.sessions)
          .set({ revokedAt, revocationReason: `membership:${reason}` })
          .where(
            and(
              eq(schema.sessions.identityId, membership.identityId),
              eq(schema.sessions.activeOrganizationId, context.organizationId),
              isNull(schema.sessions.revokedAt),
            ),
          );
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "membership.revoked",
          resourceType: "membership",
          resourceId: membershipId,
          detail: { reason, sessionsRevoked: Boolean(membership.identityId) },
          occurredAt: revokedAt,
        },
      );
    });
  }

  async createServiceAccount(
    context: TenantContext,
    input: { name: string; scopes: string[]; expiresAt?: string },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "service_account",
      resourceOrganizationId: context.organizationId,
    });
    const now = iso(this.clock());
    const accountId = randomUUID();
    const subject = `service:${accountId}`;
    const prefix = randomBytes(8).toString("hex");
    const token = `fapi_${prefix}_${randomBytes(32).toString("base64url")}`;
    return this.database.transaction(async (transaction) => {
      await transaction.insert(schema.serviceAccounts).values({
        id: accountId,
        ...tenantRecord(context, now),
        subject,
        name: input.name,
        status: "active",
        expiresAt: input.expiresAt,
      });
      const credentialId = randomUUID();
      await transaction.insert(schema.apiCredentials).values({
        id: credentialId,
        ...tenantRecord(context, now),
        serviceAccountId: accountId,
        name: `${input.name} initial credential`,
        credentialPrefix: prefix,
        secretHash: hashOpaqueSecret(token),
        scopes: [...new Set(input.scopes)].sort(),
        expiresAt: input.expiresAt,
      });
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "service_account.created",
          resourceType: "service_account",
          resourceId: accountId,
          detail: {
            credentialId,
            scopes: input.scopes,
            expiresAt: input.expiresAt ?? null,
          },
          occurredAt: now,
        },
      );
      return { accountId, credentialId, token, prefix };
    });
  }

  async resolveApiCredential(token: string): Promise<AuthorizationContext> {
    const match = /^fapi_([a-f0-9]{16})_(.+)$/.exec(token);
    if (!match) throw new AuthenticationError();
    const prefix = match[1];
    const current = this.clock();
    const now = iso(current);
    const credentials = await this.database
      .select()
      .from(schema.apiCredentials)
      .where(eq(schema.apiCredentials.credentialPrefix, prefix))
      .limit(1);
    const credential = credentials[0];
    if (
      !credential ||
      !safeEqualHex(credential.secretHash, hashOpaqueSecret(token))
    )
      throw new AuthenticationError();
    if (credential.revokedAt) throw new RevokedCredentialError();
    if (credential.expiresAt && hasExpired(credential.expiresAt, current))
      throw new ExpiredCredentialError();
    const accounts = await this.database
      .select()
      .from(schema.serviceAccounts)
      .where(
        and(
          eq(schema.serviceAccounts.id, credential.serviceAccountId),
          eq(schema.serviceAccounts.organizationId, credential.organizationId),
        ),
      )
      .limit(1);
    const account = accounts[0];
    if (!account || account.status !== "active" || account.revokedAt)
      throw new RevokedCredentialError("The service account is inactive.");
    if (account.expiresAt && hasExpired(account.expiresAt, current))
      throw new ExpiredCredentialError("The service account expired.");
    await this.database
      .update(schema.apiCredentials)
      .set({ lastUsedAt: now })
      .where(eq(schema.apiCredentials.id, credential.id));
    return {
      organizationId: credential.organizationId,
      actorSubject: account.subject,
      principalType: "service_account",
      grantedScopes: credential.scopes,
    };
  }

  async revokeApiCredential(
    context: TenantContext,
    credentialId: string,
    reason: string,
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "api_credential",
      resourceOrganizationId: context.organizationId,
    });
    const now = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      const credentials = await transaction
        .select()
        .from(schema.apiCredentials)
        .where(
          and(
            eq(schema.apiCredentials.id, credentialId),
            eq(schema.apiCredentials.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!credentials[0])
        throw new AuthenticationError("The API credential was not found.");
      await transaction
        .update(schema.apiCredentials)
        .set({
          revokedAt: now,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: credentials[0].revision + 1,
        })
        .where(eq(schema.apiCredentials.id, credentialId));
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "api_credential.revoked",
          resourceType: "api_credential",
          resourceId: credentialId,
          detail: { reason },
          occurredAt: now,
        },
      );
    });
  }

  async grantSupportAccess(
    context: TenantContext,
    input: {
      supportIdentityId: string;
      reason: string;
      scopes: string[];
      expiresAt: string;
    },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "support_access_grant",
      resourceOrganizationId: context.organizationId,
    });
    if (hasExpired(input.expiresAt, this.clock()))
      throw new ExpiredCredentialError(
        "Support access must expire in the future.",
      );
    const approvers = await this.database
      .select()
      .from(schema.memberships)
      .where(
        and(
          eq(schema.memberships.organizationId, context.organizationId),
          eq(schema.memberships.identitySubject, context.actorSubject),
          eq(schema.memberships.status, "active"),
        ),
      )
      .limit(1);
    if (!approvers[0])
      throw new AuthenticationError(
        "The support approver membership was not found.",
      );
    const now = iso(this.clock());
    const id = randomUUID();
    return this.database.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(schema.supportAccessGrants)
        .values({
          id,
          ...tenantRecord(context, now),
          supportIdentityId: input.supportIdentityId,
          approvedByMembershipId: approvers[0].id,
          reason: input.reason,
          scopes: [...new Set(input.scopes)].sort(),
          expiresAt: input.expiresAt,
        })
        .returning();
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "support_access.granted",
          resourceType: "support_access_grant",
          resourceId: id,
          detail: {
            supportIdentityId: input.supportIdentityId,
            reason: input.reason,
            scopes: input.scopes,
            expiresAt: input.expiresAt,
          },
          occurredAt: now,
        },
      );
      return inserted[0];
    });
  }

  async resolveSupportAccess(identityId: string, organizationId: string) {
    const now = iso(this.clock());
    const grants = await this.database
      .select()
      .from(schema.supportAccessGrants)
      .where(
        and(
          eq(schema.supportAccessGrants.organizationId, organizationId),
          eq(schema.supportAccessGrants.supportIdentityId, identityId),
          gt(schema.supportAccessGrants.expiresAt, now),
          isNull(schema.supportAccessGrants.revokedAt),
          eq(schema.supportAccessGrants.lifecycleStatus, "active"),
        ),
      );
    if (grants.length !== 1)
      throw new AuthenticationError("No single active support grant exists.");
    const identities = await this.database
      .select()
      .from(schema.identities)
      .where(
        and(
          eq(schema.identities.id, identityId),
          eq(schema.identities.lifecycleStatus, "active"),
        ),
      )
      .limit(1);
    if (!identities[0])
      throw new RevokedCredentialError("The support identity is inactive.");
    const grant = grants[0];
    return {
      organizationId,
      actorSubject: `support:${identities[0].providerKey}:${identities[0].providerSubject}`,
      principalType: "support_administrator" as const,
      grantedScopes: grant.scopes,
    };
  }

  async revokeSupportAccess(
    context: TenantContext,
    grantId: string,
    reason: string,
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "support_access_grant",
      resourceOrganizationId: context.organizationId,
    });
    const now = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      const grants = await transaction
        .select()
        .from(schema.supportAccessGrants)
        .where(
          and(
            eq(schema.supportAccessGrants.id, grantId),
            eq(
              schema.supportAccessGrants.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (!grants[0])
        throw new AuthenticationError("The support grant was not found.");
      await transaction
        .update(schema.supportAccessGrants)
        .set({
          revokedAt: now,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: grants[0].revision + 1,
        })
        .where(eq(schema.supportAccessGrants.id, grantId));
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "support_access.revoked",
          resourceType: "support_access_grant",
          resourceId: grantId,
          detail: { reason },
          occurredAt: now,
        },
      );
    });
  }

  async createExternalCaseAccess(
    context: TenantContext,
    input: {
      caseId: string;
      principalType: "external_collaborator" | "external_reviewer";
      email: string;
      displayName: string;
      purpose: string;
      scopes: string[];
      expiresAt: string;
    },
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "case_assignment",
      resourceOrganizationId: context.organizationId,
      caseId: input.caseId,
    });
    const now = iso(this.clock());
    if (hasExpired(input.expiresAt, this.clock()))
      throw new ExpiredCredentialError(
        "External access must expire in the future.",
      );
    const cases = await this.database
      .select({ id: schema.renewalCases.id })
      .from(schema.renewalCases)
      .where(
        and(
          eq(schema.renewalCases.organizationId, context.organizationId),
          eq(schema.renewalCases.id, input.caseId),
        ),
      )
      .limit(1);
    if (!cases[0])
      throw new AuthenticationError(
        "The case was not found in the active organization.",
      );
    const token = opaqueSecret("fexternal");
    return this.database.transaction(async (transaction) => {
      const principalId = randomUUID();
      await transaction.insert(schema.externalPrincipals).values({
        id: principalId,
        ...tenantRecord(context, now),
        principalType: input.principalType,
        email: input.email.trim().toLowerCase(),
        displayName: input.displayName,
        status: "active",
        expiresAt: input.expiresAt,
      });
      const assignmentId = randomUUID();
      await transaction.insert(schema.caseAssignments).values({
        id: assignmentId,
        ...tenantRecord(context, now),
        caseId: input.caseId,
        externalPrincipalId: principalId,
        assignmentRole:
          input.principalType === "external_reviewer"
            ? "reviewer"
            : "contributor",
        permissions: input.scopes,
        expiresAt: input.expiresAt,
      });
      const grantId = randomUUID();
      await transaction.insert(schema.externalAccessGrants).values({
        id: grantId,
        ...tenantRecord(context, now),
        externalPrincipalId: principalId,
        caseId: input.caseId,
        purpose: input.purpose,
        tokenHash: hashOpaqueSecret(token),
        scopes: input.scopes,
        expiresAt: input.expiresAt,
      });
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "external_access.granted",
          resourceType: "external_access_grant",
          resourceId: grantId,
          detail: {
            principalId,
            caseId: input.caseId,
            purpose: input.purpose,
            scopes: input.scopes,
            expiresAt: input.expiresAt,
          },
          occurredAt: now,
        },
      );
      return { token, principalId, assignmentId, grantId };
    });
  }

  async resolveExternalAccess(token: string): Promise<AuthorizationContext> {
    const current = this.clock();
    const now = iso(current);
    const grants = await this.database
      .select()
      .from(schema.externalAccessGrants)
      .where(eq(schema.externalAccessGrants.tokenHash, hashOpaqueSecret(token)))
      .limit(1);
    const grant = grants[0];
    if (!grant) throw new AuthenticationError();
    if (grant.revokedAt) throw new RevokedCredentialError();
    if (hasExpired(grant.expiresAt, current))
      throw new ExpiredCredentialError();
    const principals = await this.database
      .select()
      .from(schema.externalPrincipals)
      .where(
        and(
          eq(schema.externalPrincipals.id, grant.externalPrincipalId),
          eq(schema.externalPrincipals.organizationId, grant.organizationId),
        ),
      )
      .limit(1);
    const principal = principals[0];
    if (!principal || principal.status !== "active" || principal.revokedAt)
      throw new RevokedCredentialError("The external principal is inactive.");
    if (principal.expiresAt && hasExpired(principal.expiresAt, current))
      throw new ExpiredCredentialError("The external principal expired.");
    await this.database
      .update(schema.externalAccessGrants)
      .set({ lastUsedAt: now })
      .where(eq(schema.externalAccessGrants.id, grant.id));
    return {
      organizationId: grant.organizationId,
      actorSubject: `external:${principal.id}`,
      principalType: principal.principalType as
        | "external_collaborator"
        | "external_reviewer",
      grantedScopes: grant.scopes,
      assignedCaseIds: [grant.caseId],
    };
  }

  async revokeExternalAccess(
    context: TenantContext,
    grantId: string,
    reason: string,
  ) {
    assertAuthorized(context, {
      action: "manage",
      resource: "external_access_grant",
      resourceOrganizationId: context.organizationId,
    });
    const now = iso(this.clock());
    await this.database.transaction(async (transaction) => {
      const grants = await transaction
        .select()
        .from(schema.externalAccessGrants)
        .where(
          and(
            eq(schema.externalAccessGrants.id, grantId),
            eq(
              schema.externalAccessGrants.organizationId,
              context.organizationId,
            ),
          ),
        )
        .limit(1);
      if (!grants[0])
        throw new AuthenticationError(
          "The external access grant was not found.",
        );
      await transaction
        .update(schema.externalAccessGrants)
        .set({
          revokedAt: now,
          updatedAt: now,
          updatedBy: context.actorSubject,
          revision: grants[0].revision + 1,
        })
        .where(eq(schema.externalAccessGrants.id, grantId));
      await appendAudit(
        transaction as unknown as ProductionDatabaseLike,
        context,
        {
          action: "external_access.revoked",
          resourceType: "external_access_grant",
          resourceId: grantId,
          detail: { reason },
          occurredAt: now,
        },
      );
    });
  }
}

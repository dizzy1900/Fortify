import { getProductionDatabase } from "@/db/production/client";
import {
  AuthenticationError,
  hashOpaqueSecret,
  IdentityService,
} from "@/lib/production/identity-service";
import type { VerifiedIdentityProfile } from "@/lib/production/identity-provider";
import type {
  ProductionDatabaseLike,
  TenantContext,
} from "@/lib/production/repository";
import {
  resolveTenantBootstrap,
  TenantBootstrapNotFoundError,
  type TenantBootstrapKind,
} from "@/lib/production/tenant-bootstrap";
import {
  setTenantTransactionContext,
  withApplicationTransaction,
  withTenantTransaction,
  type TenantTransaction,
} from "@/lib/production/tenant-transaction";

export function getProductionIdentityService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new IdentityService(database);
}

function authenticationContext(
  organizationId: string,
  actorSubject: string,
): TenantContext {
  return {
    organizationId,
    actorSubject,
    principalType: "service_account",
    grantedScopes: [],
  };
}

export async function withIdentityTenantBootstrap<T>(
  input: {
    kind: TenantBootstrapKind;
    lookupHash: string;
    credentialPrefix?: string;
    actorSubject: string;
  },
  operation: (
    organizationId: string,
    transaction: TenantTransaction,
  ) => Promise<T>,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return withApplicationTransaction(async (transaction) => {
    const organizationId = await resolveTenantBootstrap(transaction, input);
    await setTenantTransactionContext(
      transaction,
      authenticationContext(organizationId, input.actorSubject),
    );
    return operation(organizationId, transaction);
  }, database);
}

export async function resolveInvitationForOidc(
  token: string,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return withIdentityTenantBootstrap(
    {
      kind: "invitation",
      lookupHash: hashOpaqueSecret(token),
      actorSubject: "authentication:invitation",
    },
    async (organizationId, transaction) => {
      const invitation =
        await getProductionIdentityService(
          transaction,
        ).resolveInvitationForAuthentication(token);
      if (invitation.organizationId !== organizationId)
        throw new AuthenticationError();
      return invitation;
    },
    database,
  );
}

export async function consumeOidcAttemptForRequest(
  providerKey: string,
  state: string,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return withApplicationTransaction(async (transaction) => {
    let organizationId: string | undefined;
    try {
      organizationId = await resolveTenantBootstrap(transaction, {
        kind: "authentication_attempt",
        lookupHash: hashOpaqueSecret(state),
        credentialPrefix: providerKey,
      });
    } catch (error) {
      if (!(error instanceof TenantBootstrapNotFoundError)) throw error;
    }
    const attempt = await getProductionIdentityService(
      transaction,
    ).consumeAuthenticationAttempt(providerKey, state);
    return { attempt, organizationId };
  }, database);
}

export async function resolveVerifiedIdentityOrganization(
  profile: VerifiedIdentityProfile,
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return withApplicationTransaction(
    (transaction) =>
      resolveTenantBootstrap(transaction, {
        kind: "identity_membership",
        lookupHash: profile.providerSubject,
        credentialPrefix: profile.providerKey,
      }),
    database,
  );
}

export async function issueIdentitySession(
  input: {
    organizationId: string;
    profile: VerifiedIdentityProfile;
    invitationId?: string;
    userAgent?: string;
  },
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  const actorSubject = `${input.profile.providerKey}:${input.profile.providerSubject}`;
  return withTenantTransaction(
    authenticationContext(input.organizationId, actorSubject),
    async (transaction) => {
      const identity = getProductionIdentityService(transaction);
      const accepted = input.invitationId
        ? await identity.acceptInvitationById(input.invitationId, input.profile)
        : undefined;
      if (
        accepted &&
        accepted.membership.organizationId !== input.organizationId
      )
        throw new AuthenticationError();
      const session = await identity.issueSession({
        profile: input.profile,
        activeOrganizationId: input.organizationId,
        userAgent: input.userAgent,
      });
      return { accepted, session };
    },
    database,
  );
}

export function presentMembershipInvitation(
  invitation: {
    token: string;
    invitationId: string;
    membershipId: string;
    expiresAt: string;
  },
  applicationOrigin: string | undefined,
) {
  return {
    invitationId: invitation.invitationId,
    membershipId: invitation.membershipId,
    expiresAt: invitation.expiresAt,
    acceptanceUrl: applicationOrigin
      ? new URL(
          `/api/auth/oidc/start?invitation=${encodeURIComponent(invitation.token)}`,
          applicationOrigin,
        ).href
      : null,
    deliveryStatus: applicationOrigin
      ? ("ready_for_out_of_band_delivery" as const)
      : ("blocked_missing_app_origin" as const),
  };
}

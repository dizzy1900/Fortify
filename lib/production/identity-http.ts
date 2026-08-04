import { getProductionDatabase } from "@/db/production/client";
import { IdentityService } from "@/lib/production/identity-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";

export function getProductionIdentityService(
  database: ProductionDatabaseLike = getProductionDatabase() as unknown as ProductionDatabaseLike,
) {
  return new IdentityService(database);
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

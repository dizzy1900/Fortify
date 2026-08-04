CREATE OR REPLACE FUNCTION public.fortify_resolve_request_tenant(
  p_credential_kind text,
  p_token_hash text,
  p_credential_prefix text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_organization_id text;
BEGIN
  CASE p_credential_kind
    WHEN 'session' THEN
      SELECT session.active_organization_id
        INTO resolved_organization_id
      FROM public.sessions AS session
      INNER JOIN public.identities AS identity
        ON identity.id = session.identity_id
       AND identity.lifecycle_status = 'active'
      INNER JOIN public.memberships AS membership
        ON membership.organization_id = session.active_organization_id
       AND membership.identity_id = session.identity_id
       AND membership.status = 'active'
       AND membership.lifecycle_status = 'active'
      WHERE session.token_hash = p_token_hash
        AND session.active_organization_id IS NOT NULL
        AND session.revoked_at IS NULL
        AND session.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;

    WHEN 'api_credential' THEN
      SELECT credential.organization_id
        INTO resolved_organization_id
      FROM public.api_credentials AS credential
      INNER JOIN public.service_accounts AS account
        ON account.id = credential.service_account_id
       AND account.organization_id = credential.organization_id
       AND account.status = 'active'
       AND account.revoked_at IS NULL
       AND account.lifecycle_status = 'active'
       AND (account.expires_at IS NULL OR account.expires_at > CURRENT_TIMESTAMP)
      WHERE credential.credential_prefix = p_credential_prefix
        AND credential.secret_hash = p_token_hash
        AND credential.revoked_at IS NULL
        AND credential.lifecycle_status = 'active'
        AND (credential.expires_at IS NULL OR credential.expires_at > CURRENT_TIMESTAMP)
      LIMIT 1;

    WHEN 'external_case' THEN
      SELECT grant_row.organization_id
        INTO resolved_organization_id
      FROM public.external_access_grants AS grant_row
      INNER JOIN public.external_principals AS principal
        ON principal.id = grant_row.external_principal_id
       AND principal.organization_id = grant_row.organization_id
       AND principal.status = 'active'
       AND principal.revoked_at IS NULL
       AND principal.lifecycle_status = 'active'
       AND (principal.expires_at IS NULL OR principal.expires_at > CURRENT_TIMESTAMP)
      WHERE grant_row.token_hash = p_token_hash
        AND grant_row.revoked_at IS NULL
        AND grant_row.lifecycle_status = 'active'
        AND grant_row.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;

    WHEN 'external_project' THEN
      SELECT assignment.organization_id
        INTO resolved_organization_id
      FROM public.project_external_assignments AS assignment
      INNER JOIN public.external_principals AS principal
        ON principal.id = assignment.external_principal_id
       AND principal.organization_id = assignment.organization_id
       AND principal.status = 'active'
       AND principal.revoked_at IS NULL
       AND principal.lifecycle_status = 'active'
       AND (principal.expires_at IS NULL OR principal.expires_at > CURRENT_TIMESTAMP)
      WHERE assignment.token_hash = p_token_hash
        AND assignment.revoked_at IS NULL
        AND assignment.lifecycle_status = 'active'
        AND assignment.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;

    WHEN 'external_verification' THEN
      SELECT assignment.organization_id
        INTO resolved_organization_id
      FROM public.verification_assignments AS assignment
      INNER JOIN public.verifiers AS verifier
        ON verifier.id = assignment.verifier_id
       AND verifier.organization_id = assignment.organization_id
       AND verifier.status = 'active'
       AND verifier.lifecycle_status = 'active'
      INNER JOIN public.verifier_credentials AS credential
        ON credential.id = assignment.credential_id
       AND credential.organization_id = assignment.organization_id
       AND credential.verify_current_status = 'verified_current'
       AND credential.expires_on >= CURRENT_DATE
       AND credential.lifecycle_status = 'active'
      WHERE assignment.token_hash = p_token_hash
        AND assignment.revoked_at IS NULL
        AND assignment.lifecycle_status = 'active'
        AND assignment.expires_at > CURRENT_TIMESTAMP
      LIMIT 1;

    WHEN 'webhook_endpoint' THEN
      SELECT endpoint.organization_id
        INTO resolved_organization_id
      FROM public.integration_webhook_endpoints AS endpoint
      INNER JOIN public.integration_connections AS connection
        ON connection.id = endpoint.connection_id
       AND connection.organization_id = endpoint.organization_id
       AND connection.status = 'connected'
       AND connection.lifecycle_status = 'active'
      INNER JOIN public.api_credentials AS credential
        ON credential.id = endpoint.api_credential_id
       AND credential.organization_id = endpoint.organization_id
       AND credential.revoked_at IS NULL
       AND credential.lifecycle_status = 'active'
       AND (credential.expires_at IS NULL OR credential.expires_at > CURRENT_TIMESTAMP)
      WHERE endpoint.endpoint_key = p_token_hash
        AND endpoint.status = 'active'
        AND endpoint.lifecycle_status = 'active'
      LIMIT 1;

    WHEN 'invitation' THEN
      SELECT invitation.organization_id
        INTO resolved_organization_id
      FROM public.invitations AS invitation
      INNER JOIN public.memberships AS membership
        ON membership.id = invitation.membership_id
       AND membership.organization_id = invitation.organization_id
       AND membership.status = 'invited'
       AND membership.lifecycle_status = 'active'
      WHERE invitation.token_hash = p_token_hash
        AND invitation.accepted_at IS NULL
        AND invitation.revoked_at IS NULL
        AND invitation.expires_at > CURRENT_TIMESTAMP
        AND invitation.lifecycle_status = 'active'
      LIMIT 1;

    WHEN 'authentication_attempt' THEN
      SELECT CASE
          WHEN attempt.invitation_id IS NOT NULL THEN invitation.organization_id
          ELSE attempt.active_organization_id
        END
        INTO resolved_organization_id
      FROM public.authentication_attempts AS attempt
      LEFT JOIN public.invitations AS invitation
        ON invitation.id = attempt.invitation_id
      WHERE attempt.state_hash = p_token_hash
        AND attempt.provider_key = p_credential_prefix
        AND attempt.consumed_at IS NULL
        AND attempt.expires_at > CURRENT_TIMESTAMP
        AND (
          attempt.invitation_id IS NULL
          OR invitation.id IS NOT NULL
        )
        AND (
          attempt.active_organization_id IS NULL
          OR invitation.organization_id IS NULL
          OR attempt.active_organization_id = invitation.organization_id
        )
      LIMIT 1;

    WHEN 'identity_membership' THEN
      SELECT min(membership.organization_id)
        INTO resolved_organization_id
      FROM public.identities AS identity
      INNER JOIN public.memberships AS membership
        ON membership.identity_id = identity.id
       AND membership.status = 'active'
       AND membership.lifecycle_status = 'active'
      WHERE identity.provider_key = p_credential_prefix
        AND identity.provider_subject = p_token_hash
        AND identity.lifecycle_status = 'active'
      HAVING count(DISTINCT membership.organization_id) = 1;

    ELSE
      RETURN NULL;
  END CASE;

  RETURN resolved_organization_id;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.fortify_resolve_request_tenant(text, text, text) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.fortify_resolve_request_tenant(text, text, text) TO fortify_app;

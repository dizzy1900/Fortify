import * as oidc from "openid-client";

export interface VerifiedIdentityProfile {
  providerKey: string;
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  authenticationMethods: string[];
  mfaCapable: boolean;
}

export interface AuthenticationAttemptMaterial {
  state: string;
  nonce: string;
  pkceVerifier: string;
  redirectUri: string;
  returnTo: string;
  activeOrganizationId?: string;
  invitationId?: string;
}

export interface IdentityProvider {
  readonly key: string;
  begin(input: {
    redirectUri: string;
    returnTo: string;
    activeOrganizationId?: string;
  }): Promise<{ authorizationUrl: URL; attempt: AuthenticationAttemptMaterial }>;
  complete(input: {
    callbackUrl: URL;
    attempt: AuthenticationAttemptMaterial;
  }): Promise<VerifiedIdentityProfile>;
}

export interface OidcProviderConfiguration {
  key: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export class IdentityProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdentityProviderConfigurationError";
  }
}

export class OidcIdentityProvider implements IdentityProvider {
  readonly key: string;
  private configuration?: oidc.Configuration;

  constructor(private readonly settings: OidcProviderConfiguration) {
    this.key = settings.key;
    if (!settings.key.trim())
      throw new IdentityProviderConfigurationError("OIDC provider key is required.");
    if (!settings.clientId.trim() || !settings.clientSecret.trim())
      throw new IdentityProviderConfigurationError(
        "OIDC client ID and secret are required.",
      );
    const issuer = new URL(settings.issuer);
    if (issuer.protocol !== "https:")
      throw new IdentityProviderConfigurationError(
        "Production OIDC issuer URLs must use HTTPS.",
      );
  }

  private async getConfiguration() {
    if (!this.configuration)
      this.configuration = await oidc.discovery(
        new URL(this.settings.issuer),
        this.settings.clientId,
        this.settings.clientSecret,
      );
    return this.configuration;
  }

  async begin(input: {
    redirectUri: string;
    returnTo: string;
    activeOrganizationId?: string;
  }) {
    const configuration = await this.getConfiguration();
    const pkceVerifier = oidc.randomPKCECodeVerifier();
    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(pkceVerifier);
    const authorizationUrl = oidc.buildAuthorizationUrl(configuration, {
      redirect_uri: input.redirectUri,
      scope: (this.settings.scopes ?? ["openid", "email", "profile"]).join(" "),
      response_type: "code",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce,
    });
    return {
      authorizationUrl,
      attempt: {
        state,
        nonce,
        pkceVerifier,
        redirectUri: input.redirectUri,
        returnTo: input.returnTo,
        activeOrganizationId: input.activeOrganizationId,
      },
    };
  }

  async complete(input: {
    callbackUrl: URL;
    attempt: AuthenticationAttemptMaterial;
  }) {
    const configuration = await this.getConfiguration();
    const tokens = await oidc.authorizationCodeGrant(
      configuration,
      input.callbackUrl,
      {
        pkceCodeVerifier: input.attempt.pkceVerifier,
        expectedState: input.attempt.state,
        expectedNonce: input.attempt.nonce,
      },
    );
    const claims = tokens.claims();
    if (!claims?.sub)
      throw new IdentityProviderConfigurationError(
        "The OIDC response did not contain a stable subject.",
      );
    if (typeof claims.email !== "string" || !claims.email.trim())
      throw new IdentityProviderConfigurationError(
        "The OIDC response did not contain an email address.",
      );
    const authenticationMethods = Array.isArray(claims.amr)
      ? claims.amr.filter((value): value is string => typeof value === "string")
      : [];
    const displayName =
      (typeof claims.name === "string" && claims.name.trim()) || claims.email;
    return {
      providerKey: this.key,
      providerSubject: claims.sub,
      email: claims.email.toLowerCase(),
      emailVerified: claims.email_verified === true,
      displayName,
      authenticationMethods,
      mfaCapable: authenticationMethods.some((method) =>
        ["mfa", "otp", "hwk", "swk", "fpt"].includes(method),
      ),
    };
  }
}

export class LocalDevelopmentIdentityProvider {
  readonly key = "local-development";

  constructor(private readonly environment: NodeJS.ProcessEnv = process.env) {}

  authenticate(input: { subject: string; email: string; displayName: string }) {
    if (
      this.environment.NODE_ENV === "production" ||
      this.environment.FORTIFY_LOCAL_IDENTITY_ENABLED !== "true"
    )
      throw new IdentityProviderConfigurationError(
        "The local identity provider is disabled outside explicit development use.",
      );
    if (!input.subject.trim() || !input.email.includes("@"))
      throw new IdentityProviderConfigurationError(
        "A local development subject and email are required.",
      );
    return {
      providerKey: this.key,
      providerSubject: input.subject,
      email: input.email.trim().toLowerCase(),
      emailVerified: true,
      displayName: input.displayName.trim() || input.email.trim(),
      authenticationMethods: ["local-development"],
      mfaCapable: false,
    } satisfies VerifiedIdentityProfile;
  }
}

export function loadOidcProvider(
  environment: NodeJS.ProcessEnv = process.env,
) {
  const issuer = environment.FORTIFY_OIDC_ISSUER;
  const clientId = environment.FORTIFY_OIDC_CLIENT_ID;
  const clientSecret = environment.FORTIFY_OIDC_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret)
    throw new IdentityProviderConfigurationError(
      "FORTIFY_OIDC_ISSUER, FORTIFY_OIDC_CLIENT_ID, and FORTIFY_OIDC_CLIENT_SECRET are required.",
    );
  return new OidcIdentityProvider({
    key: environment.FORTIFY_OIDC_PROVIDER_KEY ?? "oidc",
    issuer,
    clientId,
    clientSecret,
  });
}

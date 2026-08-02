import { createHmac, timingSafeEqual } from "node:crypto";

export const INTEGRATION_PROVIDER_TYPES = [
  "microsoft_graph_email",
  "gmail_email",
  "google_drive",
  "generic_ams",
  "applied_epic",
  "ams360",
  "property_management",
  "external_model",
  "verifier",
] as const;

export type IntegrationProviderType =
  (typeof INTEGRATION_PROVIDER_TYPES)[number];
export type IntegrationDirection = "pull" | "push";

export type IntegrationRecord = {
  externalId: string;
  resourceKind: string;
  externalVersion: string;
  observedAt: string;
  payload: Record<string, unknown>;
};

export type IntegrationPage = {
  records: IntegrationRecord[];
  nextCursor?: string;
  sourceReference: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
};

export type IntegrationPushResult = {
  accepted: number;
  rejected: number;
  sourceReference: string;
  response: Record<string, unknown>;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
};

export type IntegrationHealth = {
  status: "healthy" | "degraded" | "unavailable" | "misconfigured";
  latencyMs: number;
  rateLimitRemaining?: number;
  detail: string;
};

export type IntegrationProviderRequest = {
  organizationId: string;
  connectionId: string;
  resourceKind: string;
  schemaVersion: string;
  credential?: string;
};

export interface IntegrationProvider {
  readonly type: IntegrationProviderType;
  readonly key: string;
  readonly version: string;
  readonly fixture: boolean;
  readonly capabilities: readonly IntegrationDirection[];
  health(input: Omit<IntegrationProviderRequest, "resourceKind" | "schemaVersion">): Promise<IntegrationHealth>;
  pullPage(
    input: IntegrationProviderRequest & { cursor?: string; pageSize: number },
  ): Promise<IntegrationPage>;
  pushBatch(
    input: IntegrationProviderRequest & { records: IntegrationRecord[] },
  ): Promise<IntegrationPushResult>;
}

export interface IntegrationCredentialResolver {
  resolve(input: {
    organizationId: string;
    credentialId: string;
    providerType: IntegrationProviderType;
  }): Promise<string>;
}

export class IntegrationProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly code = "integration_provider_error",
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "IntegrationProviderError";
  }
}

export class UnavailableCredentialResolver
  implements IntegrationCredentialResolver
{
  async resolve(): Promise<never> {
    throw new IntegrationProviderError(
      "Live integration credentials are unavailable in this runtime.",
      false,
      "credential_unavailable",
    );
  }
}

type DeterministicProviderOptions = {
  type: IntegrationProviderType;
  key?: string;
  version?: string;
  records?: IntegrationRecord[];
  failuresBeforeSuccess?: number;
  health?: IntegrationHealth["status"];
  capabilities?: IntegrationDirection[];
};

export class DeterministicIntegrationProvider implements IntegrationProvider {
  readonly fixture = true;
  readonly type: IntegrationProviderType;
  readonly key: string;
  readonly version: string;
  readonly capabilities: readonly IntegrationDirection[];
  private failuresRemaining: number;
  private readonly records: IntegrationRecord[];
  private readonly healthState: IntegrationHealth["status"];

  constructor(input: DeterministicProviderOptions) {
    this.type = input.type;
    this.key = input.key ?? `fortify-fixture-${input.type}`;
    this.version = input.version ?? "1.0.0";
    this.capabilities = input.capabilities ?? ["pull", "push"];
    this.failuresRemaining = input.failuresBeforeSuccess ?? 0;
    this.healthState = input.health ?? "healthy";
    this.records = structuredClone(input.records ?? []);
  }

  async health(): Promise<IntegrationHealth> {
    return {
      status: this.healthState,
      latencyMs: 0,
      rateLimitRemaining: 999,
      detail:
        this.healthState === "healthy"
          ? "Deterministic provider fixture is available; no live system was contacted."
          : "Deterministic provider fixture is exercising a non-healthy state.",
    };
  }

  private maybeFail() {
    if (this.failuresRemaining <= 0) return;
    this.failuresRemaining -= 1;
    throw new IntegrationProviderError(
      "Deterministic provider fixture returned a transient throttle.",
      true,
      "fixture_rate_limited",
      30,
    );
  }

  async pullPage(
    input: IntegrationProviderRequest & { cursor?: string; pageSize: number },
  ): Promise<IntegrationPage> {
    if (!this.capabilities.includes("pull"))
      throw new IntegrationProviderError(
        "This provider does not support pull operations.",
        false,
        "direction_unsupported",
      );
    this.maybeFail();
    const offset = input.cursor ? Number(input.cursor) : 0;
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new IntegrationProviderError(
        "The provider cursor is invalid.",
        false,
        "invalid_cursor",
      );
    const records = this.records
      .filter((record) => record.resourceKind === input.resourceKind)
      .slice(offset, offset + input.pageSize);
    const nextOffset = offset + records.length;
    const total = this.records.filter(
      (record) => record.resourceKind === input.resourceKind,
    ).length;
    return {
      records: structuredClone(records),
      nextCursor: nextOffset < total ? String(nextOffset) : undefined,
      sourceReference: `fixture://${this.type}/${input.resourceKind}?offset=${offset}`,
      rateLimitRemaining: 999,
    };
  }

  async pushBatch(
    input: IntegrationProviderRequest & { records: IntegrationRecord[] },
  ): Promise<IntegrationPushResult> {
    if (!this.capabilities.includes("push"))
      throw new IntegrationProviderError(
        "This provider does not support push operations.",
        false,
        "direction_unsupported",
      );
    this.maybeFail();
    return {
      accepted: input.records.length,
      rejected: 0,
      sourceReference: `fixture://${this.type}/${input.resourceKind}/export`,
      response: {
        fixture: true,
        acknowledgement: "provider_fixture_received_not_external_acceptance",
        acceptedExternalIds: input.records.map((record) => record.externalId),
      },
      rateLimitRemaining: 999,
    };
  }
}

export class RemoteIntegrationProvider implements IntegrationProvider {
  readonly fixture = false;

  constructor(
    readonly type: IntegrationProviderType,
    readonly key: string,
    readonly version: string,
    readonly capabilities: readonly IntegrationDirection[],
    private readonly operations: {
      health: IntegrationProvider["health"];
      pullPage: IntegrationProvider["pullPage"];
      pushBatch: IntegrationProvider["pushBatch"];
    },
  ) {
    if (!key.trim() || !version.trim())
      throw new Error("Remote providers require an explicit key and version.");
  }

  health(input: Parameters<IntegrationProvider["health"]>[0]) {
    return this.operations.health(input);
  }

  pullPage(input: Parameters<IntegrationProvider["pullPage"]>[0]) {
    return this.operations.pullPage(input);
  }

  pushBatch(input: Parameters<IntegrationProvider["pushBatch"]>[0]) {
    return this.operations.pushBatch(input);
  }
}

export class UnavailableIntegrationProvider implements IntegrationProvider {
  readonly fixture = false;
  readonly capabilities = ["pull", "push"] as const;

  constructor(
    readonly type: IntegrationProviderType,
    readonly key = `unavailable-${type}`,
    readonly version = "unconfigured",
  ) {}

  async health(): Promise<IntegrationHealth> {
    return {
      status: "misconfigured",
      latencyMs: 0,
      detail: "No live provider configuration is available; no external system was contacted.",
    };
  }

  async pullPage(): Promise<never> {
    throw new IntegrationProviderError(
      "The live provider is not configured; no records were imported.",
      false,
      "provider_unconfigured",
    );
  }

  async pushBatch(): Promise<never> {
    throw new IntegrationProviderError(
      "The live provider is not configured; no records were exported.",
      false,
      "provider_unconfigured",
    );
  }
}

export const providerBoundaryCatalog = [
  {
    type: "microsoft_graph_email",
    label: "Microsoft Graph email intake",
    directions: ["pull"] as const,
    resources: ["mail_message", "mail_attachment"],
  },
  {
    type: "gmail_email",
    label: "Gmail email intake",
    directions: ["pull"] as const,
    resources: ["mail_message", "mail_attachment"],
  },
  {
    type: "google_drive",
    label: "Google Drive evidence intake",
    directions: ["pull"] as const,
    resources: ["drive_file"],
  },
  {
    type: "generic_ams",
    label: "Generic AMS exchange",
    directions: ["pull", "push"] as const,
    resources: ["client", "property", "policy", "renewal"],
  },
  {
    type: "applied_epic",
    label: "Applied Epic compatible exchange",
    directions: ["pull", "push"] as const,
    resources: ["client", "property", "policy", "activity"],
  },
  {
    type: "ams360",
    label: "AMS360 compatible exchange",
    directions: ["pull", "push"] as const,
    resources: ["client", "property", "policy", "activity"],
  },
  {
    type: "property_management",
    label: "Property-management boundary",
    directions: ["pull", "push"] as const,
    resources: ["community", "building", "unit_summary", "work_order"],
  },
  {
    type: "external_model",
    label: "External model boundary",
    directions: ["pull", "push"] as const,
    resources: ["model_input", "model_output"],
  },
  {
    type: "verifier",
    label: "Independent verifier boundary",
    directions: ["pull", "push"] as const,
    resources: ["assignment", "finding", "certificate"],
  },
] satisfies Array<{
  type: IntegrationProviderType;
  label: string;
  directions: readonly IntegrationDirection[];
  resources: string[];
}>;

export function signIntegrationWebhook(
  secret: string,
  timestamp: string,
  body: Uint8Array,
) {
  return createHmac("sha256", secret)
    .update(timestamp)
    .update(".")
    .update(body)
    .digest("hex");
}

export function verifyIntegrationWebhook(input: {
  secret: string;
  timestamp: string;
  body: Uint8Array;
  signature: string;
  toleranceSeconds: number;
  now: Date;
}) {
  const timestampMs = Date.parse(input.timestamp);
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(input.now.getTime() - timestampMs) > input.toleranceSeconds * 1000
  )
    throw new IntegrationProviderError(
      "The webhook timestamp is outside the accepted replay window.",
      false,
      "webhook_timestamp_invalid",
    );
  const expected = Buffer.from(
    signIntegrationWebhook(input.secret, input.timestamp, input.body),
    "hex",
  );
  const provided = /^[a-f0-9]{64}$/.test(input.signature)
    ? Buffer.from(input.signature, "hex")
    : Buffer.alloc(0);
  if (provided.byteLength !== expected.byteLength || !timingSafeEqual(provided, expected))
    throw new IntegrationProviderError(
      "The webhook signature is invalid.",
      false,
      "webhook_signature_invalid",
    );
  return true;
}

import { createHash } from "node:crypto";

export type MarketDeliveryInput = {
  organizationId: string;
  submissionVersionId: string;
  destination: string;
  deliveryMethod: "secure_review_link" | "encrypted_email" | "manual_export" | "provider_api";
  requestHash: string;
  artifactHashes: Array<{ filename: string; sha256: string }>;
  attemptedAt: string;
};

export type MarketDeliveryResult = {
  providerReference: string;
  receiptType: "provider_acknowledgement" | "review_link_created" | "manual_custody" | "recipient_acknowledgement";
  receiptBody: Uint8Array;
  sourceAuthority: string;
  sourceReference: string;
  deliveredAt: string;
};

export interface MarketDeliveryProvider {
  readonly key: string;
  deliver(input: MarketDeliveryInput): Promise<MarketDeliveryResult>;
}

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stable(row[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

/** Offline-only fixture provider. It records custody; it does not imply recipient acceptance. */
export class DeterministicMarketDeliveryProvider implements MarketDeliveryProvider {
  readonly key = "deterministic-offline-custody";

  async deliver(input: MarketDeliveryInput): Promise<MarketDeliveryResult> {
    const body = new TextEncoder().encode(stable({
      schema: "fortify.delivery-receipt.1",
      provider: this.key,
      ...input,
      acknowledgement: "delivery_recorded_not_recipient_acceptance",
    }));
    const reference = createHash("sha256").update(body).digest("hex").slice(0, 24);
    return {
      providerReference: `fixture-${reference}`,
      receiptType: input.deliveryMethod === "secure_review_link" ? "review_link_created" : "manual_custody",
      receiptBody: body,
      sourceAuthority: "Fortify deterministic offline delivery fixture",
      sourceReference: `fixture://${reference}`,
      deliveredAt: input.attemptedAt,
    };
  }
}

export class UnavailableMarketDeliveryProvider implements MarketDeliveryProvider {
  readonly key = "unavailable-provider";
  async deliver(): Promise<never> {
    throw new Error("The configured delivery provider is unavailable; no delivery is claimed.");
  }
}

import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import {
  assertAuthorized,
  AuthorizationDeniedError,
} from "@/lib/production/authorization";
import {
  BROKERAGE_PACKET_RECIPE_VERSION,
  buildBrokeragePacket,
  type BrokeragePacketModel,
  type PacketArtifact,
} from "@/lib/production/brokerage-packet";
import type { ObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  appendAudit,
  digest,
  IdempotencyConflictError,
  tenantRecord,
  TenantResourceNotFoundError,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";

const requiredNoticeFacts = [
  "market",
  "policy",
  "noticeDate",
  "deadline",
  "requiredEvidence",
] as const;

const recipientTypes = [
  "property_manager",
  "board_contributor",
  "contractor_evidence_contributor",
  "other_authorized_contributor",
] as const;

export type EvidenceRequestRecipientType = (typeof recipientTypes)[number];

export type RequestedEvidenceItem = {
  evidenceType: string;
  label: string;
  required: boolean;
  scopeType: string;
  scopeReference?: string;
  guidance: string;
};

export type CreateEvidenceRequestInput = {
  caseId: string;
  externalPrincipalId?: string;
  recipientType: EvidenceRequestRecipientType;
  recipientLabel: string;
  purpose: string;
  instructions: string;
  dueAt: string;
  requestedItems: RequestedEvidenceItem[];
  humanConfirmation: boolean;
};

export type GenerateBrokeragePacketInput = {
  caseId: string;
  purpose: string;
  letter: string;
  humanConfirmation: boolean;
};

export class BrokerageCaseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerageCaseValidationError";
  }
}

export class BrokerageCaseStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrokerageCaseStateError";
  }
}

const iso = (date: Date) => date.toISOString();
const trim = (value: string) => value.trim();
const sha256 = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

function requiredText(value: string, label: string, minimum = 1) {
  const normalized = trim(value);
  if (normalized.length < minimum)
    throw new BrokerageCaseValidationError(
      `${label} must contain at least ${minimum} characters.`,
    );
  return normalized;
}

function validTimestamp(value: string, label: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.valueOf()))
    throw new BrokerageCaseValidationError(`${label} must be a valid timestamp.`);
  return date.toISOString();
}

function requireHumanMember(context: TenantContext, confirmation: boolean) {
  if (!confirmation)
    throw new BrokerageCaseValidationError(
      "Explicit human confirmation is required for this governed action.",
    );
  if (context.principalType !== "membership")
    throw new AuthorizationDeniedError(
      "This governed action requires an authenticated organization member.",
    );
}

function assertCaseAccess(
  context: TenantContext,
  caseId: string,
  resources: Array<{
    resource: Parameters<typeof assertAuthorized>[1]["resource"];
    action: Parameters<typeof assertAuthorized>[1]["action"];
  }>,
) {
  for (const request of resources)
    assertAuthorized(context, {
      ...request,
      resourceOrganizationId: context.organizationId,
      caseId,
    });
}

type CaseRow = Awaited<ReturnType<BrokerageCaseService["loadCase"]>>;

export class BrokerageCaseService {
  constructor(
    private readonly database: ProductionDatabaseLike,
    private readonly storage: ObjectStorageAdapter,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async loadCase(context: TenantContext, caseId: string) {
    const rows = await this.database
      .select({
        brokerageCase: schema.renewalCases,
        policy: schema.policies,
        property: schema.properties,
        community: schema.communities,
        client: schema.clients,
        market: schema.markets,
        organization: schema.organizations,
      })
      .from(schema.renewalCases)
      .innerJoin(
        schema.policies,
        eq(schema.renewalCases.policyId, schema.policies.id),
      )
      .innerJoin(
        schema.properties,
        eq(schema.policies.propertyId, schema.properties.id),
      )
      .innerJoin(
        schema.communities,
        eq(schema.properties.communityId, schema.communities.id),
      )
      .innerJoin(schema.clients, eq(schema.communities.clientId, schema.clients.id))
      .leftJoin(schema.markets, eq(schema.policies.marketId, schema.markets.id))
      .innerJoin(
        schema.organizations,
        eq(schema.renewalCases.organizationId, schema.organizations.id),
      )
      .where(
        and(
          eq(schema.renewalCases.id, caseId),
          eq(schema.renewalCases.organizationId, context.organizationId),
          eq(schema.policies.organizationId, context.organizationId),
          eq(schema.properties.organizationId, context.organizationId),
          eq(schema.communities.organizationId, context.organizationId),
          eq(schema.clients.organizationId, context.organizationId),
          eq(schema.organizations.id, context.organizationId),
        ),
      )
      .limit(1);
    if (!rows[0]) throw new TenantResourceNotFoundError("Brokerage case");
    return rows[0];
  }

  private async loadLocations(context: TenantContext, propertyId: string) {
    return this.database
      .select()
      .from(schema.locations)
      .where(
        and(
          eq(schema.locations.organizationId, context.organizationId),
          eq(schema.locations.propertyId, propertyId),
          eq(schema.locations.lifecycleStatus, "active"),
        ),
      )
      .orderBy(schema.locations.createdAt);
  }

  private async loadNoticeBundle(context: TenantContext, caseId: string) {
    const documents = await this.database
      .select()
      .from(schema.sourceDocuments)
      .where(
        and(
          eq(schema.sourceDocuments.organizationId, context.organizationId),
          eq(schema.sourceDocuments.caseId, caseId),
          inArray(schema.sourceDocuments.documentType, [
            "carrier_notice",
            "nonrenewal_notice",
            "risk_score_notice",
            "mitigation_discount_notice",
          ]),
          eq(schema.sourceDocuments.lifecycleStatus, "active"),
        ),
      )
      .orderBy(desc(schema.sourceDocuments.receivedAt));
    if (!documents.length)
      return { document: null, facts: [] as Array<typeof schema.documentFacts.$inferSelect> };
    const facts = await this.database
      .select()
      .from(schema.documentFacts)
      .where(
        and(
          eq(schema.documentFacts.organizationId, context.organizationId),
          inArray(
            schema.documentFacts.sourceDocumentId,
            documents.map((document) => document.id),
          ),
          eq(schema.documentFacts.lifecycleStatus, "active"),
        ),
      )
      .orderBy(desc(schema.documentFacts.versionNumber));
    for (const document of documents) {
      const latest = new Map<string, (typeof facts)[number]>();
      for (const fact of facts) {
        if (
          fact.sourceDocumentId === document.id &&
          !latest.has(fact.factKey)
        )
          latest.set(fact.factKey, fact);
      }
      if (requiredNoticeFacts.every((key) => latest.has(key)))
        return { document, facts: [...latest.values()] };
    }
    const document = documents[0];
    const latest = new Map<string, (typeof facts)[number]>();
    for (const fact of facts) {
      if (fact.sourceDocumentId === document.id && !latest.has(fact.factKey))
        latest.set(fact.factKey, fact);
    }
    return { document, facts: [...latest.values()] };
  }

  private async loadEvidenceRequests(context: TenantContext, caseId: string) {
    const rows = await this.database
      .select({
        request: schema.evidenceRequests,
        version: schema.evidenceRequestVersions,
      })
      .from(schema.evidenceRequests)
      .leftJoin(
        schema.evidenceRequestVersions,
        and(
          eq(
            schema.evidenceRequests.currentVersionId,
            schema.evidenceRequestVersions.id,
          ),
          eq(
            schema.evidenceRequestVersions.organizationId,
            context.organizationId,
          ),
        ),
      )
      .where(
        and(
          eq(schema.evidenceRequests.organizationId, context.organizationId),
          eq(schema.evidenceRequests.caseId, caseId),
          eq(schema.evidenceRequests.lifecycleStatus, "active"),
        ),
      )
      .orderBy(desc(schema.evidenceRequests.createdAt));
    return rows.map(({ request, version }) => ({ request, version }));
  }

  private async loadEvidence(context: TenantContext, propertyId: string) {
    return this.database
      .select({ item: schema.evidenceItems, version: schema.evidenceVersions })
      .from(schema.evidenceItems)
      .innerJoin(
        schema.evidenceVersions,
        and(
          eq(schema.evidenceItems.currentVersionId, schema.evidenceVersions.id),
          eq(schema.evidenceVersions.organizationId, context.organizationId),
        ),
      )
      .where(
        and(
          eq(schema.evidenceItems.organizationId, context.organizationId),
          eq(schema.evidenceItems.propertyId, propertyId),
          eq(schema.evidenceItems.lifecycleStatus, "active"),
          eq(schema.evidenceVersions.lifecycleStatus, "active"),
        ),
      )
      .orderBy(schema.evidenceVersions.receivedAt);
  }

  async createEvidenceRequest(
    context: TenantContext,
    idempotencyKey: string,
    input: CreateEvidenceRequestInput,
  ) {
    requireHumanMember(context, input.humanConfirmation);
    assertCaseAccess(context, input.caseId, [
      { resource: "evidence_request", action: "create" },
      { resource: "evidence_request_version", action: "create" },
    ]);
    if (!recipientTypes.includes(input.recipientType))
      throw new BrokerageCaseValidationError("Recipient type is not supported.");
    const recipientLabel = requiredText(input.recipientLabel, "Recipient label", 3);
    const purpose = requiredText(input.purpose, "Request purpose", 8);
    const instructions = requiredText(input.instructions, "Instructions", 12);
    const dueAt = validTimestamp(input.dueAt, "Due date");
    if (new Date(dueAt) <= this.clock())
      throw new BrokerageCaseValidationError("Evidence request due date must be in the future.");
    if (!input.requestedItems.length || input.requestedItems.length > 12)
      throw new BrokerageCaseValidationError(
        "Provide between one and twelve requested evidence items.",
      );
    const requestedItems = input.requestedItems.map((item) => ({
      evidenceType: requiredText(item.evidenceType, "Evidence type", 3),
      label: requiredText(item.label, "Evidence label", 3),
      required: Boolean(item.required),
      scopeType: requiredText(item.scopeType, "Evidence scope", 3),
      scopeReference: item.scopeReference?.trim() || undefined,
      guidance: requiredText(item.guidance, "Evidence guidance", 8),
    }));
    if (!idempotencyKey.trim()) throw new IdempotencyConflictError();
    await this.loadCase(context, input.caseId);
    if (input.externalPrincipalId) {
      const principal = await this.database
        .select({ id: schema.externalPrincipals.id })
        .from(schema.externalPrincipals)
        .where(
          and(
            eq(schema.externalPrincipals.id, input.externalPrincipalId),
            eq(schema.externalPrincipals.organizationId, context.organizationId),
            eq(schema.externalPrincipals.status, "active"),
            isNull(schema.externalPrincipals.revokedAt),
          ),
        )
        .limit(1);
      if (!principal[0])
        throw new TenantResourceNotFoundError("External principal");
    }
    const normalized = {
      caseId: input.caseId,
      externalPrincipalId: input.externalPrincipalId ?? null,
      recipientType: input.recipientType,
      recipientLabel,
      purpose,
      instructions,
      dueAt,
      requestedItems,
    };
    const requestHash = digest(normalized);
    const at = iso(this.clock());
    const requestId = randomUUID();
    const versionId = randomUUID();
    return this.database.transaction(async (transaction) => {
      const replay = await transaction
        .select()
        .from(schema.idempotencyKeys)
        .where(
          and(
            eq(schema.idempotencyKeys.organizationId, context.organizationId),
            eq(schema.idempotencyKeys.scope, "evidence_request.create"),
            eq(schema.idempotencyKeys.key, idempotencyKey),
          ),
        )
        .limit(1);
      if (replay[0]) {
        if (replay[0].requestHash !== requestHash)
          throw new IdempotencyConflictError();
        return replay[0].responseJson as {
          requestId: string;
          versionId: string;
          status: string;
          replayed: boolean;
        };
      }
      await transaction.insert(schema.evidenceRequests).values({
        id: requestId,
        ...tenantRecord(context, at),
        caseId: normalized.caseId,
        externalPrincipalId: normalized.externalPrincipalId,
        recipientType: normalized.recipientType,
        recipientLabel: normalized.recipientLabel,
        status: "draft",
        currentVersionId: versionId,
      });
      await transaction.insert(schema.evidenceRequestVersions).values({
        id: versionId,
        ...tenantRecord(context, at),
        evidenceRequestId: requestId,
        versionNumber: 1,
        purpose,
        instructions,
        dueAt,
        requestedItems,
        confirmedBy: context.actorSubject,
        confirmedAt: at,
      });
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "evidence_request.draft_confirmed",
        resourceType: "evidence_request",
        resourceId: requestId,
        detail: {
          caseId: input.caseId,
          versionId,
          recipientType: input.recipientType,
          requestedItemCount: requestedItems.length,
          externalPrincipalId: input.externalPrincipalId ?? null,
        },
        occurredAt: at,
      });
      const response = { requestId, versionId, status: "draft", replayed: false };
      await transaction.insert(schema.idempotencyKeys).values({
        id: randomUUID(),
        ...tenantRecord(context, at),
        scope: "evidence_request.create",
        key: idempotencyKey,
        requestHash,
        responseJson: response,
      });
      return response;
    });
  }

  async issueEvidenceRequest(
    context: TenantContext,
    requestId: string,
    input: { expiresAt: string; humanConfirmation: boolean },
  ) {
    requireHumanMember(context, input.humanConfirmation);
    const rows = await this.database
      .select()
      .from(schema.evidenceRequests)
      .where(
        and(
          eq(schema.evidenceRequests.id, requestId),
          eq(schema.evidenceRequests.organizationId, context.organizationId),
        ),
      )
      .limit(1);
    const request = rows[0];
    if (!request) throw new TenantResourceNotFoundError("Evidence request");
    assertCaseAccess(context, request.caseId, [
      { resource: "evidence_request", action: "update" },
    ]);
    if (request.status !== "draft")
      throw new BrokerageCaseStateError(
        "Only a confirmed draft evidence request can be issued.",
      );
    if (!request.currentVersionId)
      throw new BrokerageCaseStateError(
        "Evidence request has no immutable confirmed version.",
      );
    const expiresAt = validTimestamp(input.expiresAt, "Request expiry");
    const issuedAt = iso(this.clock());
    if (new Date(expiresAt) <= new Date(issuedAt))
      throw new BrokerageCaseValidationError("Request expiry must be in the future.");
    return this.database.transaction(async (transaction) => {
      const updated = await transaction
        .update(schema.evidenceRequests)
        .set({
          status: "issued",
          issuedBy: context.actorSubject,
          issuedAt,
          expiresAt,
          revision: request.revision + 1,
          updatedAt: issuedAt,
          updatedBy: context.actorSubject,
        })
        .where(
          and(
            eq(schema.evidenceRequests.id, request.id),
            eq(schema.evidenceRequests.organizationId, context.organizationId),
            eq(schema.evidenceRequests.revision, request.revision),
            eq(schema.evidenceRequests.status, "draft"),
          ),
        )
        .returning();
      if (!updated[0])
        throw new BrokerageCaseStateError(
          "Evidence request changed before it could be issued.",
        );
      await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
        action: "evidence_request.issued",
        resourceType: "evidence_request",
        resourceId: request.id,
        detail: {
          caseId: request.caseId,
          versionId: request.currentVersionId,
          expiresAt,
          deliveryEvidence:
            request.externalPrincipalId === null
              ? "off_platform_delivery_not_verified"
              : "scoped_external_principal_recorded",
        },
        occurredAt: issuedAt,
      });
      return updated[0];
    });
  }

  private packetModel(
    context: TenantContext,
    row: CaseRow,
    input: GenerateBrokeragePacketInput,
    generatedAt: string,
    notice: Awaited<ReturnType<BrokerageCaseService["loadNoticeBundle"]>>,
    locations: Awaited<ReturnType<BrokerageCaseService["loadLocations"]>>,
    requests: Awaited<ReturnType<BrokerageCaseService["loadEvidenceRequests"]>>,
    evidence: Awaited<ReturnType<BrokerageCaseService["loadEvidence"]>>,
    evidenceBodies: Uint8Array[],
    openContradictionCount: number,
  ): BrokeragePacketModel {
    if (!notice.document)
      throw new BrokerageCaseStateError(
        "A case-linked carrier notice is required before packet generation.",
      );
    const factKeys = new Set(notice.facts.map((fact) => fact.factKey));
    const missing = requiredNoticeFacts.filter((key) => !factKeys.has(key));
    if (missing.length)
      throw new BrokerageCaseStateError(
        `Human-confirm these required notice facts before packet generation: ${missing.join(", ")}.`,
      );
    if (!requests.length)
      throw new BrokerageCaseStateError(
        "Record at least one governed external evidence request before packet generation.",
      );
    const address = locations[0]
      ? [
          locations[0].addressLine1,
          locations[0].city,
          locations[0].region,
          locations[0].postalCode,
        ]
          .filter(Boolean)
          .join(", ")
      : "Address not recorded";
    return {
      generatedAt,
      synthetic: row.organization.synthetic,
      organization: { id: row.organization.id, name: row.organization.name },
      brokerageCase: {
        id: row.brokerageCase.id,
        title: row.brokerageCase.title,
        caseType: row.brokerageCase.caseType,
        status: row.brokerageCase.status,
        peril: row.brokerageCase.peril,
        jurisdiction: row.brokerageCase.jurisdiction,
        renewalDate: row.brokerageCase.renewalDate,
        appealDeadline: row.brokerageCase.appealDeadline,
      },
      client: { name: row.client.name },
      community: { name: row.community.name },
      property: {
        id: row.property.id,
        name: row.property.name,
        propertyClass: row.property.propertyClass,
        unitCount: row.property.unitCount,
        buildingCount: row.property.buildingCount,
        address,
      },
      policy: {
        policyNumber: row.policy.policyNumber,
        effectiveDate: row.policy.effectiveDate,
        expirationDate: row.policy.expirationDate,
        marketName: row.market?.name ?? null,
        sourceAuthority: row.policy.sourceAuthority,
      },
      notice: {
        documentId: notice.document.id,
        filename: notice.document.filename,
        sha256: notice.document.sha256,
        receivedAt: notice.document.receivedAt,
        facts: notice.facts.map((fact) => ({
          key: fact.factKey,
          value: fact.value,
          confirmedBy: fact.confirmedBy,
          confirmedAt: fact.confirmedAt,
          sourcePassageId: fact.sourcePassageId,
        })),
      },
      evidenceRequests: requests
        .filter((request) => request.version)
        .map(({ request, version }) => ({
          id: request.id,
          recipientType: request.recipientType,
          recipientLabel: request.recipientLabel,
          status: request.status,
          purpose: version!.purpose,
          dueAt: version!.dueAt,
          items: version!.requestedItems,
        })),
      evidence: evidence.map(({ version }, index) => ({
        id: version.id,
        filename: version.filename,
        mimeType: version.mimeType,
        sizeBytes: version.sizeBytes,
        sha256: version.sha256,
        sourceType: version.sourceType,
        scopeType: version.scopeType,
        scopeReference: version.scopeReference,
        reviewStatus: version.reviewStatus,
        storageKey: version.storageKey,
        body: evidenceBodies[index],
      })),
      openContradictionCount,
      purpose: trim(input.purpose),
      letter: trim(input.letter),
      confirmedBy: context.actorSubject,
      confirmedAt: generatedAt,
    };
  }

  private async persistPacketObjects(
    context: TenantContext,
    submissionVersionId: string,
    artifacts: PacketArtifact[],
  ) {
    const records = artifacts.map((artifact) => ({
      artifact,
      storageObjectId: randomUUID(),
      artifactId: randomUUID(),
      objectKey: `tenants/${context.organizationId}/generated/submissions/${submissionVersionId}/${artifact.filename}`,
    }));
    await Promise.all(
      records.map(({ artifact, objectKey }) =>
        this.storage.put({
          key: objectKey,
          body: artifact.body,
          mimeType: artifact.mimeType,
          sha256: artifact.sha256,
        }),
      ),
    );
    try {
      const metadata = await Promise.all(
        records.map(async ({ artifact, objectKey }) => {
          const [head, body] = await Promise.all([
            this.storage.head(objectKey),
            this.storage.read(objectKey),
          ]);
          if (
            !head ||
            head.sizeBytes !== artifact.body.byteLength ||
            head.sha256 !== artifact.sha256 ||
            sha256(body) !== artifact.sha256
          )
            throw new BrokerageCaseStateError(
              "Generated artifact exact-byte storage readback failed.",
            );
          return head;
        }),
      );
      return records.map((record, index) => ({ ...record, metadata: metadata[index] }));
    } catch (error) {
      await Promise.allSettled(
        records.map(({ objectKey }) => this.storage.delete(objectKey)),
      );
      throw error;
    }
  }

  async generatePacket(
    context: TenantContext,
    idempotencyKey: string,
    input: GenerateBrokeragePacketInput,
  ) {
    requireHumanMember(context, input.humanConfirmation);
    assertCaseAccess(context, input.caseId, [
      { resource: "submission", action: "create" },
      { resource: "submission_version", action: "create" },
      { resource: "submission_item", action: "create" },
      { resource: "submission_artifact", action: "create" },
      { resource: "storage_object", action: "create" },
    ]);
    const purpose = requiredText(input.purpose, "Packet purpose", 8);
    const letter = requiredText(input.letter, "Accompanying letter", 40);
    if (!idempotencyKey.trim()) throw new IdempotencyConflictError();
    const normalized = { caseId: input.caseId, purpose, letter };
    const requestHash = digest(normalized);
    const replay = await this.database
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(schema.idempotencyKeys.organizationId, context.organizationId),
          eq(schema.idempotencyKeys.scope, "brokerage_packet.generate"),
          eq(schema.idempotencyKeys.key, idempotencyKey),
        ),
      )
      .limit(1);
    if (replay[0]) {
      if (replay[0].requestHash !== requestHash)
        throw new IdempotencyConflictError();
      return replay[0].responseJson as {
        submissionId: string;
        submissionVersionId: string;
        manifestHash: string;
        artifacts: Array<{
          artifactType: string;
          filename: string;
          sizeBytes: number;
          sha256: string;
        }>;
        replayed: boolean;
      };
    }

    const row = await this.loadCase(context, input.caseId);
    const [locations, notice, requests, evidence, contradictions] =
      await Promise.all([
        this.loadLocations(context, row.property.id),
        this.loadNoticeBundle(context, input.caseId),
        this.loadEvidenceRequests(context, input.caseId),
        this.loadEvidence(context, row.property.id),
        this.database
          .select({ value: count() })
          .from(schema.contradictions)
          .where(
            and(
              eq(schema.contradictions.organizationId, context.organizationId),
              eq(schema.contradictions.caseId, input.caseId),
              eq(schema.contradictions.status, "open"),
            ),
          ),
      ]);
    const evidenceBodies = await Promise.all(
      evidence.map(async ({ version }) => {
        const body = await this.storage.read(version.storageKey);
        if (body.byteLength !== version.sizeBytes || sha256(body) !== version.sha256)
          throw new BrokerageCaseStateError(
            `Evidence ${version.id} failed exact-byte readback.`,
          );
        return body;
      }),
    );
    const generatedAt = iso(this.clock());
    const model = this.packetModel(
      context,
      row,
      { ...input, purpose, letter },
      generatedAt,
      notice,
      locations,
      requests,
      evidence,
      evidenceBodies,
      Number(contradictions[0]?.value ?? 0),
    );
    const artifacts = await buildBrokeragePacket(model);
    const submissionId = randomUUID();
    const submissionVersionId = randomUUID();
    const stored = await this.persistPacketObjects(
      context,
      submissionVersionId,
      artifacts,
    );
    const manifestHash = artifacts.find(
      (artifact) => artifact.artifactType === "manifest",
    )!.sha256;
    const response = {
      submissionId,
      submissionVersionId,
      manifestHash,
      artifacts: artifacts.map((artifact) => ({
        artifactType: artifact.artifactType,
        filename: artifact.filename,
        sizeBytes: artifact.body.byteLength,
        sha256: artifact.sha256,
      })),
      replayed: false,
    };
    try {
      await this.database.transaction(async (transaction) => {
        const raced = await transaction
          .select()
          .from(schema.idempotencyKeys)
          .where(
            and(
              eq(schema.idempotencyKeys.organizationId, context.organizationId),
              eq(schema.idempotencyKeys.scope, "brokerage_packet.generate"),
              eq(schema.idempotencyKeys.key, idempotencyKey),
            ),
          )
          .limit(1);
        if (raced[0]) {
          if (raced[0].requestHash !== requestHash)
            throw new IdempotencyConflictError();
          throw new BrokerageCaseStateError(
            "An identical packet request completed concurrently; reload the case workspace.",
          );
        }
        await transaction.insert(schema.submissions).values({
          id: submissionId,
          ...tenantRecord(context, generatedAt),
          caseId: input.caseId,
          marketId: row.policy.marketId,
          purpose,
          status: "confirmed",
          currentVersionId: submissionVersionId,
        });
        await transaction.insert(schema.submissionVersions).values({
          id: submissionVersionId,
          ...tenantRecord(context, generatedAt),
          submissionId,
          versionNumber: 1,
          status: "confirmed",
          message: letter,
          caveats: [
            "Evidence completeness does not establish safety, compliance, insurability, model acceptance, or market recognition.",
            "No insurance, pricing, funding, verification, or resilience outcome is guaranteed.",
          ],
          confirmedBy: context.actorSubject,
          confirmedAt: generatedAt,
          manifestHash,
        });
        if (evidence.length)
          await transaction.insert(schema.submissionItems).values(
            evidence.map(({ version }, index) => ({
              id: randomUUID(),
              ...tenantRecord(context, generatedAt),
              submissionVersionId,
              evidenceVersionId: version.id,
              exhibitLabel: `E${String(index + 1).padStart(2, "0")}`,
            })),
          );
        await transaction.insert(schema.storageObjects).values(
          stored.map(({ artifact, storageObjectId, objectKey, metadata }) => ({
            id: storageObjectId,
            ...tenantRecord(context, generatedAt),
            provider: this.storage.provider,
            bucket: this.storage.bucket,
            objectKey,
            originalFilename: artifact.filename,
            mimeType: artifact.mimeType,
            sizeBytes: artifact.body.byteLength,
            sha256: artifact.sha256,
            checksumAlgorithm: "sha256",
            encryptionMode: metadata.encryptionMode,
            state: "clean",
            scanStatus: "clean",
          })),
        );
        await transaction.insert(schema.malwareScanResults).values(
          stored.map(({ storageObjectId }) => ({
            id: randomUUID(),
            ...tenantRecord(context, generatedAt),
            storageObjectId,
            scanner: "fortify-internal-generator",
            engineVersion: BROKERAGE_PACKET_RECIPE_VERSION,
            status: "clean",
            findings: [],
            scannedAt: generatedAt,
          })),
        );
        await transaction.insert(schema.submissionArtifacts).values(
          stored.map(({ artifact, storageObjectId, artifactId }) => ({
            id: artifactId,
            ...tenantRecord(context, generatedAt),
            submissionVersionId,
            storageObjectId,
            artifactType: artifact.artifactType,
            filename: artifact.filename,
            mimeType: artifact.mimeType,
            sizeBytes: artifact.body.byteLength,
            sha256: artifact.sha256,
            generationRecipeVersion: BROKERAGE_PACKET_RECIPE_VERSION,
            generatedAt,
          })),
        );
        await appendAudit(transaction as unknown as ProductionDatabaseLike, context, {
          action: "brokerage_packet.generated_and_confirmed",
          resourceType: "submission_version",
          resourceId: submissionVersionId,
          detail: {
            caseId: input.caseId,
            submissionId,
            artifactCount: artifacts.length,
            manifestHash,
            recipeVersion: BROKERAGE_PACKET_RECIPE_VERSION,
            exactByteReadback: true,
          },
          occurredAt: generatedAt,
        });
        await transaction.insert(schema.idempotencyKeys).values({
          id: randomUUID(),
          ...tenantRecord(context, generatedAt),
          scope: "brokerage_packet.generate",
          key: idempotencyKey,
          requestHash,
          responseJson: response,
        });
      });
    } catch (error) {
      await Promise.allSettled(
        stored.map(({ objectKey }) => this.storage.delete(objectKey)),
      );
      throw error;
    }
    return response;
  }
}

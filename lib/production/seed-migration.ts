import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import * as schema from "@/db/production/schema";
import type { DemoState } from "@/lib/domain";
import {
  TenantRepository,
  appendAudit,
  digest,
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "./repository";

export const SANDBOX_ORGANIZATION_ID = "org-fortify-sandbox";
export const SANDBOX_ACTOR = "fortify:sandbox-seed";

export interface SandboxSeedReceipt {
  organizationId: string;
  seedVersion: string;
  replayed: boolean;
  counts: {
    communities: number;
    properties: number;
    buildings: number;
    policies: number;
    renewalCases: number;
    requirements: number;
    evidenceVersions: number;
    submissions: number;
  };
}

const atDate = (value: string) =>
  value.includes("T") ? value : `${value}T12:00:00.000Z`;

function sourceSetId(source: string, version: string) {
  return `reqset-${createHash("sha256")
    .update(`${source}|${version}`)
    .digest("hex")
    .slice(0, 16)}`;
}

export async function migrateDemoSeedToProduction(
  database: ProductionDatabaseLike,
  state: DemoState,
): Promise<SandboxSeedReceipt> {
  const repository = new TenantRepository(database);
  await repository.bootstrapOrganization({
    id: SANDBOX_ORGANIZATION_ID,
    slug: "fortify-sandbox",
    name: "Fortify Fictional Sandbox",
    kind: "brokerage",
    environment: "sandbox",
    synthetic: true,
    actorSubject: SANDBOX_ACTOR,
  });
  const context: TenantContext = {
    organizationId: SANDBOX_ORGANIZATION_ID,
    actorSubject: SANDBOX_ACTOR,
  };
  const requestHash = digest(state);

  return database.transaction(async (transaction) => {
    const prior = await transaction
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(
            schema.idempotencyKeys.organizationId,
            SANDBOX_ORGANIZATION_ID,
          ),
          eq(schema.idempotencyKeys.scope, "sandbox.seed"),
          eq(schema.idempotencyKeys.key, state.seedVersion),
        ),
      )
      .limit(1);
    if (prior[0]) {
      if (prior[0].requestHash !== requestHash)
        throw new Error(
          "The sandbox seed version is already registered with different content.",
        );
      return {
        ...(prior[0].responseJson as unknown as SandboxSeedReceipt),
        replayed: true,
      };
    }

    const createdAt = atDate(state.demoDate);
    const owned = tenantRecord(context, createdAt);
    await transaction.insert(schema.books).values({
      id: "book-sandbox",
      ...owned,
      name: "Fictional Colorado community association book",
      externalSystem: "fortify-sandbox",
      externalId: state.seedVersion,
    });
    await transaction.insert(schema.clients).values({
      id: "client-sandbox",
      ...owned,
      bookId: "book-sandbox",
      name: "Fictional community association clients",
      externalSystem: "fortify-sandbox",
      externalId: "fictional-client-universe",
    });

    const marketById = new Map<string, string>();
    for (const community of state.communities) {
      if (marketById.has(community.carrierId)) continue;
      const marketId = `market-${community.carrierId}`;
      marketById.set(community.carrierId, marketId);
      await transaction.insert(schema.markets).values({
        id: marketId,
        ...owned,
        name: community.carrier,
        marketType: "carrier",
        synthetic: true,
      });
      await transaction.insert(schema.programs).values({
        id: `program-${community.carrierId}`,
        ...owned,
        marketId,
        name: "Fictional Colorado community master policy",
        peril: "wildfire",
        jurisdiction: "US-CO",
        propertyClass: community.type,
      });
    }

    for (const community of state.communities) {
      const propertyId = `property-${community.id}`;
      const policyId = `policy-${community.id}`;
      await transaction.insert(schema.communities).values({
        id: community.id,
        ...owned,
        clientId: "client-sandbox",
        name: community.name,
        propertyClass: community.type,
        summary: community.summary,
        externalSystem: "fortify-sandbox",
        externalId: community.id,
      });
      await transaction.insert(schema.properties).values({
        id: propertyId,
        ...owned,
        communityId: community.id,
        name: community.name,
        propertyClass: community.type,
        unitCount: community.units,
        buildingCount: community.buildings,
      });
      await transaction.insert(schema.propertyIdentifiers).values({
        id: `property-identifier-${community.id}`,
        ...owned,
        propertyId,
        source: "fortify-sandbox",
        identifierType: "sandbox-community-id",
        value: community.id,
        reviewStatus: "confirmed",
      });
      await transaction.insert(schema.locations).values({
        id: `location-${community.id}`,
        ...owned,
        propertyId,
        addressLine1: community.address,
        region: "CO",
        county: community.county,
        countryCode: "US",
        latitude: String(community.coordinates[1]),
        longitude: String(community.coordinates[0]),
        normalizationStatus: "fixture-confirmed",
      });
      for (let index = 1; index <= community.buildings; index += 1) {
        await transaction.insert(schema.buildings).values({
          id: `building-${community.id}-${index}`,
          ...owned,
          propertyId,
          label: `Building ${index}`,
        });
      }
      await transaction.insert(schema.policies).values({
        id: policyId,
        ...owned,
        propertyId,
        marketId: marketById.get(community.carrierId),
        programId: `program-${community.carrierId}`,
        policyNumber: community.policyNumber,
        expirationDate: community.renewalDate,
        currency: "USD",
        premiumMinor: community.premium,
        sourceAuthority: "fictional-sandbox",
      });
      await transaction.insert(schema.renewalCases).values({
        id: community.caseId,
        ...owned,
        policyId,
        title: community.caseTitle,
        status: community.caseStatus,
        caseType: "renewal",
        peril: "wildfire",
        jurisdiction: "US-CO",
        propertyClass: community.type,
        renewalDate: community.renewalDate,
        appealDeadline: community.appealDeadline,
        ownerSubject: "sandbox:maya-chen",
      });
    }

    for (const notice of state.notices) {
      const sourceHash = createHash("sha256")
        .update(notice.rawText)
        .digest("hex");
      await transaction.insert(schema.sourceDocuments).values({
        id: notice.id,
        ...owned,
        caseId: notice.caseId,
        documentType: "carrier_notice",
        filename: notice.filename,
        mimeType:
          notice.format === "plain text" ? "text/plain" : "application/pdf",
        storageKey: `sandbox/notices/${notice.filename}`,
        sha256: sourceHash,
        sourceSystem: "fictional-sandbox",
        receivedAt: atDate(notice.receivedDate),
        processingStatus: notice.confirmed ? "confirmed" : "review_required",
        synthetic: true,
      });
      for (const [index, field] of notice.fields.entries()) {
        await transaction.insert(schema.sourcePassages).values({
          id: `${notice.id}:field:${field.key}`,
          ...owned,
          sourceDocumentId: notice.id,
          segment: `field-${index + 1}:${field.key}`,
          textContent: field.confirmedByHuman
            ? field.confirmed
            : field.extracted,
          extractorVersion: notice.extractor,
          confidence: String(field.confidence),
          confirmationStatus: field.confirmedByHuman
            ? "human_confirmed"
            : "unreviewed",
          confirmedBy: field.confirmedByHuman
            ? "sandbox:human-reviewer"
            : undefined,
          confirmedAt: field.confirmedByHuman ? createdAt : undefined,
        });
      }
    }

    const requirementSets = new Map<string, string>();
    for (const requirement of state.requirements) {
      const setId = sourceSetId(requirement.source, requirement.version);
      if (!requirementSets.has(setId)) {
        requirementSets.set(setId, setId);
        await transaction.insert(schema.requirementSets).values({
          id: setId,
          ...owned,
          name: requirement.source,
          peril: "wildfire",
          jurisdiction: "US-CO",
          propertyClass: "community-association",
          sourceName: requirement.source,
          sourceUrl: requirement.sourceUrl,
          verifyCurrent: requirement.verifyCurrent,
        });
      }
      await transaction.insert(schema.requirements).values({
        id: requirement.id,
        ...owned,
        requirementSetId: setId,
        code: requirement.code,
        title: requirement.title,
        scopeType: requirement.scope,
        importance: "required",
        blocking: requirement.status === "missing",
      });
      await transaction.insert(schema.requirementVersions).values({
        id: `${requirement.id}:v1`,
        ...owned,
        requirementId: requirement.id,
        version: requirement.version,
        effectiveFrom: state.demoDate,
        summary: requirement.title,
        sourceUrl: requirement.sourceUrl,
        contentHash: digest({
          code: requirement.code,
          title: requirement.title,
          scope: requirement.scope,
          version: requirement.version,
        }),
      });
    }

    for (const item of state.evidence) {
      const propertyId = `property-${item.communityId}`;
      const versionId = `${item.id}:v1`;
      await transaction.insert(schema.evidenceItems).values({
        id: item.id,
        ...owned,
        propertyId,
        evidenceType: item.kind,
        currentVersionId: versionId,
      });
      await transaction.insert(schema.evidenceVersions).values({
        id: versionId,
        ...owned,
        evidenceItemId: item.id,
        versionNumber: 1,
        filename: item.filename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        sha256: item.sha256,
        storageKey: `sandbox/evidence/${item.filename}`,
        sourceType: item.kind,
        sourceOrganization: item.sourceOrganization,
        captureDate: item.captureDate,
        receivedAt: atDate(item.uploadDate),
        expiresAt: item.expiryDate ? atDate(item.expiryDate) : undefined,
        scopeType: item.scope,
        scopeReference: item.scopeLabel,
        confidence: String(item.confidence),
        reviewStatus: item.humanReviewed ? "human_confirmed" : "unreviewed",
        reviewedBy: item.humanReviewed ? item.verifiedBy : undefined,
        reviewedAt: item.humanReviewed ? atDate(item.uploadDate) : undefined,
        supersedesId: item.supersedesId
          ? `${item.supersedesId}:v1`
          : undefined,
      });
      const community = state.communities.find(
        (candidate) => candidate.id === item.communityId,
      );
      for (const requirementId of item.requirementIds) {
        const requirement = state.requirements.find(
          (candidate) => candidate.id === requirementId,
        );
        if (!community || !requirement) continue;
        await transaction.insert(schema.evidenceRequirementLinks).values({
          id: `link-${item.id}-${requirementId}`,
          ...owned,
          caseId: community.caseId,
          evidenceVersionId: versionId,
          requirementVersionId: `${requirementId}:v1`,
          scopeStatus:
            item.scope === requirement.scope ? "matched" : "review_required",
          freshnessStatus:
            item.expiryDate && item.expiryDate < state.demoDate
              ? "expired"
              : "current",
          reviewStatus: item.humanReviewed ? "confirmed" : "unreviewed",
          disposition: item.carrierStatus,
        });
      }
    }

    const contradictionPairs = new Set<string>();
    for (const item of state.evidence) {
      if (!item.conflictWith) continue;
      const pair = [item.id, item.conflictWith].sort();
      const key = pair.join(":");
      if (contradictionPairs.has(key)) continue;
      contradictionPairs.add(key);
      const community = state.communities.find(
        (candidate) => candidate.id === item.communityId,
      );
      if (!community) continue;
      await transaction.insert(schema.contradictions).values({
        id: `contradiction-${key}`,
        ...owned,
        caseId: community.caseId,
        leftEvidenceVersionId: `${pair[0]}:v1`,
        rightEvidenceVersionId: `${pair[1]}:v1`,
        status: "open",
      });
    }

    for (const task of state.tasks) {
      await transaction.insert(schema.tasks).values({
        id: task.id,
        ...owned,
        caseId: task.caseId,
        requirementId: task.requirementId,
        title: task.title,
        ownerSubject: task.owner,
        dueAt: `${task.dueDate}T23:59:59.000Z`,
        status: task.status,
      });
    }

    for (const submission of state.submissions) {
      const community = state.communities.find(
        (candidate) => candidate.caseId === submission.caseId,
      );
      if (!community) continue;
      const versionId = `${submission.id}:v${submission.version}`;
      await transaction.insert(schema.submissions).values({
        id: submission.id,
        ...owned,
        caseId: submission.caseId,
        marketId: marketById.get(community.carrierId),
        purpose: submission.purpose,
        status: submission.status,
        currentVersionId: versionId,
      });
      await transaction.insert(schema.submissionVersions).values({
        id: versionId,
        ...owned,
        submissionId: submission.id,
        versionNumber: submission.version,
        status: submission.status,
        message: submission.letter,
        caveats: [
          "Fictional sandbox output; carrier outcomes are not predicted or guaranteed.",
        ],
        confirmedBy: submission.confirmedBy,
        confirmedAt: submission.confirmedAt,
      });
      const communityEvidence = state.evidence.filter(
        (item) => item.communityId === community.id,
      );
      for (const [index, item] of communityEvidence.entries()) {
        await transaction.insert(schema.submissionItems).values({
          id: `${versionId}:item:${item.id}`,
          ...owned,
          submissionVersionId: versionId,
          evidenceVersionId: `${item.id}:v1`,
          exhibitLabel: `Exhibit ${index + 1}`,
        });
      }
      if (submission.clarification) {
        await transaction.insert(schema.marketResponses).values({
          id: `${submission.id}:clarification`,
          ...owned,
          submissionVersionId: versionId,
          responseType: "clarification_requested",
          originalLanguage: submission.clarification,
          receivedAt: submission.responseReadyAt ?? submission.createdAt,
        });
      }
    }

    for (const community of state.communities) {
      if (!community.outcome) continue;
      await transaction.insert(schema.renewalOutcomes).values({
        id: `outcome-${community.caseId}`,
        ...owned,
        caseId: community.caseId,
        status: community.outcome.renewalStatus ?? community.outcome.disposition,
        originalLanguage: community.outcome.detail,
        recordedAt: community.outcome.at,
        synthetic: true,
      });
    }

    for (const event of state.maintenance) {
      await transaction.insert(schema.maintenanceEvents).values({
        id: event.id,
        ...owned,
        propertyId: `property-${event.communityId}`,
        title: event.title,
        dueAt: `${event.dueDate}T12:00:00.000Z`,
        recurrenceRule: event.recurrence,
        status: event.status,
      });
    }

    for (const event of state.audit) {
      await transaction.insert(schema.auditEvents).values({
        id: event.id,
        organizationId: SANDBOX_ORGANIZATION_ID,
        actorSubject: event.actor,
        action: event.action,
        resourceType: "renewal_case",
        resourceId: event.caseId ?? "sandbox",
        detail: { message: event.detail, importedFrom: state.seedVersion },
        previousHash: event.previousHash,
        eventHash: event.hash,
        occurredAt: event.at,
      });
    }

    const receipt: SandboxSeedReceipt = {
      organizationId: SANDBOX_ORGANIZATION_ID,
      seedVersion: state.seedVersion,
      replayed: false,
      counts: {
        communities: state.communities.length,
        properties: state.communities.length,
        buildings: state.communities.reduce(
          (sum, community) => sum + community.buildings,
          0,
        ),
        policies: state.communities.length,
        renewalCases: state.communities.length,
        requirements: state.requirements.length,
        evidenceVersions: state.evidence.length,
        submissions: state.submissions.length,
      },
    };

    await appendAudit(transaction, context, {
      action: "sandbox.seed_migrated",
      resourceType: "organization",
      resourceId: SANDBOX_ORGANIZATION_ID,
      detail: receipt as unknown as Record<string, unknown>,
      occurredAt: createdAt,
    });
    await transaction.insert(schema.idempotencyKeys).values({
      id: randomUUID(),
      ...owned,
      scope: "sandbox.seed",
      key: state.seedVersion,
      requestHash,
      responseJson: receipt as unknown as Record<string, unknown>,
    });
    return receipt;
  });
}

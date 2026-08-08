import { and, count, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/production/schema";
import { assertAuthorized } from "@/lib/production/authorization";
import {
  type QueryOperation,
  defineQuery,
} from "@/lib/production/kernel/operations";
import {
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

export type BrokerageWorkspaceQuery = QueryOperation<
  "case_workflow.workspace",
  TenantContext
>;

export function brokerageWorkspaceQuery(
  context: TenantContext,
): BrokerageWorkspaceQuery {
  return defineQuery({
    boundedContext: "case_workflow",
    name: "case_workflow.workspace",
    context,
    input: undefined,
  });
}

export interface BrokerageWorkspaceQueryPort {
  execute(query: BrokerageWorkspaceQuery): Promise<BrokerageWorkspace>;
}

function assertCaseAccess(
  context: TenantContext,
  caseId: string,
  resources: Array<Parameters<typeof assertAuthorized>[1]["resource"]>,
) {
  for (const resource of resources)
    assertAuthorized(context, {
      resource,
      action: "read",
      resourceOrganizationId: context.organizationId,
      caseId,
    });
}

async function loadCase(
  database: ProductionDatabaseLike,
  context: TenantContext,
  caseId: string,
) {
  const rows = await database
    .select({
      brokerageCase: schema.renewalCases,
      policy: schema.policies,
      property: schema.properties,
      community: schema.communities,
      client: schema.clients,
      market: schema.markets,
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
    .innerJoin(
      schema.clients,
      eq(schema.communities.clientId, schema.clients.id),
    )
    .leftJoin(
      schema.markets,
      and(
        eq(schema.policies.marketId, schema.markets.id),
        eq(schema.markets.organizationId, context.organizationId),
      ),
    )
    .where(
      and(
        eq(schema.renewalCases.id, caseId),
        eq(schema.renewalCases.organizationId, context.organizationId),
        eq(schema.policies.organizationId, context.organizationId),
        eq(schema.properties.organizationId, context.organizationId),
        eq(schema.communities.organizationId, context.organizationId),
        eq(schema.clients.organizationId, context.organizationId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new TenantResourceNotFoundError("Brokerage case");
  return rows[0];
}

async function loadLocations(
  database: ProductionDatabaseLike,
  context: TenantContext,
  propertyId: string,
) {
  return database
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

async function loadNoticeBundle(
  database: ProductionDatabaseLike,
  context: TenantContext,
  caseId: string,
) {
  const documents = await database
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
    return {
      document: null,
      facts: [] as Array<typeof schema.documentFacts.$inferSelect>,
    };

  const facts = await database
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
    for (const fact of facts)
      if (fact.sourceDocumentId === document.id && !latest.has(fact.factKey))
        latest.set(fact.factKey, fact);
    if (requiredNoticeFacts.every((key) => latest.has(key)))
      return { document, facts: [...latest.values()] };
  }

  const document = documents[0];
  const latest = new Map<string, (typeof facts)[number]>();
  for (const fact of facts)
    if (fact.sourceDocumentId === document.id && !latest.has(fact.factKey))
      latest.set(fact.factKey, fact);
  return { document, facts: [...latest.values()] };
}

async function loadEvidenceRequests(
  database: ProductionDatabaseLike,
  context: TenantContext,
  caseId: string,
) {
  return database
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
}

async function loadEvidence(
  database: ProductionDatabaseLike,
  context: TenantContext,
  propertyId: string,
) {
  return database
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

async function loadSubmissions(
  database: ProductionDatabaseLike,
  context: TenantContext,
  caseId: string,
) {
  const rows = await database
    .select({
      submission: schema.submissions,
      version: schema.submissionVersions,
      artifact: schema.submissionArtifacts,
    })
    .from(schema.submissions)
    .leftJoin(
      schema.submissionVersions,
      and(
        eq(schema.submissions.currentVersionId, schema.submissionVersions.id),
        eq(schema.submissionVersions.organizationId, context.organizationId),
      ),
    )
    .leftJoin(
      schema.submissionArtifacts,
      and(
        eq(
          schema.submissionArtifacts.submissionVersionId,
          schema.submissionVersions.id,
        ),
        eq(schema.submissionArtifacts.organizationId, context.organizationId),
      ),
    )
    .where(
      and(
        eq(schema.submissions.organizationId, context.organizationId),
        eq(schema.submissions.caseId, caseId),
        eq(schema.submissions.lifecycleStatus, "active"),
      ),
    )
    .orderBy(desc(schema.submissions.createdAt));
  const grouped = new Map<
    string,
    {
      submission: (typeof rows)[number]["submission"];
      version: (typeof rows)[number]["version"];
      artifacts: Array<NonNullable<(typeof rows)[number]["artifact"]>>;
    }
  >();
  for (const row of rows) {
    const existing = grouped.get(row.submission.id) ?? {
      submission: row.submission,
      version: row.version,
      artifacts: [],
    };
    if (row.artifact) existing.artifacts.push(row.artifact);
    grouped.set(row.submission.id, existing);
  }
  return [...grouped.values()];
}

async function projectCase(
  database: ProductionDatabaseLike,
  context: TenantContext,
  row: Awaited<ReturnType<typeof loadCase>>,
) {
  const caseId = row.brokerageCase.id;
  assertCaseAccess(context, caseId, [
    "client",
    "community",
    "property",
    "location",
    "market",
    "renewal_case",
    "policy",
    "source_document",
    "document_fact",
    "evidence_item",
    "evidence_version",
    "contradiction",
    "evidence_request",
    "evidence_request_version",
    "submission",
    "submission_version",
    "submission_artifact",
  ]);
  const [locations, notice, requests, evidence, submissions, contradictions] =
    await Promise.all([
      loadLocations(database, context, row.property.id),
      loadNoticeBundle(database, context, caseId),
      loadEvidenceRequests(database, context, caseId),
      loadEvidence(database, context, row.property.id),
      loadSubmissions(database, context, caseId),
      database
        .select({ value: count() })
        .from(schema.contradictions)
        .where(
          and(
            eq(schema.contradictions.organizationId, context.organizationId),
            eq(schema.contradictions.caseId, caseId),
            eq(schema.contradictions.status, "open"),
          ),
        ),
    ]);
  const factKeys = new Set(notice.facts.map((fact) => fact.factKey));
  const missingNoticeFacts = requiredNoticeFacts.filter(
    (key) => !factKeys.has(key),
  );
  return {
    id: caseId,
    title: row.brokerageCase.title,
    status: row.brokerageCase.status,
    caseType: row.brokerageCase.caseType,
    peril: row.brokerageCase.peril,
    jurisdiction: row.brokerageCase.jurisdiction,
    propertyClass: row.brokerageCase.propertyClass,
    renewalDate: row.brokerageCase.renewalDate,
    appealDeadline: row.brokerageCase.appealDeadline,
    client: { id: row.client.id, name: row.client.name },
    community: { id: row.community.id, name: row.community.name },
    property: {
      id: row.property.id,
      name: row.property.name,
      unitCount: row.property.unitCount,
      buildingCount: row.property.buildingCount,
      address: locations[0]
        ? [
            locations[0].addressLine1,
            locations[0].city,
            locations[0].region,
            locations[0].postalCode,
          ]
            .filter(Boolean)
            .join(", ")
        : "Address not recorded",
    },
    policy: {
      id: row.policy.id,
      policyNumber: row.policy.policyNumber,
      effectiveDate: row.policy.effectiveDate,
      expirationDate: row.policy.expirationDate,
      marketName: row.market?.name ?? null,
      sourceAuthority: row.policy.sourceAuthority,
    },
    notice: notice.document
      ? {
          id: notice.document.id,
          filename: notice.document.filename,
          sha256: notice.document.sha256,
          receivedAt: notice.document.receivedAt,
          facts: notice.facts.map((fact) => ({
            id: fact.id,
            key: fact.factKey,
            value: fact.value,
            versionNumber: fact.versionNumber,
            confirmedBy: fact.confirmedBy,
            confirmedAt: fact.confirmedAt,
            sourcePassageId: fact.sourcePassageId,
          })),
          missingRequiredFacts: missingNoticeFacts,
        }
      : null,
    evidenceRequests: requests.map(({ request, version }) => ({
      id: request.id,
      recipientType: request.recipientType,
      recipientLabel: request.recipientLabel,
      status: request.status,
      issuedAt: request.issuedAt,
      expiresAt: request.expiresAt,
      externalAccessState: request.externalPrincipalId
        ? "scoped_principal_recorded"
        : "off_platform_delivery_not_verified",
      version: version
        ? {
            id: version.id,
            versionNumber: version.versionNumber,
            purpose: version.purpose,
            instructions: version.instructions,
            dueAt: version.dueAt,
            requestedItems: version.requestedItems,
            confirmedBy: version.confirmedBy,
            confirmedAt: version.confirmedAt,
          }
        : null,
    })),
    evidence: evidence.map(({ item, version }) => ({
      itemId: item.id,
      versionId: version.id,
      evidenceType: item.evidenceType,
      filename: version.filename,
      sha256: version.sha256,
      sourceType: version.sourceType,
      scopeType: version.scopeType,
      scopeReference: version.scopeReference,
      reviewStatus: version.reviewStatus,
    })),
    submissions: submissions.map(({ submission, version, artifacts }) => ({
      id: submission.id,
      purpose: submission.purpose,
      status: submission.status,
      version: version
        ? {
            id: version.id,
            versionNumber: version.versionNumber,
            confirmedBy: version.confirmedBy,
            confirmedAt: version.confirmedAt,
            manifestHash: version.manifestHash,
          }
        : null,
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        artifactType: artifact.artifactType,
        filename: artifact.filename,
        mimeType: artifact.mimeType,
        sizeBytes: artifact.sizeBytes,
        sha256: artifact.sha256,
        generatedAt: artifact.generatedAt,
      })),
    })),
    gates: {
      noticeFactsConfirmed:
        Boolean(notice.document) && !missingNoticeFacts.length,
      evidenceRequestRecorded: requests.length > 0,
      openContradictionCount: Number(contradictions[0]?.value ?? 0),
      packetGenerated: submissions.some((submission) =>
        submission.artifacts.some(
          (artifact) => artifact.artifactType === "zip",
        ),
      ),
    },
  };
}

export class BrokerageWorkspaceQueryService
  implements BrokerageWorkspaceQueryPort
{
  constructor(private readonly database: ProductionDatabaseLike) {}

  async execute(query: BrokerageWorkspaceQuery) {
    const { context } = query;
    for (const resource of ["organization", "renewal_case"] as const)
      assertAuthorized(context, {
        resource,
        action: "read",
        resourceOrganizationId: context.organizationId,
      });
    const organization = await this.database
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        environment: schema.organizations.environment,
        synthetic: schema.organizations.synthetic,
      })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, context.organizationId))
      .limit(1);
    if (!organization[0]) throw new TenantResourceNotFoundError("Organization");
    if (context.assignedCaseIds?.length === 0)
      return { organization: organization[0], cases: [] };

    const caseRows = await this.database
      .select({ id: schema.renewalCases.id })
      .from(schema.renewalCases)
      .where(
        and(
          eq(schema.renewalCases.organizationId, context.organizationId),
          eq(schema.renewalCases.lifecycleStatus, "active"),
          context.assignedCaseIds
            ? inArray(schema.renewalCases.id, context.assignedCaseIds)
            : undefined,
        ),
      )
      .orderBy(schema.renewalCases.renewalDate);
    const cases = await Promise.all(
      caseRows.map(async ({ id }) =>
        projectCase(
          this.database,
          context,
          await loadCase(this.database, context, id),
        ),
      ),
    );
    return { organization: organization[0], cases };
  }
}

export type BrokerageWorkspace = Awaited<
  ReturnType<BrokerageWorkspaceQueryService["execute"]>
>;

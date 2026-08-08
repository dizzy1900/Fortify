import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  MarketPlaybookService,
  PlaybookApplicabilityError,
  PlaybookStateError,
} from "@/lib/production/market-playbook-service";
import { GovernedSourceService } from "@/lib/production/governed-source-service";
import { presentMarketPlaybookWorkspace } from "@/lib/production/market-playbook-http";
import {
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
const productionDatabase = () => database as unknown as ProductionDatabaseLike;
const at = "2026-08-01T12:00:00.000Z";

async function createCase(key: string) {
  const fixture = await createTenantFixture(productionDatabase(), key);
  const caseId = `case-${key}`;
  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-request-${key}`,
    {
      id: caseId,
      policyId: fixture.policyId,
      title: `Renewal ${key}`,
      status: "open",
      caseType: "renewal",
      peril: "wildfire",
      jurisdiction: "Colorado",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
    },
  );
  const sourceService = new GovernedSourceService(
    productionDatabase(),
    () => new Date(at),
  );
  const source = await sourceService.createSource(fixture.context, {
    canonicalKey: `fictional-destination-${key}`,
    sourceClass: "insurer_mga_material",
    issuingAuthority: "Fictional destination authority",
    title: `Fictional destination guide ${key}`,
    jurisdiction: "Colorado",
    officialUrl: "https://example.test/fictional-playbook",
    authorityTier: "customer_supplied",
    reviewOwnerSubject: `source-owner-${key}`,
  });
  const sourceVersion = await sourceService.createVersion(fixture.context, {
    sourceId: source.sourceId,
    versionLabel: "2026.1",
    retrievalDate: "2026-08-01",
    sourceHash: "a".repeat(64),
    snapshotState: "metadata_only_restricted",
    rightsStatus: "restricted",
    redistributionAllowed: false,
    useRestrictions: "Fictional metadata fixture; no redistribution.",
    structuredSummary: {
      scope: "Deterministic test destination guidance",
    },
    verifyCurrentStatus: "verified_current",
    nextReviewDate: "2026-09-01",
    extractionMethod: "human_authored",
    humanConfirmed: true,
    changeSummary: "Initial test fixture.",
  });
  await sourceService.reviewVersion(reviewerContext(fixture), {
    sourceVersionId: sourceVersion.sourceVersionId,
    decision: "approved",
    note: "Exact fixture boundary and rights reviewed.",
    sourceCompared: true,
    rightsConfirmed: true,
  });
  await sourceService.publishVersion(
    {
      ...fixture.context,
      actorSubject: `publisher-${fixture.organizationId}`,
      role: "practice_leader",
    },
    {
      sourceVersionId: sourceVersion.sourceVersionId,
      decision: "published",
      note: "Published for deterministic test use.",
    },
  );
  return {
    ...fixture,
    caseId,
    governedSourceVersionId: sourceVersion.sourceVersionId,
  };
}

async function seedRequirements(
  fixture: Awaited<ReturnType<typeof createCase>>,
  codes: string[],
) {
  const owned = tenantRecord(fixture.context, at);
  const setId = `requirement-set-${fixture.organizationId}`;
  await database.insert(schema.requirementSets).values({
    id: setId,
    ...owned,
    marketId: fixture.marketId,
    name: "Fictional destination requirements",
    peril: "wildfire",
    jurisdiction: "Colorado",
    propertyClass: "condominium",
    sourceName: "Fictional broker configuration",
    sourceUrl: "https://example.test/fictional-requirements",
    verifyCurrent: true,
  });
  const versions: Record<string, string> = {};
  for (const code of codes) {
    const requirementId = `requirement-${fixture.organizationId}-${code}`;
    const versionId = `requirement-version-${fixture.organizationId}-${code}`;
    await database.insert(schema.requirements).values({
      id: requirementId,
      ...owned,
      requirementSetId: setId,
      code,
      title: code.replaceAll("_", " "),
      scopeType: "property",
      importance: "required",
      blocking: false,
    });
    await database.insert(schema.requirementVersions).values({
      id: versionId,
      ...owned,
      requirementId,
      version: "2026.1",
      effectiveFrom: "2026-01-01",
      summary: `${code} fixture`,
      sourceUrl: "https://example.test/fictional-requirements",
      contentHash: code.padEnd(64, "0").slice(0, 64),
    });
    versions[code] = versionId;
  }
  return versions;
}

function reviewerContext(fixture: {
  context: TenantContext;
  organizationId: string;
}): TenantContext {
  return {
    ...fixture.context,
    actorSubject: `reviewer-${fixture.organizationId}`,
    role: "practice_leader",
  };
}

async function addEvidence(
  fixture: Awaited<ReturnType<typeof createCase>>,
  input: {
    key: string;
    requirementVersionId: string;
    evidenceType?: string;
    sourceType?: string;
    scopeType?: string;
    scopeStatus?: string;
    freshnessStatus?: string;
    reviewStatus?: string;
    disposition?: string;
    captureDate?: string;
  },
) {
  const owned = tenantRecord(fixture.context, at);
  const itemId = `evidence-item-${fixture.organizationId}-${input.key}`;
  const versionId = `evidence-version-${fixture.organizationId}-${input.key}`;
  await database.insert(schema.evidenceItems).values({
    id: itemId,
    ...owned,
    propertyId: fixture.propertyId,
    evidenceType: input.evidenceType ?? "inspection_report",
    currentVersionId: versionId,
  });
  await database.insert(schema.evidenceVersions).values({
    id: versionId,
    ...owned,
    evidenceItemId: itemId,
    versionNumber: 1,
    filename: `${input.key}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 100,
    sha256: input.key.padEnd(64, "a").slice(0, 64),
    storageKey: `${fixture.organizationId}/${input.key}.pdf`,
    sourceType: input.sourceType ?? "inspector",
    captureDate: input.captureDate ?? "2026-12-15",
    receivedAt: "2026-12-16T12:00:00.000Z",
    scopeType: input.scopeType ?? "property",
    reviewStatus: input.reviewStatus ?? "human_confirmed",
    reviewedBy: fixture.context.actorSubject,
    reviewedAt: at,
  });
  await database.insert(schema.evidenceRequirementLinks).values({
    id: `evidence-link-${fixture.organizationId}-${input.key}`,
    ...owned,
    caseId: fixture.caseId,
    evidenceVersionId: versionId,
    requirementVersionId: input.requirementVersionId,
    scopeStatus: input.scopeStatus ?? "matched",
    freshnessStatus: input.freshnessStatus ?? "current",
    reviewStatus: input.reviewStatus ?? "human_confirmed",
    disposition: input.disposition ?? "accepted",
  });
  return versionId;
}

function versionInput(
  fixture: Awaited<ReturnType<typeof createCase>>,
  requirements: Array<{
    requirementVersionId: string;
    importance?: "required" | "recommended";
    blocking?: boolean;
    freshnessDays?: number;
    acceptedEvidenceTypes?: string[];
    conditions?: Array<{
      field: "program_id";
      operator: "equals";
      expectedValues: string[];
    }>;
  }>,
) {
  return {
    name: `Colorado fictional destination ${fixture.organizationId}`,
    description: "Deterministic fixture playbook; not carrier guidance.",
    marketId: fixture.marketId,
    jurisdiction: "Colorado",
    peril: "wildfire",
    propertyClass: "condominium",
    effectiveFrom: "2026-01-01",
    effectiveTo: "2027-12-31",
    governedSourceVersionId: fixture.governedSourceVersionId,
    sourceName: "Fictional broker-authored destination guidance",
    sourceUrl: "https://example.test/fictional-playbook",
    sourceVersion: "2026.1",
    sourceCitation: "Fixture section 4, reviewed for deterministic tests only.",
    verifyCurrent: true,
    changeSummary: "Initial fixture version.",
    requirements: requirements.map((item) => ({
      requirementVersionId: item.requirementVersionId,
      importance: item.importance ?? "required",
      blocking: item.blocking ?? false,
      acceptedEvidenceTypes: item.acceptedEvidenceTypes ?? ["inspection_report"],
      freshnessDays: item.freshnessDays ?? 90,
      requiredScopeType: "property",
      acceptedSourceTypes: ["inspector"],
      requiredReviewStatus: "human_confirmed",
      conditions: item.conditions ?? [],
    })),
  };
}

beforeAll(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
});

afterAll(async () => {
  await client.close();
});

describe("versioned market playbooks and destination readiness", () => {
  test("keeps a missing blocker visible even when every other item is ready", async () => {
    const fixture = await createCase("blocker-proof");
    const requirementIds = await seedRequirements(fixture, [
      "blocking_roof_record",
      "recommended_context",
    ]);
    const service = new MarketPlaybookService(productionDatabase(), () => new Date(at));
    const created = await service.createVersion(
      fixture.context,
      versionInput(fixture, [
        {
          requirementVersionId: requirementIds.blocking_roof_record,
          blocking: true,
        },
        {
          requirementVersionId: requirementIds.recommended_context,
          importance: "recommended",
        },
      ]),
    );
    await service.reviewVersion(reviewerContext(fixture), {
      versionId: created.versionId,
      decision: "approved",
      note: "Scope and source citation reviewed for the fictional fixture.",
    });
    await addEvidence(fixture, {
      key: "ready-recommended",
      requirementVersionId: requirementIds.recommended_context,
    });
    await service.linkCase(fixture.context, {
      caseId: fixture.caseId,
      marketId: fixture.marketId,
    });
    const readiness = await service.evaluateCase(fixture.context, {
      caseId: fixture.caseId,
      marketId: fixture.marketId,
    });
    expect(readiness).toMatchObject({
      status: "blocked",
      blockers: ["blocking_roof_record"],
      pinned: true,
      calculation: { averageUsed: false },
    });
    expect(readiness.requirements.map((item) => [item.code, item.state])).toEqual([
      ["blocking_roof_record", "missing"],
      ["recommended_context", "ready"],
    ]);
  });

  test("explains missing, stale, scope, contradiction, review, sufficiency, and bounded applicability states", async () => {
    const fixture = await createCase("state-matrix");
    const codes = [
      "missing",
      "stale",
      "scope",
      "contradiction",
      "unreviewed",
      "insufficient",
      "ready",
      "conditional",
    ];
    const requirementIds = await seedRequirements(fixture, codes);
    const service = new MarketPlaybookService(productionDatabase(), () => new Date(at));
    const created = await service.createVersion(
      fixture.context,
      versionInput(
        fixture,
        codes.map((code) => ({
          requirementVersionId: requirementIds[code],
          blocking: code === "missing",
          acceptedEvidenceTypes:
            code === "insufficient" ? ["roof_report"] : undefined,
          conditions:
            code === "conditional"
              ? [
                  {
                    field: "program_id" as const,
                    operator: "equals" as const,
                    expectedValues: ["program-not-selected"],
                  },
                ]
              : undefined,
        })),
      ),
    );
    await service.reviewVersion(reviewerContext(fixture), {
      versionId: created.versionId,
      decision: "approved",
      note: "Fixture version independently reviewed.",
    });
    await addEvidence(fixture, {
      key: "stale",
      requirementVersionId: requirementIds.stale,
      freshnessStatus: "stale",
      captureDate: "2025-01-01",
    });
    await addEvidence(fixture, {
      key: "scope",
      requirementVersionId: requirementIds.scope,
      scopeStatus: "mismatch",
      scopeType: "building",
    });
    const contradictionVersion = await addEvidence(fixture, {
      key: "contradiction",
      requirementVersionId: requirementIds.contradiction,
    });
    const otherVersion = await addEvidence(fixture, {
      key: "contradiction-other",
      requirementVersionId: requirementIds.ready,
    });
    await database.insert(schema.contradictions).values({
      id: `contradiction-${fixture.organizationId}`,
      ...tenantRecord(fixture.context, at),
      caseId: fixture.caseId,
      leftEvidenceVersionId: contradictionVersion,
      rightEvidenceVersionId: otherVersion,
      status: "open",
    });
    await addEvidence(fixture, {
      key: "unreviewed",
      requirementVersionId: requirementIds.unreviewed,
      reviewStatus: "unreviewed",
    });
    await addEvidence(fixture, {
      key: "insufficient",
      requirementVersionId: requirementIds.insufficient,
      evidenceType: "inspection_report",
    });
    await service.linkCase(fixture.context, {
      caseId: fixture.caseId,
      marketId: fixture.marketId,
    });
    const result = await service.evaluateCase(fixture.context, {
      caseId: fixture.caseId,
      marketId: fixture.marketId,
    });
    expect(Object.fromEntries(result.requirements.map((item) => [item.code, item.state]))).toEqual({
      missing: "missing",
      stale: "stale",
      scope: "scope_mismatch",
      contradiction: "contradiction",
      unreviewed: "unreviewed",
      insufficient: "insufficient",
      ready: "contradiction",
      conditional: "not_applicable",
    });
    expect(result.caveats.at(-1)).toContain("not an underwriting risk score");
  });

  test("enforces independent review, exact applicability, immutable linkage, successors, and diffs", async () => {
    const fixture = await createCase("lifecycle");
    const requirementIds = await seedRequirements(fixture, ["base", "added"]);
    const service = new MarketPlaybookService(productionDatabase(), () => new Date(at));
    const first = await service.createVersion(
      fixture.context,
      versionInput(fixture, [{ requirementVersionId: requirementIds.base }]),
    );
    const firstRow = await database
      .select()
      .from(schema.playbookVersions)
      .where(eq(schema.playbookVersions.id, first.versionId));
    await expect(
      database.insert(schema.playbookVersions).values({
        ...firstRow[0],
        id: "playbook-version-missing-lineage",
        versionNumber: 2,
        supersedesVersionId: null,
        contentHash: "missing-lineage".padEnd(64, "0"),
      }),
    ).rejects.toThrow();
    const firstRequirement = await database
      .select({ id: schema.playbookRequirements.id })
      .from(schema.playbookRequirements)
      .where(eq(schema.playbookRequirements.playbookVersionId, first.versionId));
    await expect(
      database.insert(schema.playbookApplicabilityRules).values({
        id: "empty-condition-values",
        ...tenantRecord(fixture.context, at),
        playbookRequirementId: firstRequirement[0].id,
        position: 99,
        field: "peril",
        operator: "equals",
        expectedValues: [],
      }),
    ).rejects.toThrow();
    await expect(
      service.reviewVersion(fixture.context, {
        versionId: first.versionId,
        decision: "approved",
        note: "Self review is forbidden.",
      }),
    ).rejects.toBeInstanceOf(PlaybookStateError);
    await expect(
      service.resolveApplicableVersion(fixture.context, {
        caseId: fixture.caseId,
        marketId: fixture.marketId,
      }),
    ).rejects.toMatchObject({ code: "no_match" });
    await service.reviewVersion(reviewerContext(fixture), {
      versionId: first.versionId,
      decision: "approved",
      note: "Independent fixture approval.",
    });
    const link = await service.linkCase(fixture.context, {
      caseId: fixture.caseId,
      marketId: fixture.marketId,
    });
    await expect(
      database
        .update(schema.casePlaybookLinks)
        .set({ linkedBy: "tampered" })
        .where(eq(schema.casePlaybookLinks.id, link.linkId)),
    ).rejects.toThrow();
    const second = await service.createVersion(fixture.context, {
      ...versionInput(fixture, [
        { requirementVersionId: requirementIds.base, freshnessDays: 45 },
        { requirementVersionId: requirementIds.added, importance: "recommended" },
      ]),
      playbookId: first.playbookId,
      supersedesVersionId: first.versionId,
      changeSummary: "Add a recommended contextual record.",
    });
    const diff = await service.diffVersions(
      fixture.context,
      first.versionId,
      second.versionId,
    );
    expect(diff.added).toEqual([requirementIds.added]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([requirementIds.base]);
    await service.reviewVersion(reviewerContext(fixture), {
      versionId: second.versionId,
      decision: "approved",
      note: "Successor independently reviewed.",
    });
    await expect(
      service.resolveApplicableVersion(fixture.context, {
        caseId: fixture.caseId,
        marketId: fixture.marketId,
      }),
    ).rejects.toBeInstanceOf(PlaybookApplicabilityError);

    const beta = await createCase("lifecycle-beta");
    await expect(
      database.insert(schema.casePlaybookLinks).values({
        id: "cross-tenant-playbook-link",
        ...tenantRecord(beta.context, at),
        caseId: beta.caseId,
        playbookVersionId: first.versionId,
        destinationMarketId: beta.marketId,
        linkedAt: at,
        linkedBy: beta.context.actorSubject,
      }),
    ).rejects.toThrow();
  });

  test("fails the shared response contract closed for unsupported governed enums", () => {
    const emptyWorkspace = {
      markets: [],
      programs: [],
      requirementVersions: [],
      publishedSourceVersions: [],
      playbooks: [],
      versions: [],
      requirements: [],
      rules: [],
      reviews: [],
      cases: [],
      links: [],
    };
    expect(() =>
      presentMarketPlaybookWorkspace({
        ...emptyWorkspace,
        requirements: [
          {
            id: "requirement-invalid-importance",
            playbookVersionId: "version-1",
            requirementVersionId: "requirement-version-1",
            position: 1,
            importance: "optional",
            blocking: false,
            acceptedEvidenceTypes: [],
            freshnessDays: null,
            requiredScopeType: "property",
            acceptedSourceTypes: [],
            requiredReviewStatus: "human_confirmed",
            caveat: null,
          },
        ],
      } as unknown as Parameters<typeof presentMarketPlaybookWorkspace>[0]),
    ).toThrow("importance is unsupported");
    expect(() =>
      presentMarketPlaybookWorkspace({
        ...emptyWorkspace,
        reviews: [
          {
            id: "review-invalid-decision",
            playbookVersionId: "version-1",
            decision: "accepted",
            reviewerSubject: "reviewer-1",
            note: "Invalid fixture decision.",
            reviewedAt: at,
          },
        ],
      } as unknown as Parameters<typeof presentMarketPlaybookWorkspace>[0]),
    ).toThrow("review decision is unsupported");
  });
});

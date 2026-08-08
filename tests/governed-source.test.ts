import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import {
  SourceGovernanceWorkspaceQueryService,
  type SourceGovernanceWorkspace,
  sourceGovernanceWorkspaceQuery,
} from "@/lib/production/contexts/source-governance/workspace-query";
import { presentGovernedSourceWorkspace } from "@/lib/production/governed-source-http";
import {
  GovernedSourceService,
  GovernedSourceStateError,
} from "@/lib/production/governed-source-service";
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

function asActor(context: TenantContext, actorSubject: string): TenantContext {
  return {
    ...context,
    actorSubject,
    role: "practice_leader",
  };
}

async function registerSource(
  fixture: Awaited<ReturnType<typeof createTenantFixture>>,
  key: string,
) {
  const service = new GovernedSourceService(
    productionDatabase(),
    () => new Date(at),
  );
  const source = await service.createSource(fixture.context, {
    canonicalKey: `ca-primary-${key}`,
    sourceClass: "regulator_guidance",
    issuingAuthority: "California authority fixture",
    title: `Primary source fixture ${key}`,
    jurisdiction: "California",
    officialUrl: `https://example.test/california/${key}`,
    authorityTier: "primary",
    reviewOwnerSubject: `owner-${key}`,
  });
  return { service, source };
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

describe("governed California source register", () => {
  test("binds exact clean bytes, enforces independent publication, and emits immutable successor impact", async () => {
    const fixture = await createTenantFixture(
      productionDatabase(),
      "source-lifecycle",
    );
    const caseId = "case-source-lifecycle";
    await fixture.repository.createRenewalCase(
      fixture.context,
      "request-source-lifecycle",
      {
        id: caseId,
        policyId: fixture.policyId,
        title: "California source impact case",
        status: "open",
        caseType: "renewal",
        peril: "wildfire",
        jurisdiction: "California",
        propertyClass: "condominium",
        renewalDate: "2027-01-01",
      },
    );
    const exactHash = "1".repeat(64);
    const storageObjectId = "storage-source-lifecycle";
    await database.insert(schema.storageObjects).values({
      id: storageObjectId,
      ...tenantRecord(fixture.context, at),
      provider: "deterministic",
      bucket: "fortify-private",
      objectKey: `${fixture.organizationId}/sources/primary-fixture.txt`,
      originalFilename: "primary-fixture.txt",
      mimeType: "text/plain",
      sizeBytes: 128,
      sha256: exactHash,
      encryptionMode: "AES256",
      state: "clean",
      scanStatus: "clean",
    });
    const { service, source } = await registerSource(fixture, "lifecycle");
    const first = await service.createVersion(fixture.context, {
      sourceId: source.sourceId,
      versionLabel: "2026.1",
      publicationDate: "2026-07-15",
      effectiveFrom: "2026-07-15",
      retrievalDate: "2026-08-01",
      sourceHash: exactHash,
      snapshotState: "exact_bytes",
      storageObjectId,
      rightsStatus: "approved",
      redistributionAllowed: true,
      useRestrictions: "Public fixture bytes approved for deterministic tests.",
      structuredSummary: {
        scope: "Primary source fixture",
        operativeBoundary: "Human publication required",
      },
      verifyCurrentStatus: "verified_current",
      nextReviewDate: "2026-09-01",
      extractionMethod: "human_authored",
      humanConfirmed: true,
      changeSummary: "Initial exact-byte fixture.",
    });
    await expect(
      service.reviewVersion(fixture.context, {
        sourceVersionId: first.sourceVersionId,
        decision: "approved",
        note: "Self review must fail.",
        sourceCompared: true,
        rightsConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(GovernedSourceStateError);
    await service.reviewVersion(asActor(fixture.context, "source-reviewer"), {
      sourceVersionId: first.sourceVersionId,
      decision: "approved",
      note: "Exact bytes, authority, dates, and rights independently reviewed.",
      sourceCompared: true,
      rightsConfirmed: true,
    });
    await expect(
      service.publishVersion(asActor(fixture.context, "source-reviewer"), {
        sourceVersionId: first.sourceVersionId,
        decision: "published",
        note: "The reviewer cannot also publish.",
      }),
    ).rejects.toBeInstanceOf(GovernedSourceStateError);
    await expect(
      service.publishVersion(fixture.context, {
        sourceVersionId: first.sourceVersionId,
        decision: "published",
        note: "Author publication must fail.",
      }),
    ).rejects.toBeInstanceOf(GovernedSourceStateError);
    await service.publishVersion(asActor(fixture.context, "source-publisher"), {
      sourceVersionId: first.sourceVersionId,
      decision: "published",
      note: "Published as a bounded source reference.",
    });
    await service.registerDependency(fixture.context, {
      sourceVersionId: first.sourceVersionId,
      consumerType: "renewal_case",
      consumerId: caseId,
      relationship: "relied_on",
      rationale: "Case relies on this exact source version.",
    });

    const second = await service.createVersion(fixture.context, {
      sourceId: source.sourceId,
      versionLabel: "2026.2",
      publicationDate: "2026-08-01",
      effectiveFrom: "2026-08-01",
      retrievalDate: "2026-08-01",
      sourceHash: "2".repeat(64),
      snapshotState: "metadata_only_restricted",
      rightsStatus: "restricted",
      redistributionAllowed: false,
      useRestrictions:
        "Metadata-only successor; source redistribution restricted.",
      structuredSummary: {
        change: "Successor fixture for dependency impact",
      },
      verifyCurrentStatus: "verified_current",
      nextReviewDate: "2026-09-01",
      extractionMethod: "deterministic_extraction",
      humanConfirmed: true,
      changeSummary: "Register reviewed successor metadata.",
      supersedesVersionId: first.sourceVersionId,
    });
    await service.reviewVersion(
      asActor(fixture.context, "successor-reviewer"),
      {
        sourceVersionId: second.sourceVersionId,
        decision: "approved",
        note: "Successor and rights boundary independently reviewed.",
        sourceCompared: true,
        rightsConfirmed: true,
      },
    );
    const published = await service.publishVersion(
      asActor(fixture.context, "successor-publisher"),
      {
        sourceVersionId: second.sourceVersionId,
        decision: "published",
        note: "Publish successor and preserve prior reliance.",
      },
    );
    expect(published.impact).toMatchObject({
      affected: {
        cases: [{ id: caseId }],
        playbooks: [],
        profiles: { state: "available", items: [] },
        reports: { state: "available", items: [] },
      },
    });
    expect(published.alertId).toBeTruthy();
    const alerts = await database
      .select()
      .from(schema.sourceChangeAlerts)
      .where(eq(schema.sourceChangeAlerts.id, published.alertId!));
    expect(alerts).toHaveLength(1);
    await expect(
      database
        .update(schema.sourceChangeAlerts)
        .set({ ownerSubject: "tampered" })
        .where(eq(schema.sourceChangeAlerts.id, published.alertId!)),
    ).rejects.toThrow();
    await expect(
      database
        .update(schema.governedSourceVersions)
        .set({ sourceHash: "3".repeat(64) })
        .where(eq(schema.governedSourceVersions.id, first.sourceVersionId)),
    ).rejects.toThrow();
  });

  test("keeps model-assisted, unconfirmed, rights-pending, and cross-tenant records non-operative", async () => {
    const alpha = await createTenantFixture(
      productionDatabase(),
      "source-alpha",
    );
    const beta = await createTenantFixture(productionDatabase(), "source-beta");
    const { service, source } = await registerSource(alpha, "blocked");
    const pendingRights = await service.createVersion(alpha.context, {
      sourceId: source.sourceId,
      versionLabel: "candidate-1",
      retrievalDate: "2026-08-01",
      sourceHash: "a".repeat(64),
      snapshotState: "metadata_only_restricted",
      rightsStatus: "pending",
      redistributionAllowed: false,
      useRestrictions: "Rights review pending.",
      structuredSummary: { candidate: "Unreviewed extracted fact" },
      verifyCurrentStatus: "unverified",
      nextReviewDate: "2026-08-08",
      extractionMethod: "model_assisted",
      humanConfirmed: false,
      changeSummary: "Candidate only.",
    });
    await expect(
      service.reviewVersion(asActor(alpha.context, "blocked-reviewer"), {
        sourceVersionId: pendingRights.sourceVersionId,
        decision: "approved",
        note: "Approval should be blocked while rights are pending.",
        sourceCompared: true,
        rightsConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(GovernedSourceStateError);
    await expect(
      database.insert(schema.governedSourceDependencies).values({
        id: "cross-tenant-source-dependency",
        ...tenantRecord(beta.context, at),
        sourceVersionId: pendingRights.sourceVersionId,
        consumerType: "renewal_case",
        consumerId: "missing-case",
        relationship: "relied_on",
        rationale: "Must fail closed.",
        pinnedAt: at,
        pinnedBy: beta.context.actorSubject,
      }),
    ).rejects.toThrow();
    const workspace = await new SourceGovernanceWorkspaceQueryService(
      productionDatabase(),
    ).execute(sourceGovernanceWorkspaceQuery(alpha.context));
    expect(sourceGovernanceWorkspaceQuery(alpha.context)).toMatchObject({
      kind: "query",
      boundedContext: "source_governance",
      name: "source_governance.workspace",
      context: alpha.context,
      input: undefined,
    });
    expect(workspace.doctrine).toEqual({
      extractedRulesAutomaticallyOperative: false,
      publicationRequiresHumanConfirmation: true,
      publicationRequiresIndependentReview: true,
    });
    expect(workspace.publications).toHaveLength(0);

    const unsupportedPersistedReview = {
      ...workspace,
      reviews: [
        {
          id: "unsupported-review",
          sourceVersionId: pendingRights.sourceVersionId,
          decision: "implicitly_approved",
          reviewerSubject: "invalid-fixture",
          note: "Must never project as an accepted contract value.",
          sourceCompared: false,
          rightsConfirmed: false,
          reviewedAt: at,
        },
      ],
    } as unknown as SourceGovernanceWorkspace;
    expect(() =>
      presentGovernedSourceWorkspace(unsupportedPersistedReview),
    ).toThrow("Unsupported persisted source review decision value.");
  });
});

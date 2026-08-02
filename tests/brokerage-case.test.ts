import { PGlite } from "@electric-sql/pglite";
import { and, count, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import { genericAmsCsvAdapter } from "@/lib/production/import-adapters";
import {
  BrokerageCaseService,
  BrokerageCaseStateError,
} from "@/lib/production/brokerage-case-service";
import { AuthorizationDeniedError } from "@/lib/production/authorization";
import { DocumentPipelineService } from "@/lib/production/document-pipeline-service";
import {
  FixtureDocumentProvider,
  type ProviderDocument,
} from "@/lib/production/document-providers";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import { PortfolioImportService } from "@/lib/production/portfolio-import-service";
import {
  tenantRecord,
  type ProductionDatabaseLike,
  type TenantContext,
} from "@/lib/production/repository";
import {
  DeterministicMalwareScanner,
  ProductionStorageService,
} from "@/lib/production/storage-service";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;

const clock = () => new Date("2026-08-01T12:00:00.000Z");
const productionDatabase = () =>
  database as unknown as ProductionDatabaseLike;
const digest = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");
const fixturePath = (name: string) =>
  path.resolve(process.cwd(), "tests", "fixtures", "import", name);

const workerContext = (organizationId: string): TenantContext => ({
  organizationId,
  actorSubject: `document-worker-${organizationId}`,
  principalType: "service_account",
  grantedScopes: [
    "document_processing_job:update",
    "document_processing_attempt:create",
    "document_processing_attempt:update",
    "document_extraction_run:create",
    "source_document:update",
    "source_passage:create",
    "extracted_field:create",
  ],
});

async function cleanObject(
  fixture: Awaited<ReturnType<typeof createTenantFixture>>,
  storage: DeterministicObjectStorageAdapter,
  input: { body: Uint8Array; filename: string; mimeType: string },
) {
  const service = new ProductionStorageService(
    productionDatabase(),
    storage,
    { mode: "AES256" },
    clock,
  );
  const upload = await service.requestUpload(fixture.context, {
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.body.byteLength,
    sha256: digest(input.body),
  });
  await storage.put({
    key: upload.objectKey,
    body: input.body,
    mimeType: input.mimeType,
    sha256: digest(input.body),
  });
  await service.finalizeUpload(
    fixture.context,
    upload.storageObjectId,
    upload.grantId,
  );
  await service.scanAndPromote(
    fixture.context,
    upload.storageObjectId,
    new DeterministicMalwareScanner(),
  );
  return { storageObjectId: upload.storageObjectId, service };
}

async function buildCase(key: string) {
  const fixture = await createTenantFixture(productionDatabase(), key);
  const caseId = `case-${key}`;
  const at = clock().toISOString();
  await database.insert(schema.locations).values({
    id: `location-${key}`,
    ...tenantRecord(fixture.context, at),
    propertyId: fixture.propertyId,
    addressLine1: "100 Fictional Ridge Drive",
    city: "Nevada City",
    region: "CA",
    postalCode: "95959",
    county: "Nevada",
    normalizedAddress: "100fictionalridgedrivenevadacityca95959",
    normalizationStatus: "fixture_confirmed",
  });
  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-create-${key}`,
    {
      id: caseId,
      policyId: fixture.policyId,
      title: "Fictional Sierra Vista 2027 renewal",
      status: "evidence_collection",
      caseType: "renewal",
      peril: "wildfire",
      jurisdiction: "US-CA",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
      appealDeadline: "2026-09-15",
      ownerSubject: fixture.context.actorSubject,
    },
  );
  return { ...fixture, caseId, policyNumber: `POL-${key}` };
}

async function buildImportedAppealCase(
  key: string,
  storage: DeterministicObjectStorageAdapter,
) {
  const fixture = await createTenantFixture(productionDatabase(), key);
  const body = new Uint8Array(
    await readFile(fixturePath("california-brokerage.csv")),
  );
  const importService = new PortfolioImportService(
    productionDatabase(),
    storage,
    clock,
  );
  const suggestion = await importService.suggestMapping({
    body,
    format: "csv",
    sourceSystem: genericAmsCsvAdapter.sourceSystem,
  });
  const mapping = await importService.saveMapping(fixture.context, {
    name: "California brokerage fixture v1",
    sourceSystem: genericAmsCsvAdapter.sourceSystem,
    fileFormat: "csv",
    columnMapping: suggestion.mapping,
  });
  const stored = await cleanObject(fixture, storage, {
    body,
    filename: "california-brokerage.csv",
    mimeType: "text/csv",
  });
  const preview = await importService.preview(fixture.context, {
    bookId: fixture.bookId,
    storageObjectId: stored.storageObjectId,
    mappingVersionId: mapping.version.id,
    sourceSystem: genericAmsCsvAdapter.sourceSystem,
    idempotencyKey: `california-import-${key}`,
  });
  expect(preview.portfolioImport).toMatchObject({
    status: "previewed",
    totalRows: 2,
    acceptedRows: 2,
    rejectedRows: 0,
    ambiguousRows: 0,
  });
  const committed = await importService.commit(
    fixture.context,
    preview.portfolioImport.id,
    { confirmAcceptedRows: true },
  );
  expect(committed.portfolioImport).toMatchObject({
    status: "committed",
    committedRows: 2,
  });

  const identifiers = await database
    .select({ propertyId: schema.propertyIdentifiers.propertyId })
    .from(schema.propertyIdentifiers)
    .where(
      and(
        eq(schema.propertyIdentifiers.organizationId, fixture.organizationId),
        eq(schema.propertyIdentifiers.source, genericAmsCsvAdapter.sourceSystem),
        eq(schema.propertyIdentifiers.value, "PROP-CA-100"),
      ),
    );
  expect(identifiers).toHaveLength(1);
  const propertyId = identifiers[0].propertyId;
  const imported = await database
    .select({
      property: schema.properties,
      community: schema.communities,
      policy: schema.policies,
    })
    .from(schema.properties)
    .innerJoin(
      schema.communities,
      eq(schema.properties.communityId, schema.communities.id),
    )
    .innerJoin(schema.policies, eq(schema.policies.propertyId, schema.properties.id))
    .where(
      and(
        eq(schema.properties.organizationId, fixture.organizationId),
        eq(schema.properties.id, propertyId),
        eq(schema.policies.policyNumber, "CA-POL-2027-001"),
      ),
    );
  expect(imported).toHaveLength(1);
  const caseId = `case-${key}`;
  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-create-${key}`,
    {
      id: caseId,
      policyId: imported[0].policy.id,
      title: "Fictional Sierra Vista 2027 appeal",
      status: "evidence_collection",
      caseType: "appeal",
      peril: "wildfire",
      jurisdiction: "US-CA",
      propertyClass: "condominium",
      renewalDate: "2027-01-01",
      appealDeadline: "2026-09-15",
      ownerSubject: fixture.context.actorSubject,
    },
  );
  return {
    ...fixture,
    caseId,
    propertyId,
    communityId: imported[0].community.id,
    policyId: imported[0].policy.id,
    policyNumber: imported[0].policy.policyNumber,
    portfolioImportId: preview.portfolioImport.id,
  };
}

async function addConfirmedNotice(
  fixture: Awaited<ReturnType<typeof buildCase>>,
  storage: DeterministicObjectStorageAdapter,
) {
  const body = new TextEncoder().encode(
    [
      "Carrier notice",
      "Carrier: Fictional California Property Market",
      `Policy: ${fixture.policyNumber}`,
      "Notice date: 2026-08-01",
      "Appeal deadline: 2026-09-15",
      "Required evidence: current roof documentation and a building schedule",
    ].join("\n"),
  );
  const stored = await cleanObject(fixture, storage, {
    body,
    filename: "fictional-carrier-notice.txt",
    mimeType: "text/plain",
  });
  const passages: ProviderDocument["passages"] = [
    "Carrier notice",
    "Carrier: Fictional California Property Market",
    `Policy: ${fixture.policyNumber}`,
    "Notice date: 2026-08-01",
    "Appeal deadline: 2026-09-15",
    "Required evidence: current roof documentation and a building schedule",
  ].map((text, index) => ({
    pageNumber: 1,
    segment: `line-${index + 1}`,
    text,
    kind: "line" as const,
  }));
  const provider = new FixtureDocumentProvider();
  provider.register(body, { passages, pageCount: 1, warnings: [] });
  const pipeline = new DocumentPipelineService(
    productionDatabase(),
    storage,
    provider,
    undefined,
    undefined,
    clock,
  );
  const intake = await pipeline.intake(fixture.context, {
    storageObjectId: stored.storageObjectId,
    caseId: fixture.caseId,
    idempotencyKey: `notice-intake-${fixture.caseId}`,
  });
  await pipeline.processNext(workerContext(fixture.organizationId), {
    workerId: `worker-${fixture.caseId}`,
  });
  const candidates = await database
    .select()
    .from(schema.extractedFields)
    .where(
      and(
        eq(schema.extractedFields.organizationId, fixture.organizationId),
        eq(schema.extractedFields.sourceDocumentId, intake.sourceDocumentId),
      ),
    );
  for (const candidate of candidates)
    await pipeline.reviewCandidate(fixture.context, {
      extractedFieldId: candidate.id,
      action: "confirmed",
    });
  return intake.sourceDocumentId;
}

async function addEvidence(
  fixture: Awaited<ReturnType<typeof buildCase>>,
  storage: DeterministicObjectStorageAdapter,
) {
  const body = new TextEncoder().encode(
    "%PDF-1.4\nFictional roof schedule evidence\n%%EOF",
  );
  const stored = await cleanObject(fixture, storage, {
    body,
    filename: "fictional-roof-schedule.pdf",
    mimeType: "application/pdf",
  });
  return stored.service.createEvidenceVersion(fixture.context, {
    storageObjectId: stored.storageObjectId,
    propertyId: fixture.propertyId,
    evidenceType: "roof_schedule",
    sourceType: "property_manager_upload",
    scopeType: "community",
  });
}

async function addRequest(
  fixture: Awaited<ReturnType<typeof buildCase>>,
  service: BrokerageCaseService,
) {
  const draft = await service.createEvidenceRequest(
    fixture.context,
    `request-${fixture.caseId}`,
    {
      caseId: fixture.caseId,
      recipientType: "property_manager",
      recipientLabel: "Fictional Sierra Vista property manager",
      purpose: "Collect current property evidence for the 2027 renewal",
      instructions:
        "Upload the current roof schedule and identify the exact building scope.",
      dueAt: "2026-08-20T17:00:00.000Z",
      requestedItems: [
        {
          evidenceType: "roof_schedule",
          label: "Current roof schedule",
          required: true,
          scopeType: "community",
          scopeReference: fixture.communityId,
          guidance: "Include building labels, dates, and the source organization.",
        },
      ],
      humanConfirmation: true,
    },
  );
  await service.issueEvidenceRequest(fixture.context, draft.requestId, {
    expiresAt: "2026-08-21T17:00:00.000Z",
    humanConfirmation: true,
  });
  return draft;
}

beforeEach(async () => {
  client = new PGlite();
  database = drizzle(client, { schema });
  await migrate(database, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle-production"),
  });
});

afterEach(async () => {
  await client.close();
});

describe("production brokerage case and packet workflow", () => {
  test("runs the real import service through an appeal case and immutable packet without demo state", async () => {
    const storage = new DeterministicObjectStorageAdapter();
    const fixture = await buildImportedAppealCase(
      "brokerage-import-flow",
      storage,
    );
    const service = new BrokerageCaseService(
      productionDatabase(),
      storage,
      clock,
    );
    await addConfirmedNotice(fixture, storage);
    await addEvidence(fixture, storage);
    await addRequest(fixture, service);
    const generated = await service.generatePacket(
      fixture.context,
      `packet-${fixture.caseId}`,
      {
        caseId: fixture.caseId,
        purpose: "Carrier appeal evidence review",
        letter:
          "Please review the enclosed human-confirmed property evidence for this fictional appeal. The packet preserves unresolved caveats and does not imply any insurance outcome.",
        humanConfirmation: true,
      },
    );

    const workspace = await service.getWorkspace(fixture.context);
    const importedCase = workspace.cases.find(
      (candidate) => candidate.id === fixture.caseId,
    );
    expect(importedCase).toMatchObject({
      caseType: "appeal",
      jurisdiction: "US-CA",
      property: {
        name: "Sierra Vista",
        address: "100 Fictional Ridge Drive, Nevada City, CA, 95959",
      },
      policy: {
        policyNumber: "CA-POL-2027-001",
        sourceAuthority: genericAmsCsvAdapter.sourceSystem,
      },
      gates: {
        noticeFactsConfirmed: true,
        evidenceRequestRecorded: true,
        packetGenerated: true,
      },
    });
    expect(generated.artifacts).toHaveLength(4);
    const importRows = await database
      .select()
      .from(schema.importRows)
      .where(eq(schema.importRows.portfolioImportId, fixture.portfolioImportId));
    expect(importRows).toHaveLength(2);
    expect(importRows.every((row) => row.status === "committed")).toBe(true);
    const artifactOutputDirectory = path.resolve(
      process.cwd(),
      "output",
      "packets",
      "production-brokerage-fixture",
    );
    if (process.env.FORTIFY_WRITE_BROKERAGE_FIXTURE === "1")
      await mkdir(artifactOutputDirectory, { recursive: true });
    for (const artifact of generated.artifacts) {
      const objects = await database
        .select({ object: schema.storageObjects })
        .from(schema.submissionArtifacts)
        .innerJoin(
          schema.storageObjects,
          eq(schema.submissionArtifacts.storageObjectId, schema.storageObjects.id),
        )
        .where(
          and(
            eq(
              schema.submissionArtifacts.submissionVersionId,
              generated.submissionVersionId,
            ),
            eq(schema.submissionArtifacts.filename, artifact.filename),
          ),
        );
      expect(objects).toHaveLength(1);
      const bytes = await storage.read(objects[0].object.objectKey);
      expect(bytes.byteLength).toBe(artifact.sizeBytes);
      expect(digest(bytes)).toBe(artifact.sha256);
      if (process.env.FORTIFY_WRITE_BROKERAGE_FIXTURE === "1")
        await writeFile(path.join(artifactOutputDirectory, artifact.filename), bytes);
    }
  });

  test("runs a tenant-scoped California case from confirmed notice and request to exact immutable packet bytes", async () => {
    const fixture = await buildCase("brokerage-flow");
    const storage = new DeterministicObjectStorageAdapter();
    const service = new BrokerageCaseService(
      productionDatabase(),
      storage,
      clock,
    );
    await addConfirmedNotice(fixture, storage);
    await addEvidence(fixture, storage);
    await addRequest(fixture, service);

    const input = {
      caseId: fixture.caseId,
      purpose: "Carrier renewal evidence review",
      letter:
        "Please review the enclosed human-confirmed property evidence for the fictional 2027 renewal. The packet preserves unresolved caveats and does not imply any insurance outcome.",
      humanConfirmation: true,
    };
    const generated = await service.generatePacket(
      fixture.context,
      `packet-${fixture.caseId}`,
      input,
    );
    expect(generated.artifacts.map((artifact) => artifact.artifactType).sort()).toEqual(
      ["letter", "manifest", "pdf", "zip"],
    );
    const replay = await service.generatePacket(
      fixture.context,
      `packet-${fixture.caseId}`,
      input,
    );
    expect(replay).toEqual(generated);

    const rows = await database
      .select({ artifact: schema.submissionArtifacts, object: schema.storageObjects })
      .from(schema.submissionArtifacts)
      .innerJoin(
        schema.storageObjects,
        eq(schema.submissionArtifacts.storageObjectId, schema.storageObjects.id),
      )
      .where(
        eq(schema.submissionArtifacts.submissionVersionId, generated.submissionVersionId),
      );
    expect(rows).toHaveLength(4);
    for (const { artifact, object } of rows) {
      const body = await storage.read(object.objectKey);
      expect(body.byteLength).toBe(artifact.sizeBytes);
      expect(digest(body)).toBe(artifact.sha256);
      expect(object.state).toBe("clean");
      expect(object.scanStatus).toBe("clean");
    }
    const pdfRow = rows.find(({ artifact }) => artifact.artifactType === "pdf")!;
    const pdf = await PDFDocument.load(await storage.read(pdfRow.object.objectKey));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(5);
    const zipRow = rows.find(({ artifact }) => artifact.artifactType === "zip")!;
    const zip = await JSZip.loadAsync(await storage.read(zipRow.object.objectKey));
    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        "manifest.json",
        "accompanying-letter.txt",
        "exhibits/E01-fictional-roof-schedule.pdf",
      ]),
    );
    const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as {
      synthetic: boolean;
      notice: { facts: Array<{ key: string }> };
      evidence: Array<{ sha256: string }>;
    };
    expect(manifest.synthetic).toBe(false);
    expect(manifest.notice.facts.map((fact) => fact.key)).toEqual(
      expect.arrayContaining([
        "market",
        "policy",
        "noticeDate",
        "deadline",
        "requiredEvidence",
      ]),
    );
    expect(manifest.evidence).toHaveLength(1);

    await expect(
      database
        .update(schema.submissionArtifacts)
        .set({ sha256: "0".repeat(64) })
        .where(eq(schema.submissionArtifacts.id, pdfRow.artifact.id)),
    ).rejects.toThrow();
    await expect(
      database
        .delete(schema.evidenceRequestVersions)
        .where(eq(schema.evidenceRequestVersions.organizationId, fixture.organizationId)),
    ).rejects.toThrow();
    const workspace = await service.getWorkspace(fixture.context);
    expect(workspace.cases[0].gates).toMatchObject({
      noticeFactsConfirmed: true,
      evidenceRequestRecorded: true,
      packetGenerated: true,
    });
  });

  test("fails closed without all human-confirmed notice facts", async () => {
    const fixture = await buildCase("missing-confirmation");
    const storage = new DeterministicObjectStorageAdapter();
    const service = new BrokerageCaseService(
      productionDatabase(),
      storage,
      clock,
    );
    await addRequest(fixture, service);
    await expect(
      service.generatePacket(fixture.context, "missing-confirmation-packet", {
        caseId: fixture.caseId,
        purpose: "Carrier renewal evidence review",
        letter:
          "This intentionally cannot generate because the case lacks a human-confirmed carrier notice and its required facts.",
        humanConfirmation: true,
      }),
    ).rejects.toBeInstanceOf(BrokerageCaseStateError);
    const submissions = await database
      .select({ value: count() })
      .from(schema.submissions)
      .where(eq(schema.submissions.organizationId, fixture.organizationId));
    expect(submissions[0].value).toBe(0);
  });

  test("enforces case-role authority and database tenant guards for every new resource", async () => {
    const alpha = await buildCase("brokerage-alpha");
    const beta = await buildCase("brokerage-beta");
    const storage = new DeterministicObjectStorageAdapter();
    const service = new BrokerageCaseService(
      productionDatabase(),
      storage,
      clock,
    );
    const restricted: TenantContext = {
      ...alpha.context,
      role: "contractor_evidence_contributor",
      assignedCaseIds: [alpha.caseId],
      assignedCaseScopes: {
        [alpha.caseId]: [
          "evidence_request:read",
          "evidence_request_version:read",
          "evidence_item:create",
        ],
      },
    };
    await expect(
      service.generatePacket(restricted, "contractor-packet", {
        caseId: alpha.caseId,
        purpose: "Attempt prohibited packet generation",
        letter:
          "A contractor must not be able to create a brokerage submission or any immutable market packet artifact.",
        humanConfirmation: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);

    const at = clock().toISOString();
    await expect(
      database.insert(schema.evidenceRequests).values({
        id: "cross-tenant-request",
        ...tenantRecord(alpha.context, at),
        caseId: beta.caseId,
        recipientType: "property_manager",
        recipientLabel: "Wrong tenant",
        status: "draft",
      }),
    ).rejects.toThrow();
    await expect(
      database.insert(schema.evidenceRequestVersions).values({
        id: "cross-tenant-request-version",
        ...tenantRecord(alpha.context, at),
        evidenceRequestId: "missing-cross-tenant-request",
        versionNumber: 1,
        purpose: "Wrong tenant request",
        instructions: "This row must never persist.",
        dueAt: "2026-08-20T17:00:00.000Z",
        requestedItems: [],
        confirmedBy: alpha.context.actorSubject,
        confirmedAt: at,
      }),
    ).rejects.toThrow();
    const betaSubmissionId = "beta-submission";
    const betaVersionId = "beta-submission-version";
    await database.insert(schema.submissions).values({
      id: betaSubmissionId,
      ...tenantRecord(beta.context, at),
      caseId: beta.caseId,
      purpose: "Beta submission",
      status: "draft",
      currentVersionId: betaVersionId,
    });
    await database.insert(schema.submissionVersions).values({
      id: betaVersionId,
      ...tenantRecord(beta.context, at),
      submissionId: betaSubmissionId,
      versionNumber: 1,
      status: "draft",
      message: "Beta draft",
    });
    const alphaObject = await cleanObject(alpha, storage, {
      body: new TextEncoder().encode("alpha object"),
      filename: "alpha.txt",
      mimeType: "text/plain",
    });
    await expect(
      database.insert(schema.submissionArtifacts).values({
        id: "cross-tenant-artifact",
        ...tenantRecord(alpha.context, at),
        submissionVersionId: betaVersionId,
        storageObjectId: alphaObject.storageObjectId,
        artifactType: "letter",
        filename: "cross-tenant.txt",
        mimeType: "text/plain",
        sizeBytes: 12,
        sha256: "a".repeat(64),
        generationRecipeVersion: "test",
        generatedAt: at,
      }),
    ).rejects.toThrow();
  });
});

import { PGlite } from "@electric-sql/pglite";
import { and, eq } from "drizzle-orm";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import * as schema from "@/db/production/schema";
import type { TenantContext } from "@/lib/production/repository";
import {
  DocumentPipelineService,
  DocumentPipelineValidationError,
} from "@/lib/production/document-pipeline-service";
import {
  FixtureDocumentProvider,
  type ProviderDocument,
} from "@/lib/production/document-providers";
import { AuthorizationDeniedError } from "@/lib/production/authorization";
import { DeterministicObjectStorageAdapter } from "@/lib/production/object-storage";
import {
  DeterministicMalwareScanner,
  ProductionStorageService,
} from "@/lib/production/storage-service";
import type { ProductionDatabaseLike } from "@/lib/production/repository";
import { createTenantFixture } from "./factories/production";

let client: PGlite;
let database: PgliteDatabase<typeof schema>;
let sequence = 0;

const productionDatabase = () =>
  database as unknown as ProductionDatabaseLike;
const digest = (body: Uint8Array) =>
  createHash("sha256").update(body).digest("hex");

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

function fixtureDocument(
  passages: ProviderDocument["passages"],
  pageCount = 1,
): Omit<ProviderDocument, "modelDerived"> {
  return { passages, pageCount, warnings: [] };
}

async function createCase(key: string) {
  const fixture = await createTenantFixture(productionDatabase(), key);
  const caseId = `case-${key}`;
  await fixture.repository.createRenewalCase(
    fixture.context,
    `case-key-${key}`,
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
      ownerSubject: fixture.context.actorSubject,
    },
  );
  return { ...fixture, caseId };
}

async function storeCleanDocument(
  fixture: Awaited<ReturnType<typeof createCase>>,
  adapter: DeterministicObjectStorageAdapter,
  input: { body: Uint8Array; filename: string; mimeType: string },
) {
  const storage = new ProductionStorageService(
    productionDatabase(),
    adapter,
    { mode: "AES256" },
    () => new Date("2026-08-01T12:00:00.000Z"),
  );
  const upload = await storage.requestUpload(fixture.context, {
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.body.byteLength,
    sha256: digest(input.body),
  });
  await adapter.put({
    key: upload.objectKey,
    body: input.body,
    mimeType: input.mimeType,
    sha256: digest(input.body),
  });
  await storage.finalizeUpload(
    fixture.context,
    upload.storageObjectId,
    upload.grantId,
  );
  await storage.scanAndPromote(
    fixture.context,
    upload.storageObjectId,
    new DeterministicMalwareScanner(),
  );
  return upload.storageObjectId;
}

async function intakeAndProcess(input: {
  fixture: Awaited<ReturnType<typeof createCase>>;
  adapter: DeterministicObjectStorageAdapter;
  provider: FixtureDocumentProvider;
  body: Uint8Array;
  filename: string;
  mimeType: string;
  document: Omit<ProviderDocument, "modelDerived">;
  maxAttempts?: number;
  clock?: () => Date;
}) {
  const storageObjectId = await storeCleanDocument(
    input.fixture,
    input.adapter,
    input,
  );
  input.provider.register(input.body, input.document);
  const service = new DocumentPipelineService(
    productionDatabase(),
    input.adapter,
    input.provider,
    undefined,
    undefined,
    input.clock,
  );
  sequence += 1;
  const queued = await service.intake(input.fixture.context, {
    storageObjectId,
    caseId: input.fixture.caseId,
    idempotencyKey: `document-intake-${sequence}`,
    maxAttempts: input.maxAttempts,
  });
  const result = await service.processNext(
    workerContext(input.fixture.organizationId),
    { workerId: `worker-${sequence}`, retryDelayMs: 1_000 },
  );
  return { service, queued, result, storageObjectId };
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

describe("durable production document pipeline", () => {
  test("processes the document matrix with page, segment, region, rotation, table, image, conflict, and low-confidence provenance", async () => {
    const matrix = [
      {
        key: "text-pdf",
        body: new TextEncoder().encode("%PDF-1.4\nselectable fixture\n%%EOF"),
        filename: "carrier-notice.pdf",
        mimeType: "application/pdf",
        passages: [
          {
            pageNumber: 1,
            segment: "line-1",
            text: "Carrier notice",
            kind: "line" as const,
            region: { x: 0.08, y: 0.08, width: 0.42, height: 0.04 },
          },
          {
            pageNumber: 1,
            segment: "line-2",
            text: "Policy: COA-100",
            kind: "line" as const,
            region: { x: 0.08, y: 0.14, width: 0.4, height: 0.04 },
          },
        ],
      },
      {
        key: "scan-rotated",
        body: new Uint8Array([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]),
        filename: "rotated-scan.jpg",
        mimeType: "image/jpeg",
        passages: [
          {
            pageNumber: 1,
            segment: "region-1",
            text: "Evidence request",
            kind: "image_region" as const,
            region: {
              x: 0.12,
              y: 0.1,
              width: 0.74,
              height: 0.08,
              rotation: 90,
            },
          },
          {
            pageNumber: 1,
            segment: "region-2",
            text: "Required evidence: roof documentation",
            kind: "image_region" as const,
            region: {
              x: 0.14,
              y: 0.22,
              width: 0.7,
              height: 0.08,
              rotation: 90,
            },
          },
        ],
      },
      {
        key: "table-conflict",
        body: new TextEncoder().encode("%PDF-1.4\ntable fixture\n%%EOF"),
        filename: "questionnaire.pdf",
        mimeType: "application/pdf",
        passages: [
          {
            pageNumber: 2,
            segment: "table-r2-c1",
            text: "Renewal questionnaire",
            kind: "table_cell" as const,
            region: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
          },
          {
            pageNumber: 2,
            segment: "table-r2-c2",
            text: "Required evidence: building schedule",
            kind: "table_cell" as const,
            region: { x: 0.42, y: 0.2, width: 0.4, height: 0.05 },
          },
          {
            pageNumber: 2,
            segment: "table-r3-c2",
            text: "Required evidence: current inspection [uncertain]?",
            kind: "table_cell" as const,
            region: { x: 0.42, y: 0.28, width: 0.4, height: 0.05 },
          },
        ],
      },
      {
        key: "image",
        body: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]),
        filename: "underwriter-message.png",
        mimeType: "image/png",
        passages: [
          {
            pageNumber: 1,
            segment: "image-message",
            text: "From: underwriting@example.test",
            kind: "image_region" as const,
            region: { x: 0.05, y: 0.05, width: 0.8, height: 0.08 },
          },
          {
            pageNumber: 1,
            segment: "image-subject",
            text: "Subject: Underwriter clarification",
            kind: "image_region" as const,
            region: { x: 0.05, y: 0.14, width: 0.8, height: 0.08 },
          },
        ],
      },
    ];
    for (const entry of matrix) {
      const fixture = await createCase(`matrix-${entry.key}`);
      const adapter = new DeterministicObjectStorageAdapter();
      const provider = new FixtureDocumentProvider();
      const processed = await intakeAndProcess({
        fixture,
        adapter,
        provider,
        body: entry.body,
        filename: entry.filename,
        mimeType: entry.mimeType,
        document: fixtureDocument(entry.passages, Math.max(...entry.passages.map((item) => item.pageNumber))),
      });
      expect(processed.result.status).toBe("succeeded");
    }
    const passages = await database.select().from(schema.sourcePassages);
    expect(passages.some((passage) => passage.region?.rotation === 90)).toBe(true);
    expect(passages.some((passage) => passage.passageKind === "table_cell")).toBe(true);
    expect(passages.some((passage) => passage.passageKind === "image_region")).toBe(true);
    expect(passages.some((passage) => passage.pageNumber === 2)).toBe(true);
    const candidates = await database.select().from(schema.extractedFields);
    const requiredEvidence = candidates.filter(
      (candidate) => candidate.fieldKey === "requiredEvidence",
    );
    expect(requiredEvidence.map((candidate) => candidate.candidateOrdinal)).toEqual(
      expect.arrayContaining([1, 2]),
    );
    expect(
      requiredEvidence.some((candidate) => Number(candidate.confidence) < 0.5),
    ).toBe(true);
    expect(requiredEvidence.every((candidate) => candidate.sourcePassageId)).toBe(true);
  }, 30_000);

  test("retries transient failures and dead-letters terminal exhaustion with immutable attempts", async () => {
    let currentTime = new Date("2026-08-01T12:00:00.000Z");
    const clock = () => currentTime;
    const fixture = await createCase("retry");
    const adapter = new DeterministicObjectStorageAdapter();
    const body = new TextEncoder().encode("Retry evidence request");
    const provider = new FixtureDocumentProvider({ failuresBeforeSuccess: 1 });
    const storageObjectId = await storeCleanDocument(fixture, adapter, {
      body,
      filename: "retry.txt",
      mimeType: "text/plain",
    });
    provider.register(
      body,
      fixtureDocument([
        {
          pageNumber: 1,
          segment: "line-1",
          text: "Evidence request",
          kind: "line",
        },
        {
          pageNumber: 1,
          segment: "line-2",
          text: "Required evidence: current roof report",
          kind: "line",
        },
      ]),
    );
    const service = new DocumentPipelineService(
      productionDatabase(),
      adapter,
      provider,
      undefined,
      undefined,
      clock,
    );
    await service.intake(fixture.context, {
      storageObjectId,
      caseId: fixture.caseId,
      idempotencyKey: "retry-intake",
      maxAttempts: 3,
    });
    const worker = workerContext(fixture.organizationId);
    expect(
      await service.processNext(worker, {
        workerId: "retry-worker",
        retryDelayMs: 1_000,
      }),
    ).toMatchObject({ status: "retry_scheduled" });
    currentTime = new Date("2026-08-01T12:00:02.000Z");
    expect(
      await service.processNext(worker, {
        workerId: "retry-worker",
        retryDelayMs: 1_000,
      }),
    ).toMatchObject({ status: "succeeded" });
    const retryAttempts = await database
      .select()
      .from(schema.documentProcessingAttempts)
      .where(eq(schema.documentProcessingAttempts.organizationId, fixture.organizationId));
    expect(retryAttempts.map((attempt) => attempt.status)).toEqual([
      "failed_retryable",
      "succeeded",
    ]);
    await expect(
      database
        .update(schema.documentProcessingAttempts)
        .set({ status: "failed_terminal" })
        .where(eq(schema.documentProcessingAttempts.id, retryAttempts[0].id)),
    ).rejects.toThrow();
    const unchangedAttempt = await database
      .select({ status: schema.documentProcessingAttempts.status })
      .from(schema.documentProcessingAttempts)
      .where(eq(schema.documentProcessingAttempts.id, retryAttempts[0].id));
    expect(unchangedAttempt[0].status).toBe("failed_retryable");

    const deadFixture = await createCase("dead-letter");
    const deadAdapter = new DeterministicObjectStorageAdapter();
    const deadBody = new TextEncoder().encode("Terminal fixture");
    const deadProvider = new FixtureDocumentProvider({ failuresBeforeSuccess: 5 });
    const deadObjectId = await storeCleanDocument(deadFixture, deadAdapter, {
      body: deadBody,
      filename: "dead-letter.txt",
      mimeType: "text/plain",
    });
    deadProvider.register(
      deadBody,
      fixtureDocument([
        { pageNumber: 1, segment: "line-1", text: "Carrier notice", kind: "line" },
      ]),
    );
    let deadTime = new Date("2026-08-01T13:00:00.000Z");
    const deadService = new DocumentPipelineService(
      productionDatabase(),
      deadAdapter,
      deadProvider,
      undefined,
      undefined,
      () => deadTime,
    );
    await deadService.intake(deadFixture.context, {
      storageObjectId: deadObjectId,
      caseId: deadFixture.caseId,
      idempotencyKey: "dead-letter-intake",
      maxAttempts: 2,
    });
    const deadWorker = workerContext(deadFixture.organizationId);
    expect(
      await deadService.processNext(deadWorker, {
        workerId: "dead-worker",
        retryDelayMs: 1_000,
      }),
    ).toMatchObject({ status: "retry_scheduled" });
    deadTime = new Date("2026-08-01T13:00:02.000Z");
    expect(
      await deadService.processNext(deadWorker, {
        workerId: "dead-worker",
        retryDelayMs: 1_000,
      }),
    ).toMatchObject({ status: "dead_letter" });
  }, 30_000);

  test("requires a human member for model-derived confirmation and preserves correction history", async () => {
    const fixture = await createCase("human-review");
    const adapter = new DeterministicObjectStorageAdapter();
    const provider = new FixtureDocumentProvider({ modelDerived: true });
    const body = new TextEncoder().encode("%PDF-1.4\nreview fixture\n%%EOF");
    const processed = await intakeAndProcess({
      fixture,
      adapter,
      provider,
      body,
      filename: "review.pdf",
      mimeType: "application/pdf",
      document: fixtureDocument([
        {
          pageNumber: 3,
          segment: "policy-region",
          text: "Carrier notice",
          kind: "line",
          region: { x: 0.1, y: 0.2, width: 0.4, height: 0.05 },
        },
        {
          pageNumber: 3,
          segment: "policy-value",
          text: "Policy: COA-100",
          kind: "line",
          region: { x: 0.1, y: 0.28, width: 0.4, height: 0.05 },
        },
      ], 3),
    });
    expect(processed.result).toMatchObject({ status: "succeeded" });
    const fields = await database
      .select()
      .from(schema.extractedFields)
      .where(
        and(
          eq(schema.extractedFields.organizationId, fixture.organizationId),
          eq(schema.extractedFields.fieldKey, "policy"),
        ),
      );
    expect(fields[0]).toMatchObject({ value: "COA-100", modelDerived: true });
    await expect(
      processed.service.reviewCandidate(workerContext(fixture.organizationId), {
        extractedFieldId: fields[0].id,
        action: "confirmed",
      }),
    ).rejects.toBeInstanceOf(AuthorizationDeniedError);
    const confirmed = await processed.service.reviewCandidate(fixture.context, {
      extractedFieldId: fields[0].id,
      action: "confirmed",
      note: "Checked against the source page.",
    });
    expect(confirmed).toMatchObject({ action: "confirmed", versionNumber: 1 });
    const corrected = await processed.service.reviewCandidate(fixture.context, {
      extractedFieldId: fields[0].id,
      action: "corrected",
      reviewedValue: "COA-101",
      note: "Human reviewer corrected the final digit visible on page 3.",
    });
    expect(corrected).toMatchObject({ action: "corrected", versionNumber: 2 });
    const facts = await database
      .select()
      .from(schema.documentFacts)
      .where(eq(schema.documentFacts.organizationId, fixture.organizationId))
      .orderBy(schema.documentFacts.versionNumber);
    expect(facts.map((fact) => fact.value)).toEqual(["COA-100", "COA-101"]);
    expect(facts[1].supersedesFactId).toBe(facts[0].id);
    expect(facts[1].sourcePassageId).toBe(fields[0].sourcePassageId);
    await expect(
      database
        .update(schema.extractedFields)
        .set({ value: "silently overwritten" })
        .where(eq(schema.extractedFields.id, fields[0].id)),
    ).rejects.toThrow();
    const unchangedCandidate = await database
      .select({ value: schema.extractedFields.value })
      .from(schema.extractedFields)
      .where(eq(schema.extractedFields.id, fields[0].id));
    expect(unchangedCandidate[0].value).toBe("COA-100");
  }, 30_000);

  test("fails closed for unscanned, unsupported-provider, and cross-tenant intake", async () => {
    const alpha = await createCase("document-alpha");
    const beta = await createCase("document-beta");
    const adapter = new DeterministicObjectStorageAdapter();
    const body = new TextEncoder().encode("plain notice");
    const objectId = await storeCleanDocument(alpha, adapter, {
      body,
      filename: "notice.txt",
      mimeType: "text/plain",
    });
    const provider = new FixtureDocumentProvider();
    provider.register(
      body,
      fixtureDocument([
        { pageNumber: 1, segment: "line-1", text: "Carrier notice", kind: "line" },
      ]),
    );
    const service = new DocumentPipelineService(
      productionDatabase(),
      adapter,
      provider,
    );
    await expect(
      service.intake(beta.context, {
        storageObjectId: objectId,
        caseId: beta.caseId,
        idempotencyKey: "cross-tenant-intake",
      }),
    ).rejects.toBeInstanceOf(DocumentPipelineValidationError);
    const unsupported = new FixtureDocumentProvider();
    const unsupportedService = new DocumentPipelineService(
      productionDatabase(),
      adapter,
      {
        ...unsupported,
        key: "pdf-only",
        version: "1",
        modelDerived: false,
        supports: (mimeType: string) => mimeType === "application/pdf",
        extract: unsupported.extract.bind(unsupported),
      },
    );
    await expect(
      unsupportedService.intake(alpha.context, {
        storageObjectId: objectId,
        caseId: alpha.caseId,
        idempotencyKey: "unsupported-intake",
      }),
    ).rejects.toBeInstanceOf(DocumentPipelineValidationError);
  }, 30_000);
});

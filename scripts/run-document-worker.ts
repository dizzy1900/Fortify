import {
  closeProductionDatabase,
  getProductionDatabase,
} from "@/db/production/client";
import { DocumentPipelineService } from "@/lib/production/document-pipeline-service";
import { LocalSelectableTextProvider } from "@/lib/production/document-providers";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import type { TenantContext } from "@/lib/production/repository";
import { withTenantTransaction } from "@/lib/production/tenant-transaction";
import { requireProductionRuntime } from "@/lib/runtime";

async function main() {
  requireProductionRuntime();
  const organizationId = process.env.FORTIFY_WORKER_ORGANIZATION_ID?.trim();
  const actorSubject = process.env.FORTIFY_WORKER_SUBJECT?.trim();
  const workerId = process.env.FORTIFY_WORKER_ID?.trim();
  if (!organizationId || !actorSubject || !workerId)
    throw new Error(
      "FORTIFY_WORKER_ORGANIZATION_ID, FORTIFY_WORKER_SUBJECT, and FORTIFY_WORKER_ID are required.",
    );
  const context: TenantContext = {
    organizationId,
    actorSubject,
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
  };
  const result = await withTenantTransaction(
    context,
    async (transaction) =>
      new DocumentPipelineService(
        transaction,
        getProductionObjectStorage(),
        new LocalSelectableTextProvider(),
      ).processNext(context, { workerId }),
    getProductionDatabase(),
  );
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "Document worker failed."}\n`,
    );
    process.exitCode = 1;
  })
  .finally(closeProductionDatabase);

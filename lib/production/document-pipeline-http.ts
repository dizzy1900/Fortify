import { getProductionDatabase } from "@/db/production/client";
import { DocumentPipelineService } from "@/lib/production/document-pipeline-service";
import { LocalSelectableTextProvider } from "@/lib/production/document-providers";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";

export function getProductionDocumentPipelineService() {
  const provider = process.env.FORTIFY_DOCUMENT_PROVIDER ?? "local-selectable-text";
  if (provider !== "local-selectable-text")
    throw new Error(
      `Document provider ${provider} is not configured in this deployment. Register a rights-approved provider adapter before enabling it.`,
    );
  return new DocumentPipelineService(
    getProductionDatabase(),
    getProductionObjectStorage(),
    new LocalSelectableTextProvider(),
  );
}

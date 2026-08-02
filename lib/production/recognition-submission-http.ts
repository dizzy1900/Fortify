import { getProductionDatabase } from "@/db/production/client";
import { DeterministicMarketDeliveryProvider } from "@/lib/production/market-delivery";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { RecognitionSubmissionService } from "@/lib/production/recognition-submission-service";

export const getProductionRecognitionSubmissionService = () =>
  new RecognitionSubmissionService(
    getProductionDatabase(),
    getProductionObjectStorage(),
    new DeterministicMarketDeliveryProvider(),
  );

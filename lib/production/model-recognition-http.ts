import { getProductionDatabase } from "@/db/production/client";
import { ModelRecognitionService } from "@/lib/production/model-recognition-service";

export const getProductionModelRecognitionService = () => new ModelRecognitionService(getProductionDatabase());

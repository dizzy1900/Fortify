import { getProductionDatabase } from "@/db/production/client";
import { VerificationService } from "@/lib/production/verification-service";

export const getProductionVerificationService = () => new VerificationService(getProductionDatabase());

import { getProductionDatabase } from "@/db/production/client";
import { getProductionObjectStorage } from "@/lib/production/object-storage-runtime";
import { ProgrammeAnalyticsService } from "@/lib/production/programme-analytics-service";

export const getProductionProgrammeAnalyticsService = () => new ProgrammeAnalyticsService(getProductionDatabase(), getProductionObjectStorage());

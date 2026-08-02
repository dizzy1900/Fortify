import { getProductionDatabase } from "@/db/production/client";
import { ResiliencePlanningService } from "@/lib/production/resilience-planning-service";

export function getProductionResiliencePlanningService() {
  return new ResiliencePlanningService(getProductionDatabase());
}

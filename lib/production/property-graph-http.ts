import { getProductionDatabase } from "@/db/production/client";
import { PropertyGraphService } from "@/lib/production/property-graph-service";

export function getProductionPropertyGraphService() {
  return new PropertyGraphService(getProductionDatabase());
}

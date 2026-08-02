import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPropertyGraphService } from "@/lib/production/property-graph-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(
      await getProductionPropertyGraphService().getWorkspace(
        principal.authorization,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

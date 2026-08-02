import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(
      await getProductionIntegrationService().getWorkspace(principal.authorization),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

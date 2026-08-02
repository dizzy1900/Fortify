import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { connectionId } = await params;
    return Response.json(
      await getProductionIntegrationService().checkHealth(
        principal.authorization,
        connectionId,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

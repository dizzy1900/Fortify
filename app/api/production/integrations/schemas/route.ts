import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(
      await getProductionIntegrationService().createSchemaVersion(
        principal.authorization,
        await request.json(),
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

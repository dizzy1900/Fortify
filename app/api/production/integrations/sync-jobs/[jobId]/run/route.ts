import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { jobId } = await params;
    const body = await request.json();
    return Response.json(
      await getProductionIntegrationService().executeSyncJob(
        principal.authorization,
        { jobId, workerId: body.workerId },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

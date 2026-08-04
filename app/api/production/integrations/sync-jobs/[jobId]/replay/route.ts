import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import type { IntegrationService } from "@/lib/production/integration-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    requireProductionRuntime();
    const { jobId } = await params;
    const body = (await request.json()) as Omit<
      Parameters<IntegrationService["replayDeadLetter"]>[1],
      "jobId"
    >;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionIntegrationService(transaction).replayDeadLetter(
            principal.authorization,
            { ...body, jobId },
          ),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

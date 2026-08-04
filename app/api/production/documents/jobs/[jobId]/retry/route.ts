import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionDocumentPipelineService,
  presentDocumentRetry,
} from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    requireProductionRuntime();
    const { jobId } = await params;
    const body = (await request.json()) as { reason?: string };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentDocumentRetry(
            await getProductionDocumentPipelineService(
              transaction,
            ).retryDeadLetter(principal.authorization, jobId, {
              reason: body.reason ?? "",
            }),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

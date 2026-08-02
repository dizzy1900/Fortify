import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionDocumentPipelineService } from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { jobId } = await params;
    const body = (await request.json()) as { reason?: string };
    return Response.json(
      await getProductionDocumentPipelineService().retryDeadLetter(
        principal.authorization,
        jobId,
        { reason: body.reason ?? "" },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

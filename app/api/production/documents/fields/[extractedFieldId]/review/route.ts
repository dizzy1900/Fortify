import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionDocumentPipelineService } from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ extractedFieldId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { extractedFieldId } = await params;
    const body = (await request.json()) as {
      action?: "confirmed" | "corrected" | "rejected";
      reviewedValue?: string;
      note?: string;
    };
    if (!body.action)
      return Response.json({ error: "A review action is required." }, { status: 400 });
    return Response.json(
      await getProductionDocumentPipelineService().reviewCandidate(
        principal.authorization,
        {
          extractedFieldId,
          action: body.action,
          reviewedValue: body.reviewedValue,
          note: body.note,
        },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

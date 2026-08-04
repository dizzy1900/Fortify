import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionDocumentPipelineService,
  presentDocumentReview,
} from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ extractedFieldId: string }> },
) {
  try {
    requireProductionRuntime();
    const { extractedFieldId } = await params;
    const body = (await request.json()) as {
      action?: "confirmed" | "corrected" | "rejected";
      reviewedValue?: string;
      note?: string;
    };
    if (!body.action)
      return Response.json(
        { error: "A review action is required." },
        { status: 400 },
      );
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentDocumentReview(
            await getProductionDocumentPipelineService(
              transaction,
            ).reviewCandidate(principal.authorization, {
              extractedFieldId,
              action: body.action!,
              reviewedValue: body.reviewedValue,
              note: body.note,
            }),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

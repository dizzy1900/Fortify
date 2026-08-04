import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> },
) {
  try {
    requireProductionRuntime();
    const { category } = await params;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const service = getProductionRecognitionSubmissionService(transaction);
        const body = await request.json();
        let result: unknown;
        if (category === "evidence")
          result = await service.recordEvidenceResponse(
            principal.authorization,
            body,
          );
        else if (category === "model")
          result = await service.recordModelResponse(
            principal.authorization,
            body,
          );
        else if (category === "rating")
          result = await service.recordRatingResponse(
            principal.authorization,
            body,
          );
        else if (category === "underwriting")
          result = await service.recordUnderwritingResponse(
            principal.authorization,
            body,
          );
        else if (category === "placement")
          result = await service.recordPlacementResponse(
            principal.authorization,
            body,
          );
        else if (category === "funding")
          result = await service.recordFundingResponse(
            principal.authorization,
            body,
          );
        else
          return Response.json(
            { error: "Unknown recognition response category." },
            { status: 404 },
          );
        return Response.json(result, { status: 201 });
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

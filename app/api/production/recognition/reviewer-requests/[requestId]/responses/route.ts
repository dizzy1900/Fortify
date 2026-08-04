import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    requireProductionRuntime();
    const { requestId } = await params;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionRecognitionSubmissionService(
            transaction,
          ).respondToRequest(principal.authorization, {
            ...(await request.json()),
            reviewerRequestId: requestId,
          }),
          { status: 201 },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

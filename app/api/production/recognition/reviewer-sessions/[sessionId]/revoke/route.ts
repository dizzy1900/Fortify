import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    requireProductionRuntime();
    const { sessionId } = await params;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionRecognitionSubmissionService(
            transaction,
          ).revokeReviewerSession(
            principal.authorization,
            sessionId,
            await request.json(),
          ),
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionRecognitionSubmissionService } from "@/lib/production/recognition-submission-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const body = await request.json();
        if (!body.idempotencyKey)
          return Response.json(
            { error: "idempotencyKey is required." },
            { status: 400 },
          );
        const service = getProductionRecognitionSubmissionService(transaction);
        return Response.json(
          await service.deliverSubmission(
            principal.authorization,
            body.idempotencyKey,
            body,
          ),
          { status: 201 },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

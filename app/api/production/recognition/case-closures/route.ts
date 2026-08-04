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
      async (principal, transaction) =>
        Response.json(
          await getProductionRecognitionSubmissionService(
            transaction,
          ).closeRecognitionCase(principal.authorization, await request.json()),
          { status: 201 },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

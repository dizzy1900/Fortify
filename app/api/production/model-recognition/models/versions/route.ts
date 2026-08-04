import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionModelRecognitionService } from "@/lib/production/model-recognition-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const service = getProductionModelRecognitionService(transaction);
        return Response.json(
          await service.createModelVersion(
            principal.authorization,
            (await request.json()) as Parameters<
              typeof service.createModelVersion
            >[1],
          ),
          { status: 201 },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

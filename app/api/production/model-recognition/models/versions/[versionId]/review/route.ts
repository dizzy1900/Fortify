import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionModelRecognitionService } from "@/lib/production/model-recognition-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const service = getProductionModelRecognitionService(transaction);
        const { versionId } = await params;
        const body = (await request.json()) as Omit<
          Parameters<typeof service.reviewModelVersion>[1],
          "modelVersionId"
        >;
        return Response.json(
          await service.reviewModelVersion(principal.authorization, {
            ...body,
            modelVersionId: versionId,
          }),
          { status: 201 },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

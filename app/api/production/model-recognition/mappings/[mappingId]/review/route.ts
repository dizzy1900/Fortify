import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionModelRecognitionService } from "@/lib/production/model-recognition-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mappingId: string }> },
) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const service = getProductionModelRecognitionService(transaction);
        const { mappingId } = await params;
        const body = (await request.json()) as Omit<
          Parameters<typeof service.reviewMapping>[1],
          "mappingId"
        >;
        return Response.json(
          await service.reviewMapping(principal.authorization, {
            ...body,
            mappingId,
          }),
          { status: 201 },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

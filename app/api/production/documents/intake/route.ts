import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionDocumentPipelineService,
  presentDocumentIntake,
} from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as {
      storageObjectId?: string;
      caseId?: string;
      sourceSystem?: string;
      supersedesSourceDocumentId?: string;
      idempotencyKey?: string;
      maxAttempts?: number;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentDocumentIntake(
            await getProductionDocumentPipelineService(transaction).intake(
              principal.authorization,
              {
                storageObjectId: body.storageObjectId ?? "",
                caseId: body.caseId,
                sourceSystem: body.sourceSystem,
                supersedesSourceDocumentId: body.supersedesSourceDocumentId,
                idempotencyKey: body.idempotencyKey ?? "",
                maxAttempts: body.maxAttempts,
              },
            ),
          ),
          {
            status: 202,
            headers: { "Cache-Control": "no-store" },
          },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

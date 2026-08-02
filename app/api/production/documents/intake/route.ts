import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionDocumentPipelineService } from "@/lib/production/document-pipeline-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as {
      storageObjectId?: string;
      caseId?: string;
      sourceSystem?: string;
      supersedesSourceDocumentId?: string;
      idempotencyKey?: string;
      maxAttempts?: number;
    };
    return Response.json(
      await getProductionDocumentPipelineService().intake(
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
      { status: 202 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

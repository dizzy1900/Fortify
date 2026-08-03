import { NextRequest } from "next/server";
import type { CreateEvidenceRequestInput } from "@/lib/production/brokerage-case-service";
import { getProductionBrokerageCaseService } from "@/lib/production/brokerage-case-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const body = (await request.json()) as CreateEvidenceRequestInput & {
          idempotencyKey?: string;
        };
        if (!body.idempotencyKey)
          return Response.json(
            { error: "idempotencyKey is required." },
            { status: 400 },
          );
        return Response.json(
          await getProductionBrokerageCaseService(
            transaction,
          ).createEvidenceRequest(
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

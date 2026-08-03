import { NextRequest } from "next/server";
import { getProductionBrokerageCaseService } from "@/lib/production/brokerage-case-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const { requestId } = await params;
        const body = (await request.json()) as {
          expiresAt?: string;
          humanConfirmation?: boolean;
        };
        if (!body.expiresAt)
          return Response.json(
            { error: "expiresAt is required." },
            { status: 400 },
          );
        return Response.json(
          await getProductionBrokerageCaseService(
            transaction,
          ).issueEvidenceRequest(principal.authorization, requestId, {
            expiresAt: body.expiresAt,
            humanConfirmation: body.humanConfirmation === true,
          }),
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

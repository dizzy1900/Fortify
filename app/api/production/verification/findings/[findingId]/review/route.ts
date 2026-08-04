import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionVerificationService } from "@/lib/production/verification-http";
import type { VerificationService } from "@/lib/production/verification-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ findingId: string }> },
) {
  try {
    requireProductionRuntime();
    const { findingId } = await params;
    const body = (await request.json()) as Omit<
      Parameters<VerificationService["reviewFinding"]>[1],
      "findingId"
    >;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionVerificationService(transaction).reviewFinding(
            principal.authorization,
            { ...body, findingId },
          ),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

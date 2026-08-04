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
  { params }: { params: Promise<{ certificateId: string }> },
) {
  try {
    requireProductionRuntime();
    const { certificateId } = await params;
    const body = (await request.json()) as Omit<
      Parameters<VerificationService["recordCertificateEvent"]>[1],
      "certificateId"
    >;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionVerificationService(
            transaction,
          ).recordCertificateEvent(principal.authorization, {
            ...body,
            certificateId,
          }),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

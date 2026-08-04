import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionVerificationService,
  presentVerificationAssignmentWorkspace,
} from "@/lib/production/verification-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    requireProductionRuntime();
    const { assignmentId } = await params;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentVerificationAssignmentWorkspace(
            await getProductionVerificationService(
              transaction,
            ).getAssignmentWorkspace(principal.authorization, assignmentId),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

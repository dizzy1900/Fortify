import { NextRequest } from "next/server";
import type { AccessAssignmentInput } from "@/lib/production/access-control-service";
import { getProductionAccessControlService } from "@/lib/production/access-control-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const input = (await request.json()) as AccessAssignmentInput;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionAccessControlService(transaction).createAssignment(
            principal.authorization,
            input,
          ),
          { status: 201 },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

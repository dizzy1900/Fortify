import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionFundingProjectService,
  presentFundingProjectScopedWorkspace,
} from "@/lib/production/funding-project-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    requireProductionRuntime();
    const { projectId } = await params;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentFundingProjectScopedWorkspace(
            await getProductionFundingProjectService(
              transaction,
            ).getProjectWorkspace(principal.authorization, projectId),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

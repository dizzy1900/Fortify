import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionResiliencePlanningService } from "@/lib/production/resilience-planning-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    requireProductionRuntime();
    const { versionId } = await params;
    const body = (await request.json()) as {
      decision: "approved" | "changes_requested";
      note: string;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionResiliencePlanningService(
            transaction,
          ).reviewInterventionVersion(principal.authorization, {
            interventionVersionId: versionId,
            ...body,
          }),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

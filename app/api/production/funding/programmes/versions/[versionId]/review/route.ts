import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
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
      sourceAndRulesChecked: boolean;
      note: string;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionFundingProjectService(
            transaction,
          ).reviewProgrammeVersion(principal.authorization, {
            programmeVersionId: versionId,
            ...body,
          }),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

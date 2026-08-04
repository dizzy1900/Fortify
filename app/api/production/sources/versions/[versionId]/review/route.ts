import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    requireProductionRuntime();
    const { versionId } = await params;
    const body = (await request.json()) as {
      decision?: "approved" | "changes_requested";
      note?: string;
      sourceCompared?: boolean;
      rightsConfirmed?: boolean;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        if (!body.decision)
          return Response.json(
            { error: "A review decision is required." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        return Response.json(
          await getProductionGovernedSourceService(transaction).reviewVersion(
            principal.authorization,
            {
              sourceVersionId: versionId,
              decision: body.decision,
              note: body.note ?? "",
              sourceCompared: body.sourceCompared ?? false,
              rightsConfirmed: body.rightsConfirmed ?? false,
            },
          ),
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

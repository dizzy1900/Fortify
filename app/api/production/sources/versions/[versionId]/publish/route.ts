import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionGovernedSourceService,
  presentGovernedSourcePublication,
} from "@/lib/production/governed-source-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    requireProductionRuntime();
    const { versionId } = await params;
    const body = (await request.json()) as {
      decision?: "published" | "rejected";
      note?: string;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        if (!body.decision)
          return Response.json(
            { error: "A publication decision is required." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        return Response.json(
          presentGovernedSourcePublication(
            await getProductionGovernedSourceService(
              transaction,
            ).publishVersion(principal.authorization, {
              sourceVersionId: versionId,
              decision: body.decision,
              note: body.note ?? "",
            }),
          ),
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

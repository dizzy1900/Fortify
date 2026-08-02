import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { versionId } = await params;
    const body = (await request.json()) as {
      decision?: "published" | "rejected";
      note?: string;
    };
    if (!body.decision)
      return Response.json(
        { error: "A publication decision is required." },
        { status: 400 },
      );
    return Response.json(
      await getProductionGovernedSourceService().publishVersion(
        principal.authorization,
        {
          sourceVersionId: versionId,
          decision: body.decision,
          note: body.note ?? "",
        },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

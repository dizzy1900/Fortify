import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionMarketPlaybookService } from "@/lib/production/market-playbook-http";
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
      decision?: "approved" | "changes_requested";
      note?: string;
    };
    if (!body.decision)
      return Response.json({ error: "A review decision is required." }, { status: 400 });
    return Response.json(
      await getProductionMarketPlaybookService().reviewVersion(
        principal.authorization,
        { versionId, decision: body.decision, note: body.note ?? "" },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

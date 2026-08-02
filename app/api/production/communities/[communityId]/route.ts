import { NextRequest } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { TenantRepository } from "@/lib/production/repository";
import { requireProductionRuntime } from "@/lib/runtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { communityId } = await params;
    const body = (await request.json()) as {
      summary?: unknown;
      expectedRevision?: unknown;
    };
    if (
      typeof body.summary !== "string" ||
      !Number.isInteger(body.expectedRevision)
    )
      return Response.json(
        { error: "summary and integer expectedRevision are required." },
        { status: 400 },
      );
    const repository = new TenantRepository(getProductionDatabase());
    return Response.json(
      await repository.updateCommunitySummary(
        principal.authorization,
        communityId,
        body.expectedRevision as number,
        body.summary,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

import { NextRequest } from "next/server";
import {
  getProductionTenantRepository,
  presentCommunitySummary,
} from "@/lib/production/community-http";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ communityId: string }> },
) {
  try {
    requireProductionRuntime();
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
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentCommunitySummary(
            await getProductionTenantRepository(
              transaction,
            ).updateCommunitySummary(
              principal.authorization,
              communityId,
              body.expectedRevision as number,
              body.summary as string,
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

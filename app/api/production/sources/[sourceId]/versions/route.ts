import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import type { CreateGovernedSourceVersionInput } from "@/lib/production/governed-source-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    requireProductionRuntime();
    const { sourceId } = await params;
    const body = (await request.json()) as Omit<
      CreateGovernedSourceVersionInput,
      "sourceId"
    >;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionGovernedSourceService(transaction).createVersion(
            principal.authorization,
            { ...body, sourceId },
          ),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

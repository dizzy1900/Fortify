import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionFundingProjectService } from "@/lib/production/funding-project-http";
import type { CreateFundingProgrammeVersionInput } from "@/lib/production/funding-project-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as CreateFundingProgrammeVersionInput;
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionFundingProjectService(
            transaction,
          ).createProgrammeVersion(principal.authorization, body),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

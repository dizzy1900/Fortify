import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionProgrammeAnalyticsService } from "@/lib/production/programme-analytics-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionProgrammeAnalyticsService(
            transaction,
          ).recordWorkflowBaseline(
            principal.authorization,
            await request.json(),
          ),
          { status: 201 },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

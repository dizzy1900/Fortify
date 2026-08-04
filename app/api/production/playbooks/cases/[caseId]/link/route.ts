import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionMarketPlaybookService } from "@/lib/production/market-playbook-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    requireProductionRuntime();
    const { caseId } = await params;
    const body = (await request.json()) as {
      marketId?: string;
      programId?: string;
      policyForm?: string;
    };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionMarketPlaybookService(transaction).linkCase(
            principal.authorization,
            {
              caseId,
              marketId: body.marketId ?? "",
              programId: body.programId,
              policyForm: body.policyForm,
            },
          ),
          { status: 201, headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

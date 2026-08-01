import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionMarketPlaybookService } from "@/lib/production/market-playbook-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { caseId } = await params;
    const body = (await request.json()) as {
      marketId?: string;
      programId?: string;
      policyForm?: string;
    };
    return Response.json(
      await getProductionMarketPlaybookService().evaluateCase(
        principal.authorization,
        {
          caseId,
          marketId: body.marketId ?? "",
          programId: body.programId,
          policyForm: body.policyForm,
        },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

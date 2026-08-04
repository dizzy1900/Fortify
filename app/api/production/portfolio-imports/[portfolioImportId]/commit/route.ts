import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionPortfolioImportService,
  presentPortfolioImportResult,
} from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioImportId: string }> },
) {
  try {
    requireProductionRuntime();
    const { portfolioImportId } = await params;
    const body = (await request.json()) as { confirmAcceptedRows?: boolean };
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPortfolioImportResult(
            await getProductionPortfolioImportService(transaction).commit(
              principal.authorization,
              portfolioImportId,
              { confirmAcceptedRows: body.confirmAcceptedRows === true },
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

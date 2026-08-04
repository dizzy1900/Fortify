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
    const body = (await request.json()) as { reason?: string };
    if (!body.reason)
      return Response.json(
        { error: "A rollback reason is required." },
        { status: 400 },
      );
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPortfolioImportResult(
            await getProductionPortfolioImportService(transaction).rollback(
              principal.authorization,
              portfolioImportId,
              body.reason!,
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

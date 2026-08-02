import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPortfolioImportService } from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioImportId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { portfolioImportId } = await params;
    return Response.json(
      await getProductionPortfolioImportService().getImport(
        principal.authorization,
        portfolioImportId,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

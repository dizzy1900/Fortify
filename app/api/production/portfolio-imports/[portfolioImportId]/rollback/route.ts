import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPortfolioImportService } from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portfolioImportId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { portfolioImportId } = await params;
    const body = (await request.json()) as { reason?: string };
    if (!body.reason)
      return Response.json(
        { error: "A rollback reason is required." },
        { status: 400 },
      );
    return Response.json(
      await getProductionPortfolioImportService().rollback(
        principal.authorization,
        portfolioImportId,
        body.reason,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

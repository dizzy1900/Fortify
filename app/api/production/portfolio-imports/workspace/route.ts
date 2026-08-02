import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPortfolioImportService } from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(
      await getProductionPortfolioImportService().getWorkspace(
        principal.authorization,
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

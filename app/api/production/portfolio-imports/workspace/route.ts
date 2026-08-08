import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionPortfolioImportWorkspaceQuery,
  presentPortfolioImportWorkspace,
} from "@/lib/production/portfolio-import-http";
import { portfolioImportWorkspaceQuery } from "@/lib/production/contexts/portfolio-import/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPortfolioImportWorkspace(
            await getProductionPortfolioImportWorkspaceQuery(
              transaction,
            ).execute(portfolioImportWorkspaceQuery(principal.authorization)),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

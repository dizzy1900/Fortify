import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionPortfolioImportService,
  presentPortfolioImportSuggestion,
} from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as {
      storageObjectId?: string;
      sourceSystem?: string;
      headerRow?: number;
      sheetName?: string;
    };
    if (!body.storageObjectId || !body.sourceSystem)
      return Response.json(
        { error: "storageObjectId and sourceSystem are required." },
        { status: 400 },
      );
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPortfolioImportSuggestion(
            await getProductionPortfolioImportService(
              transaction,
            ).suggestMappingFromStorage(principal.authorization, {
              storageObjectId: body.storageObjectId!,
              sourceSystem: body.sourceSystem!,
              headerRow: body.headerRow,
              sheetName: body.sheetName,
            }),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

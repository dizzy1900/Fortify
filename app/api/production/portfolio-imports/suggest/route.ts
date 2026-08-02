import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPortfolioImportService } from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
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
    return Response.json(
      await getProductionPortfolioImportService().suggestMappingFromStorage(
        principal.authorization,
        {
          storageObjectId: body.storageObjectId,
          sourceSystem: body.sourceSystem,
          headerRow: body.headerRow,
          sheetName: body.sheetName,
        },
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

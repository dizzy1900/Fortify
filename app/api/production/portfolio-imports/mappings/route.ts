import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import type {
  ImportColumnMapping,
  ImportConstants,
} from "@/lib/production/import-adapters";
import { getProductionPortfolioImportService } from "@/lib/production/portfolio-import-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as {
      name?: string;
      sourceSystem?: string;
      fileFormat?: "csv" | "xlsx";
      sheetName?: string;
      headerRow?: number;
      columnMapping?: ImportColumnMapping;
      constants?: ImportConstants;
    };
    if (
      !body.name ||
      !body.sourceSystem ||
      !body.fileFormat ||
      !body.columnMapping
    )
      return Response.json(
        {
          error:
            "name, sourceSystem, fileFormat, and columnMapping are required.",
        },
        { status: 400 },
      );
    const saved = await getProductionPortfolioImportService().saveMapping(
      principal.authorization,
      {
        name: body.name,
        sourceSystem: body.sourceSystem,
        fileFormat: body.fileFormat,
        sheetName: body.sheetName,
        headerRow: body.headerRow,
        columnMapping: body.columnMapping,
        constants: body.constants,
      },
    );
    return Response.json(saved, { status: saved.replayed ? 200 : 201 });
  } catch (error) {
    return authenticationFailure(error);
  }
}

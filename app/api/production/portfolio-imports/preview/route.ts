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
      bookId?: string;
      storageObjectId?: string;
      mappingVersionId?: string;
      sourceSystem?: string;
      idempotencyKey?: string;
    };
    if (
      !body.bookId ||
      !body.storageObjectId ||
      !body.mappingVersionId ||
      !body.sourceSystem ||
      !body.idempotencyKey
    )
      return Response.json(
        {
          error:
            "bookId, storageObjectId, mappingVersionId, sourceSystem, and idempotencyKey are required.",
        },
        { status: 400 },
      );
    return Response.json(
      await getProductionPortfolioImportService().preview(
        principal.authorization,
        {
          bookId: body.bookId,
          storageObjectId: body.storageObjectId,
          mappingVersionId: body.mappingVersionId,
          sourceSystem: body.sourceSystem,
          idempotencyKey: body.idempotencyKey,
        },
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

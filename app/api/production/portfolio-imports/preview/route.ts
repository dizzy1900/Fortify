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

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
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
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentPortfolioImportResult(
            await getProductionPortfolioImportService(transaction).preview(
              principal.authorization,
              {
                bookId: body.bookId!,
                storageObjectId: body.storageObjectId!,
                mappingVersionId: body.mappingVersionId!,
                sourceSystem: body.sourceSystem!,
                idempotencyKey: body.idempotencyKey!,
              },
            ),
          ),
          {
            status: 201,
            headers: { "Cache-Control": "no-store" },
          },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

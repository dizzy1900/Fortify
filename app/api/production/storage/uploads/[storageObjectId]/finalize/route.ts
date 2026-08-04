import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionStorageService,
  presentFinalizedUpload,
} from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storageObjectId: string }> },
) {
  try {
    requireProductionRuntime();
    const { storageObjectId } = await params;
    const body = (await request.json()) as { grantId?: string };
    const { grantId } = body;
    if (!grantId)
      return Response.json({ error: "grantId is required." }, { status: 400 });
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentFinalizedUpload(
            await getProductionStorageService(transaction).finalizeUpload(
              principal.authorization,
              storageObjectId,
              grantId,
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

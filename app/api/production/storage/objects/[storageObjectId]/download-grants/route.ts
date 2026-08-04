import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storageObjectId: string }> },
) {
  try {
    requireProductionRuntime();
    const { storageObjectId } = await params;
    const body = (await request.json()) as { purpose?: string };
    const purpose = body.purpose?.trim();
    if (!purpose)
      return Response.json({ error: "purpose is required." }, { status: 400 });
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionStorageService(transaction).issueDownloadGrant(
            principal.authorization,
            storageObjectId,
            { purpose },
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

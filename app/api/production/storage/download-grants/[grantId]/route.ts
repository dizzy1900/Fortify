import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> },
) {
  try {
    requireProductionRuntime();
    const { grantId } = await params;
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim();
    if (!reason)
      return Response.json({ error: "reason is required." }, { status: 400 });
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        await getProductionStorageService(transaction).revokeGrant(
          principal.authorization,
          grantId,
          reason,
        );
        return Response.json(
          { revoked: true },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

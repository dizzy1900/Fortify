import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { grantId } = await params;
    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim())
      return Response.json({ error: "reason is required." }, { status: 400 });
    await getProductionStorageService().revokeGrant(
      principal.authorization,
      grantId,
      body.reason,
    );
    return Response.json({ revoked: true });
  } catch (error) {
    return authenticationFailure(error);
  }
}

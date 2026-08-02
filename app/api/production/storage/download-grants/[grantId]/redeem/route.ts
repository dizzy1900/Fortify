import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { grantId } = await params;
    return Response.json(
      await getProductionStorageService().redeemDownloadGrant(
        principal.authorization,
        grantId,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

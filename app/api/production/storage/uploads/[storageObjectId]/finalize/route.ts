import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storageObjectId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { storageObjectId } = await params;
    const body = (await request.json()) as { grantId?: string };
    if (!body.grantId)
      return Response.json({ error: "grantId is required." }, { status: 400 });
    return Response.json(
      await getProductionStorageService().finalizeUpload(
        principal.authorization,
        storageObjectId,
        body.grantId,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

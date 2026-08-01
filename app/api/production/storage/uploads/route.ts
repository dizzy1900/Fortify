import { NextRequest } from "next/server";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { getProductionStorageService } from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as {
      filename?: string;
      mimeType?: string;
      sizeBytes?: number;
      sha256?: string;
      retentionUntil?: string;
    };
    if (
      !body.filename ||
      !body.mimeType ||
      !body.sizeBytes ||
      !body.sha256
    )
      return Response.json(
        { error: "filename, mimeType, sizeBytes, and sha256 are required." },
        { status: 400 },
      );
    const upload = await getProductionStorageService().requestUpload(
      principal.authorization,
      {
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        sha256: body.sha256,
        retentionUntil: body.retentionUntil,
      },
    );
    return Response.json(upload, { status: 201 });
  } catch (error) {
    return authenticationFailure(error);
  }
}

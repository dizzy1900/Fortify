import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionStorageService,
  presentRequestedUpload,
} from "@/lib/production/storage-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const body = (await request.json()) as {
      filename?: string;
      mimeType?: string;
      sizeBytes?: number;
      sha256?: string;
      retentionUntil?: string;
    };
    const { filename, mimeType, sizeBytes, sha256, retentionUntil } = body;
    if (!filename || !mimeType || !sizeBytes || !sha256)
      return Response.json(
        { error: "filename, mimeType, sizeBytes, and sha256 are required." },
        { status: 400 },
      );
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const upload = await getProductionStorageService(
          transaction,
        ).requestUpload(principal.authorization, {
          filename,
          mimeType,
          sizeBytes,
          sha256,
          retentionUntil,
        });
        return Response.json(presentRequestedUpload(upload), {
          status: 201,
          headers: { "Cache-Control": "no-store" },
        });
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

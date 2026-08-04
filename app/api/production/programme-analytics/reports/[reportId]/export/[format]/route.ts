import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionProgrammeAnalyticsService } from "@/lib/production/programme-analytics-http";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; format: string }> },
) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) => {
        const { reportId, format } = await params;
        if (format !== "json" && format !== "csv")
          return Response.json(
            { error: "Unsupported report format." },
            { status: 400 },
          );
        const artifact = await getProductionProgrammeAnalyticsService(
          transaction,
        ).readReportArtifact(principal.authorization, reportId, format);
        return new Response(Buffer.from(artifact.body), {
          headers: {
            "Content-Type": artifact.mimeType,
            "Content-Disposition": `attachment; filename="${artifact.filename}"`,
            "X-Content-SHA256": artifact.sha256,
            "Cache-Control": "private, no-store",
          },
        });
      },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

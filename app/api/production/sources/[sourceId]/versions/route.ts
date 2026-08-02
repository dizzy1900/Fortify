import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import type { CreateGovernedSourceVersionInput } from "@/lib/production/governed-source-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { sourceId } = await params;
    const body = (await request.json()) as Omit<
      CreateGovernedSourceVersionInput,
      "sourceId"
    >;
    return Response.json(
      await getProductionGovernedSourceService().createVersion(
        principal.authorization,
        { ...body, sourceId },
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

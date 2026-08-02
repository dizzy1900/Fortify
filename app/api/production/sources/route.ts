import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionGovernedSourceService } from "@/lib/production/governed-source-http";
import type { CreateGovernedSourceInput } from "@/lib/production/governed-source-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as CreateGovernedSourceInput;
    return Response.json(
      await getProductionGovernedSourceService().createSource(
        principal.authorization,
        body,
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

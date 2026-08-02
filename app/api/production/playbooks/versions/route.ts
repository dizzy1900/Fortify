import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionMarketPlaybookService } from "@/lib/production/market-playbook-http";
import type { CreatePlaybookVersionInput } from "@/lib/production/market-playbook-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const body = (await request.json()) as CreatePlaybookVersionInput;
    return Response.json(
      await getProductionMarketPlaybookService().createVersion(
        principal.authorization,
        body,
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

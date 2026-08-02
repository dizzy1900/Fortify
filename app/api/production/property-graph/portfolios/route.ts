import { NextRequest } from "next/server";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { getProductionPropertyGraphService } from "@/lib/production/property-graph-http";
import type { PropertyGraphRegistration } from "@/lib/production/property-graph-service";
import { parsePropertyGraphRegistration } from "@/lib/production/property-graph-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const body: PropertyGraphRegistration = parsePropertyGraphRegistration(
      await request.json(),
    );
    return Response.json(
      await getProductionPropertyGraphService().register(
        principal.authorization,
        idempotencyKey,
        body,
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

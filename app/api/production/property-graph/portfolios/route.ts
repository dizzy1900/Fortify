import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import { getProductionPropertyGraphService } from "@/lib/production/property-graph-http";
import type { PropertyGraphRegistration } from "@/lib/production/property-graph-service";
import {
  parsePropertyGraphRegistration,
  propertyGraphRegisterCommand,
} from "@/lib/production/property-graph-service";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const body: PropertyGraphRegistration = parsePropertyGraphRegistration(
      await request.json(),
    );
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          await getProductionPropertyGraphService(transaction).register(
            propertyGraphRegisterCommand(
              principal.authorization,
              idempotencyKey,
              body,
            ),
          ),
          {
            status: 201,
            headers: { "Cache-Control": "no-store" },
          },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

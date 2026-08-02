import { NextRequest } from "next/server";
import { getProductionBrokerageCaseService } from "@/lib/production/brokerage-case-http";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    return Response.json(
      await getProductionBrokerageCaseService().getWorkspace(
        principal.authorization,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

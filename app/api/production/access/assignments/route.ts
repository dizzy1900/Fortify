import { NextRequest } from "next/server";
import type { AccessAssignmentInput } from "@/lib/production/access-control-service";
import { getProductionAccessControlService } from "@/lib/production/access-control-http";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const input = (await request.json()) as AccessAssignmentInput;
    return Response.json(
      await getProductionAccessControlService().createAssignment(
        principal.authorization,
        input,
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

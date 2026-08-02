import { NextRequest } from "next/server";
import type { AssignmentScope } from "@/lib/production/access-control-service";
import { getProductionAccessControlService } from "@/lib/production/access-control-http";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { assignmentId } = await params;
    const body = (await request.json()) as {
      scopeType: AssignmentScope;
      reason: string;
    };
    return Response.json(
      await getProductionAccessControlService().revokeAssignment(
        principal.authorization,
        body.scopeType,
        assignmentId,
        body.reason,
      ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

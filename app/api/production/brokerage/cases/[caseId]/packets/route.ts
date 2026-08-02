import { NextRequest } from "next/server";
import { getProductionBrokerageCaseService } from "@/lib/production/brokerage-case-http";
import {
  authenticationFailure,
  resolveRequestPrincipal,
} from "@/lib/production/http-auth";
import { requireProductionRuntime } from "@/lib/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> },
) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const { caseId } = await params;
    const body = (await request.json()) as {
      purpose?: string;
      letter?: string;
      humanConfirmation?: boolean;
      idempotencyKey?: string;
    };
    if (!body.idempotencyKey || !body.purpose || !body.letter)
      return Response.json(
        { error: "idempotencyKey, purpose, and letter are required." },
        { status: 400 },
      );
    return Response.json(
      await getProductionBrokerageCaseService().generatePacket(
        principal.authorization,
        body.idempotencyKey,
        {
          caseId,
          purpose: body.purpose,
          letter: body.letter,
          humanConfirmation: body.humanConfirmation === true,
        },
      ),
      { status: 201 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

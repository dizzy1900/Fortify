import { NextRequest } from "next/server";
import { authenticationFailure } from "@/lib/production/http-auth";
import { getProductionIntegrationService } from "@/lib/production/integration-http";
import { requireProductionRuntime } from "@/lib/runtime";
import { getProductionDatabase } from "@/db/production/client";
import { consumeRequestRateLimit } from "@/lib/production/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointKey: string }> },
) {
  try {
    requireProductionRuntime();
    await consumeRequestRateLimit(getProductionDatabase(), request, {
      scope: "integration-webhook",
      limit: 300,
      windowSeconds: 60,
    });
    const { endpointKey } = await params;
    const body = new Uint8Array(await request.arrayBuffer());
    return Response.json(
      await getProductionIntegrationService().receiveWebhook({
        endpointKey,
        externalEventId: request.headers.get("x-fortify-event-id") ?? "",
        eventType: request.headers.get("x-fortify-event-type") ?? "",
        timestamp: request.headers.get("x-fortify-timestamp") ?? "",
        signature: request.headers.get("x-fortify-signature") ?? "",
        body,
      }),
      { status: 202 },
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

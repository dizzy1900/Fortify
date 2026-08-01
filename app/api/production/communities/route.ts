import { NextRequest } from "next/server";
import { getProductionDatabase } from "@/db/production/client";
import { authenticationFailure, resolveRequestPrincipal } from "@/lib/production/http-auth";
import { TenantRepository } from "@/lib/production/repository";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    const principal = await resolveRequestPrincipal(request);
    const repository = new TenantRepository(getProductionDatabase());
    return Response.json(
      await repository.listCommunities(principal.authorization),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

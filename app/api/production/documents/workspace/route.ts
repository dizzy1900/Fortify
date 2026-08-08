import { NextRequest } from "next/server";
import {
  authenticationFailure,
  withAuthenticatedTenantRequest,
} from "@/lib/production/http-auth";
import {
  getProductionDocumentWorkspaceQuery,
  presentDocumentWorkspace,
} from "@/lib/production/document-pipeline-http";
import { documentWorkspaceQuery } from "@/lib/production/contexts/document-intelligence/workspace-query";
import { requireProductionRuntime } from "@/lib/runtime";

export async function GET(request: NextRequest) {
  try {
    requireProductionRuntime();
    return await withAuthenticatedTenantRequest(
      request,
      async (principal, transaction) =>
        Response.json(
          presentDocumentWorkspace(
            await getProductionDocumentWorkspaceQuery(transaction).execute(
              documentWorkspaceQuery(principal.authorization),
            ),
          ),
          { headers: { "Cache-Control": "no-store" } },
        ),
    );
  } catch (error) {
    return authenticationFailure(error);
  }
}

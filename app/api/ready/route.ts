import { checkProductionDatabase } from "@/db/production/client";
import {
  inspectProductionEnvironment,
  validateProductionEnvironment,
} from "@/lib/production/environment";
import { getRuntimeMode } from "@/lib/runtime";

export async function GET() {
  const mode = getRuntimeMode();
  if (mode === "sandbox")
    return Response.json({ ok: true, mode, check: "readiness" });
  try {
    validateProductionEnvironment();
    await checkProductionDatabase();
    return Response.json({ ok: true, mode, check: "readiness" });
  } catch {
    return Response.json(
      {
        ok: false,
        mode,
        check: "readiness",
        environment: inspectProductionEnvironment(),
      },
      { status: 503 },
    );
  }
}

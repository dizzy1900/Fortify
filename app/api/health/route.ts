import { getRuntimeMode } from "@/lib/runtime";

export function GET() {
  return Response.json({
    status: "healthy",
    mode: getRuntimeMode(),
    check: "liveness",
  });
}

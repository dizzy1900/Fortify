import { getRuntimeMode } from "./runtime";

export function sandboxRouteGuard() {
  if (getRuntimeMode() === "sandbox") return null;
  return Response.json(
    { error: "The deterministic demo route is not available in production." },
    { status: 404 },
  );
}

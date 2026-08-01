import { sandboxRouteGuard } from "@/lib/http-runtime";
import { resetState } from "@/lib/repository";
export async function POST() { const unavailable = sandboxRouteGuard(); if (unavailable) return unavailable; return Response.json(await resetState()); }

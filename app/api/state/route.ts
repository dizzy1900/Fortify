import type { DemoAction } from "@/lib/domain";
import { sandboxRouteGuard } from "@/lib/http-runtime";
import { applyAction, getState } from "@/lib/repository";

export const dynamic = "force-dynamic";
export async function GET() { const unavailable = sandboxRouteGuard(); if (unavailable) return unavailable; return Response.json(await getState(), { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: Request) { const unavailable = sandboxRouteGuard(); if (unavailable) return unavailable; try { return Response.json(await applyAction(await request.json() as DemoAction)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 }); } }

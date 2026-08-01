import { getState } from "@/lib/repository";
export async function GET() { try { const state = await getState(); return Response.json({ status: "healthy", seedVersion: state.seedVersion, offline: true }); } catch { return Response.json({ status: "unhealthy" }, { status: 503 }); } }

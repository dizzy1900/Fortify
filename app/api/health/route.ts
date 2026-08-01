import { checkProductionDatabase } from "@/db/production/client";
import { getState } from "@/lib/repository";
import { getRuntimeMode } from "@/lib/runtime";
export async function GET() { try { const mode = getRuntimeMode(); if (mode === "production") { await checkProductionDatabase(); return Response.json({ status: "healthy", mode, database: "postgresql", syntheticData: false }); } const state = await getState(); return Response.json({ status: "healthy", mode, seedVersion: state.seedVersion, offline: true, syntheticData: true }); } catch { return Response.json({ status: "unhealthy" }, { status: 503 }); } }

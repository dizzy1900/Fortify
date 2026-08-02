import type { Metadata } from "next";
import { ProgrammeAnalyticsWorkspace } from "@/components/programme-analytics-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = { title: "Programme intelligence", description: "Governed sponsor cohorts, recognition-graph provenance, tenant-only analytics, and exact brokerage and programme reports." };
export const dynamic = "force-dynamic";

export default function ProgrammeIntelligencePage() { return <ProgrammeAnalyticsWorkspace mode={getRuntimeMode()} />; }

import type { Metadata } from "next";
import { ResiliencePlanningWorkspace } from "@/components/resilience-planning-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = { title: "Resilience planning", description: "Governed target profiles, baseline gaps, interventions, and transparent capital-plan scenarios." };
export const dynamic = "force-dynamic";
export default function ResiliencePlanningPage() { return <ResiliencePlanningWorkspace mode={getRuntimeMode()} />; }

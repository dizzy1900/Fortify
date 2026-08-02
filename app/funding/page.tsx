import type { Metadata } from "next";
import { FundingProjectWorkspace } from "@/components/funding-project-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = { title: "Funding and project execution", description: "Governed programme eligibility, blended capital stacks, commitments, milestones, external access, and export-only disbursement controls." };
export const dynamic = "force-dynamic";

export default function FundingPage() {
  return <FundingProjectWorkspace mode={getRuntimeMode()} />;
}

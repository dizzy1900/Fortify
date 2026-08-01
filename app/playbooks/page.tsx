import type { Metadata } from "next";
import { MarketPlaybookWorkspace } from "@/components/market-playbook-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Market playbooks",
  description:
    "Versioned destination requirements and deterministic evidence-readiness administration.",
};

export const dynamic = "force-dynamic";

export default function PlaybooksPage() {
  return <MarketPlaybookWorkspace mode={getRuntimeMode()} />;
}

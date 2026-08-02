import type { Metadata } from "next";
import { GovernedSourceWorkspace } from "@/components/governed-source-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "California source register",
  description:
    "Governed source publication, supersession, reliance, and impact analysis.",
};

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  return <GovernedSourceWorkspace mode={getRuntimeMode()} />;
}

import type { Metadata } from "next";
import { BrokerageCaseWorkspace } from "@/components/brokerage-case-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "California brokerage case",
  description:
    "Tenant-scoped California renewal and appeal case workflow from confirmed notice facts through immutable packet bytes.",
};

export const dynamic = "force-dynamic";

export default function BrokerageCasePage() {
  return <BrokerageCaseWorkspace mode={getRuntimeMode()} />;
}

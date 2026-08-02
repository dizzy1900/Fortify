import type { Metadata } from "next";
import { IntegrationOperationsWorkspace } from "@/components/integration-operations-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Integration operations",
  description:
    "Governed provider connections, durable synchronization, exact receipts, signed webhooks, and explicit live-provider gates.",
};
export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return <IntegrationOperationsWorkspace mode={getRuntimeMode()} />;
}

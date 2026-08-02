import type { Metadata } from "next";
import { PropertyGraphWorkspace } from "@/components/property-graph-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Property evidence graph",
  description:
    "Tenant-scoped California property identity, physical scope, provenance, version, and data-right workspace.",
};

export const dynamic = "force-dynamic";

export default function PropertyGraphPage() {
  return <PropertyGraphWorkspace mode={getRuntimeMode()} />;
}

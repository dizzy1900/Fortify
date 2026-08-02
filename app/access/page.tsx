import type { Metadata } from "next";
import { AccessControlWorkspace } from "@/components/access-control-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Identity and access control",
  description:
    "Tenant-scoped roles, portfolio and case assignments, purpose grants, access logs, and secure evidence boundaries.",
};

export const dynamic = "force-dynamic";

export default function AccessPage() {
  return <AccessControlWorkspace mode={getRuntimeMode()} />;
}

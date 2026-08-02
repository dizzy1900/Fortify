import type { Metadata } from "next";
import { VerificationWorkspace } from "@/components/verification-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = { title: "Independent verification", description: "Assignment-scoped verification methods, signed findings, exception remediation, certificates, and maintenance provenance." };
export const dynamic = "force-dynamic";

export default function VerificationPage() { return <VerificationWorkspace mode={getRuntimeMode()} />; }

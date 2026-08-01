import type { Metadata } from "next";
import { DocumentReviewWorkspace } from "@/components/document-review-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Document intake and review",
  description:
    "Tenant-scoped document processing, provenance review, correction, and durable job workspace.",
};

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  return <DocumentReviewWorkspace mode={getRuntimeMode()} />;
}

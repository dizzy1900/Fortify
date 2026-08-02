import type { Metadata } from "next";
import { PortfolioImportWorkspace } from "@/components/portfolio-import-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Portfolio import",
  description:
    "Organization-scoped CSV and XLSX portfolio import, review, receipt, and rollback workspace.",
};

export const dynamic = "force-dynamic";

export default function PortfolioImportPage() {
  return <PortfolioImportWorkspace mode={getRuntimeMode()} />;
}

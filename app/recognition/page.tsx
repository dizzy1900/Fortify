import type { Metadata } from "next";
import { MarketRecognitionWorkspace } from "@/components/market-recognition-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = { title: "Market recognition", description: "Immutable recognition submissions, scoped reviewer access, clarification, and separated market outcome ledgers." };
export const dynamic = "force-dynamic";

export default function RecognitionPage() { return <MarketRecognitionWorkspace mode={getRuntimeMode()} />; }

import type { Metadata } from "next";
import { ModelRecognitionWorkspace } from "@/components/model-recognition-workspace";
import { getRuntimeMode } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Model recognition",
  description: "Version-pinned external models, evidence-bound input mappings, and explicit market commitments.",
};
export const dynamic = "force-dynamic";

export default function ModelRecognitionPage() {
  return <ModelRecognitionWorkspace mode={getRuntimeMode()} />;
}

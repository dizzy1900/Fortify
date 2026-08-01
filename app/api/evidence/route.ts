import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import type { EvidenceRecord } from "@/lib/domain";
import { sandboxRouteGuard } from "@/lib/http-runtime";
import { applyAction, getState } from "@/lib/repository";
import { LocalFileStorageAdapter } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const SAFE_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
]);

function kindFor(mimeType: string): EvidenceRecord["kind"] {
  if (mimeType.startsWith("image/")) return "photo";
  if (mimeType === "application/pdf") return "inspection";
  return "attestation";
}

export async function POST(request: Request) {
  const unavailable = sandboxRouteGuard();
  if (unavailable) return unavailable;
  try {
    const data = await request.formData();
    const file = data.get("file");
    const caseId = String(data.get("caseId") ?? "");
    if (!(file instanceof File))
      throw new Error("Choose a PDF, JPEG, PNG, or plain-text evidence file.");
    if (file.size === 0 || file.size > MAX_EVIDENCE_BYTES)
      throw new Error("Evidence files must be between 1 byte and 5 MB.");
    if (!SAFE_MIME.has(file.type))
      throw new Error(
        "Only PDF, JPEG, PNG, and plain-text evidence files are supported.",
      );

    const state = await getState();
    if (state.currentRole !== "broker")
      throw new Error("Only the broker role can upload evidence.");
    const community = state.communities.find((item) => item.caseId === caseId);
    if (!community) throw new Error("Case not found.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const id = `ev-upload-${randomUUID()}`;
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "-");
    const storageKey = `uploads/${id}-${safeName}`;
    await new LocalFileStorageAdapter().put(storageKey, bytes);
    const evidence: EvidenceRecord = {
      id,
      communityId: community.id,
      filename: storageKey,
      mimeType: file.type,
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      kind: kindFor(file.type),
      sourceOrganization: "Broker upload - fictional demo",
      captureDate: state.demoDate,
      uploadDate: state.demoDate,
      scope: "community",
      scopeLabel: `${community.name} shared property`,
      submittedBy: "Maya Chen",
      confidence: 1,
      humanReviewed: false,
      carrierStatus: "unsubmitted",
      requirementIds: [],
    };
    const next = await applyAction({ type: "add-evidence", evidence });
    return Response.json(next, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Evidence upload failed",
      },
      { status: 400 },
    );
  }
}

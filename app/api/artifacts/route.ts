import { generateCaseArtifacts } from "@/lib/artifacts";
import { applyAction, getState } from "@/lib/repository";
export const runtime = "nodejs";
export async function POST(request: Request) { try { const { caseId } = await request.json() as { caseId: string }; const state = await getState(); const result = await generateCaseArtifacts(state, caseId); const submission = state.submissions.find((item) => item.caseId === caseId)!; await applyAction({ type: "mark-generated", submissionId: submission.id, packetPath: result.pdfPath, zipPath: result.zipPath }); return Response.json(result); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 400 }); } }

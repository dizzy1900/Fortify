import pdf from "pdf-parse/lib/pdf-parse.js";
import { extractNoticeFields } from "@/lib/extraction";
import { sandboxRouteGuard } from "@/lib/http-runtime";

export const runtime = "nodejs";

const MAX_NOTICE_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const unavailable = sandboxRouteGuard();
  if (unavailable) return unavailable;
  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File))
      throw new Error("Choose a plain-text or text-based PDF notice.");
    if (file.size === 0 || file.size > MAX_NOTICE_BYTES)
      throw new Error("Notice files must be between 1 byte and 2 MB.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    const isText =
      file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
    if (!isPdf && !isText)
      throw new Error("Only .txt and text-based .pdf notices are supported.");

    const rawText = isPdf
      ? (await pdf(bytes)).text.trim()
      : bytes.toString("utf8").trim();
    if (!rawText)
      throw new Error(
        "No selectable text was found. OCR is intentionally not included in this MVP.",
      );

    return Response.json({
      filename: file.name,
      format: isPdf ? "text-based PDF" : "plain text",
      rawText,
      fields: extractNoticeFields(rawText),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Notice extraction failed",
      },
      { status: 400 },
    );
  }
}

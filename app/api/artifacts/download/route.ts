import fs from "node:fs/promises";
import path from "node:path";
import { sandboxRouteGuard } from "@/lib/http-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unavailable = sandboxRouteGuard();
  if (unavailable) return unavailable;
  const url = new URL(request.url);
  const file = url.searchParams.get("file");
  if (!file) return new Response("Missing file", { status: 400 });
  const root = path.join(process.cwd(), "output");
  const target = path.resolve(/* turbopackIgnore: true */ root, file);
  if (!target.startsWith(`${root}${path.sep}`))
    return new Response("Invalid path", { status: 400 });
  try {
    const bytes = await fs.readFile(target);
    return new Response(bytes, {
      headers: {
        "Content-Type": target.endsWith(".pdf")
          ? "application/pdf"
          : "application/zip",
        "Content-Disposition": `attachment; filename="${path.basename(target)}"`,
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

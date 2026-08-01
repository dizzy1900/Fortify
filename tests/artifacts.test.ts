import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { generateCaseArtifacts } from "@/lib/artifacts";
import { resetState } from "@/lib/repository";
import { closeDb } from "@/db";

let tempRoot = "";
describe("submission artifacts", () => {
  beforeAll(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "fortify-artifact-"));
    process.env.FORTIFY_DATABASE_PATH = path.join(tempRoot, "test.sqlite");
    process.env.FORTIFY_STORAGE_PATH = path.join(tempRoot, "storage");
    process.env.FORTIFY_OUTPUT_PATH = path.join(tempRoot, "output");
  });
  afterAll(async () => {
    closeDb();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });
  test("generates a real PDF and ZIP manifest with typed, hash-matching exhibits", async () => {
    const state = await resetState();
    const notice = state.notices.find(
      (item) => item.caseId === "case-jefferson",
    )!;
    notice.confirmed = true;
    notice.fields = notice.fields.map((field) => ({
      ...field,
      confirmedByHuman: true,
    }));
    const submission = state.submissions.find(
      (item) => item.caseId === "case-jefferson",
    )!;
    submission.confirmedBy = "Test confirmer";
    submission.confirmedAt = "2026-08-01T09:00:00Z";
    const result = await generateCaseArtifacts(state, "case-jefferson");
    const pdf = await fs.readFile(result.pdfPath);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(8000);
    const zipBytes = await fs.readFile(result.zipPath);
    expect(zipBytes.subarray(0, 2).toString()).toBe("PK");
    const zip = await JSZip.loadAsync(zipBytes);
    const names = Object.keys(zip.files);
    expect(names).toContain("manifest.json");
    expect(names).toContain("reconsideration-letter.txt");
    expect(
      names.filter(
        (name) => name.startsWith("exhibits/") && !name.endsWith("/"),
      ).length,
    ).toBe(14);
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    );
    expect(manifest.fictionalDemo).toBe(true);
    expect(manifest.noticeConfirmed).toBe(true);
    expect(manifest.submissionConfirmedBy).toBe("Test confirmer");
    expect(manifest.mitigationActions).toHaveLength(2);
    expect(manifest.limitations.join(" ")).toContain("not guaranteed");
    const photo = state.evidence.find(
      (item) => item.communityId === "com-jefferson" && item.kind === "photo",
    )!;
    const photoEntry = names.find((name) => name.endsWith(photo.filename))!;
    const photoBytes = Buffer.from(
      await zip.file(photoEntry)!.async("uint8array"),
    );
    expect(photoBytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    expect(
      (await import("node:crypto"))
        .createHash("sha256")
        .update(photoBytes)
        .digest("hex"),
    ).toBe(photo.sha256);
  });
  test("fails closed without both human confirmation gates", async () => {
    const state = await resetState();
    await expect(
      generateCaseArtifacts(state, "case-jefferson"),
    ).rejects.toThrow("notice field");
    const notice = state.notices.find(
      (item) => item.caseId === "case-jefferson",
    )!;
    notice.confirmed = true;
    notice.fields = notice.fields.map((field) => ({
      ...field,
      confirmedByHuman: true,
    }));
    await expect(
      generateCaseArtifacts(state, "case-jefferson"),
    ).rejects.toThrow("confirm the submission");
  });
});

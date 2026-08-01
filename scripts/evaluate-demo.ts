import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { closeDb } from "../db";
import { generateCaseArtifacts } from "../lib/artifacts";
import { calculateReadiness } from "../lib/readiness";
import { resetState } from "../lib/repository";

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail: string) =>
  checks.push({ name, ok, detail });
const first = await resetState();
const firstHash = createHash("sha256")
  .update(JSON.stringify(first))
  .digest("hex");
const second = await resetState();
const secondHash = createHash("sha256")
  .update(JSON.stringify(second))
  .digest("hex");
check(
  "seed-counts",
  second.communities.length === 3 &&
    second.evidence.length >= 40 &&
    second.requirements.length >= 25,
  `${second.communities.length} communities, ${second.evidence.length} evidence, ${second.requirements.length} requirements`,
);
check(
  "deterministic-reset",
  firstHash === secondHash,
  `${firstHash.slice(0, 16)} == ${secondHash.slice(0, 16)}`,
);
check(
  "fictional-labels",
  second.communities.every((item) => item.name.startsWith("Fictional")) &&
    second.communities.every((item) => item.carrier.startsWith("Fictional")),
  "All seeded communities and carriers are visibly fictional",
);
check(
  "edge-cases",
  second.evidence.some((item) => item.conflictWith) &&
    second.evidence.some(
      (item) => item.expiryDate && item.expiryDate < second.demoDate,
    ) &&
    second.evidence.some((item) => item.reusedFromYear),
  "Conflict, expiry, and year-over-year reuse present",
);
check(
  "mitigation-register",
  second.mitigationActions.length >= 6 &&
    second.mitigationActions.some((item) => item.status === "complete") &&
    second.mitigationActions.some((item) => item.status === "in-progress"),
  `${second.mitigationActions.length} broker-entered actions with mixed status`,
);
const scores = second.communities.map((community) =>
  calculateReadiness(
    second.requirements.filter((item) =>
      community.requirementIds.includes(item.id),
    ),
    second.evidence.filter((item) => community.evidenceIds.includes(item.id)),
    second.demoDate,
  ),
);
check(
  "readiness-components",
  scores.every((score) =>
    Object.values(score).every((value) => value >= 0 && value <= 100),
  ),
  scores.map((score) => score.total).join(", "),
);
check(
  "source-traceability",
  second.requirements.every(
    (item) =>
      item.source && item.version && item.sourceUrl && item.verifyCurrent,
  ),
  "Every requirement has source, version, URL, and verify-current flag",
);
check(
  "notice-human-gate",
  second.notices
    .filter((item) => item.caseId !== "case-larimer")
    .every(
      (item) =>
        !item.confirmed &&
        item.fields.every((field) => !field.confirmedByHuman),
    ),
  "Open notices remain provisional",
);
check(
  "audit-chain",
  second.audit.every(
    (item, index) =>
      index === 0 || item.previousHash === second.audit[index - 1].hash,
  ),
  `${second.audit.length} hash-linked events`,
);
const validationState = structuredClone(second);
const validationNotice = validationState.notices.find(
  (item) => item.caseId === "case-jefferson",
)!;
validationNotice.confirmed = true;
validationNotice.fields = validationNotice.fields.map((field) => ({
  ...field,
  confirmedByHuman: true,
}));
const validationSubmission = validationState.submissions.find(
  (item) => item.caseId === "case-jefferson",
)!;
validationSubmission.confirmedBy = "Validation harness - not submitted";
validationSubmission.confirmedAt = `${validationState.demoDate}T09:00:00Z`;
const artifacts = await generateCaseArtifacts(
  validationState,
  "case-jefferson",
);
const pdf = await fs.readFile(artifacts.pdfPath);
const zip = await JSZip.loadAsync(await fs.readFile(artifacts.zipPath));
const manifest = JSON.parse(await zip.file("manifest.json")!.async("string"));
check(
  "real-pdf",
  pdf.subarray(0, 5).toString() === "%PDF-" && pdf.length > 8000,
  `${pdf.length} bytes`,
);
check(
  "real-zip",
  !!zip.file("manifest.json") &&
    Object.keys(zip.files).filter(
      (name) => name.startsWith("exhibits/") && !name.endsWith("/"),
    ).length === 14 &&
    manifest.noticeConfirmed === true &&
    !!manifest.submissionConfirmedBy &&
    manifest.mitigationActions.length === 2,
  `${Object.keys(zip.files).length} entries with confirmation gates and action register`,
);
const sourceRoots = ["app", "components", "lib"];
const files: string[] = [];
for (const root of sourceRoots) {
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(target);
    }
  };
  await walk(root);
}
const copy = (await Promise.all(files.map((file) => fs.readFile(file, "utf8"))))
  .join("\n")
  .toLowerCase();
const prohibited = [
  "guaranteed discount",
  "guaranteed renewal",
  "certified compliant",
  "predicted wildfire risk",
  "official ibhs partner",
];
check(
  "prohibited-claims",
  prohibited.every((phrase) => !copy.includes(phrase)),
  "No prohibited promise or affiliation phrases in seeded UI source",
);
const report = {
  generatedAt: new Date().toISOString(),
  seedVersion: second.seedVersion,
  status: checks.every((item) => item.ok) ? "pass" : "fail",
  checks,
  artifacts,
};
await fs.mkdir("artifacts/evaluation", { recursive: true });
await fs.writeFile(
  "artifacts/evaluation/demo-evaluation.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
closeDb();
if (report.status !== "pass") process.exitCode = 1;

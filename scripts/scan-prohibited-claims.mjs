import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const textExtensions = new Set([
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
]);

const configuredRoots = process.env.FORTIFY_CLAIMS_SCAN_ROOTS
  ?.split(path.delimiter)
  .map((value) => value.trim())
  .filter(Boolean);
const sourceRoots = configuredRoots ?? ["app", "components", "lib", "public"];
const generatedRoots = configuredRoots ? [] : ["output/packets"];
const excludedDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const prohibitedClaims = [
  "guaranteed insurance",
  "guaranteed discount",
  "guaranteed loss reduction",
  "guaranteed renewal",
  "guaranteed insurability",
  "guaranteed funding",
  "certified by fortify",
  "fortify risk score",
  "fortify wildfire risk score",
  "officially approved by fortify",
  "automatically changes the model",
  "automatically changes a model input",
  "automatically qualifies",
  "automatically compliant",
  "proves the property is safe",
  "proves the property is insurable",
  "will insure this property",
  "reduces losses by 80%",
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function walk(root) {
  if (!(await exists(root))) return [];
  const files = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || excludedDirectories.has(entry.name))
      continue;
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()))
      files.push(target);
  }
  return files;
}

function findClaims(label, content) {
  const normalized = content.toLowerCase().replaceAll(/\s+/g, " ");
  return prohibitedClaims
    .filter((phrase) => normalized.includes(phrase))
    .map((phrase) => ({ label, phrase }));
}

const findings = [];
for (const root of sourceRoots) {
  for (const file of await walk(root))
    findings.push(...findClaims(file, await fs.readFile(file, "utf8")));
}

for (const root of generatedRoots) {
  if (!(await exists(root))) continue;
  for (const file of await walk(root)) {
    if (path.extname(file).toLowerCase() !== ".zip") {
      findings.push(...findClaims(file, await fs.readFile(file, "utf8")));
      continue;
    }
  }
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".zip")
      continue;
    const archivePath = path.join(root, entry.name);
    const archive = await JSZip.loadAsync(await fs.readFile(archivePath));
    for (const [entryName, zipEntry] of Object.entries(archive.files)) {
      if (
        zipEntry.dir ||
        !textExtensions.has(path.extname(entryName).toLowerCase())
      )
        continue;
      findings.push(
        ...findClaims(
          `${archivePath}::${entryName}`,
          await zipEntry.async("string"),
        ),
      );
    }
  }
}

if (findings.length > 0) {
  console.error("Prohibited product claims detected:");
  for (const finding of findings)
    console.error(`- ${finding.label}: ${JSON.stringify(finding.phrase)}`);
  process.exitCode = 1;
} else {
  console.log(
    `Prohibited-claims scan passed (${prohibitedClaims.length} direct claim patterns; product source and generated text artifacts).`,
  );
}

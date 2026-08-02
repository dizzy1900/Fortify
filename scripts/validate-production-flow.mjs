import fs from "node:fs";

const manifest = JSON.parse(
  fs.readFileSync("docs/production-flow-evidence.json", "utf8"),
);
if (manifest.steps.length !== 33)
  throw new Error(`Expected 33 flow steps, received ${manifest.steps.length}.`);
for (const [index, step] of manifest.steps.entries()) {
  if (step.step !== index + 1)
    throw new Error(`Flow step sequence breaks at ${index + 1}.`);
  if (!fs.existsSync(step.evidence))
    throw new Error(`Missing flow evidence ${step.evidence}.`);
  const source = fs.readFileSync(step.evidence, "utf8");
  if (!source.includes("PGlite") || /DemoState/.test(source))
    throw new Error(
      `${step.evidence} is not isolated production-fixture evidence.`,
    );
}
console.log(
  `Production-flow evidence: ${manifest.steps.length}/33 mapped to normalized PostgreSQL fixture tests.`,
);

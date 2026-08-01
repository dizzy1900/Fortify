import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const repositoryFiles = spawnSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  {
  encoding: "utf8",
  },
);

if (repositoryFiles.status !== 0) {
  process.stderr.write(
    repositoryFiles.stderr || "Unable to list repository files.\n",
  );
  process.exit(1);
}

const patterns = [
  {
    name: "private key",
    expression: new RegExp(
      ["-----BEGIN ", "(?:RSA |EC |OPENSSH )?", "PRIVATE KEY-----"].join(""),
    ),
  },
  {
    name: "GitHub token",
    expression: new RegExp(["gh", "[pousr]_[A-Za-z0-9]{20,}"].join("")),
  },
  {
    name: "AWS access key",
    expression: new RegExp(["AK", "IA[0-9A-Z]{16}"].join("")),
  },
  {
    name: "Slack token",
    expression: new RegExp(["xo", "x[baprs]-[A-Za-z0-9-]{20,}"].join("")),
  },
];

const findings = [];
for (const filename of repositoryFiles.stdout.split("\0").filter(Boolean)) {
  const bytes = readFileSync(filename);
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const pattern of patterns) {
    if (pattern.expression.test(text)) findings.push(`${filename}: ${pattern.name}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(`Potential committed secrets found:\n${findings.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `Repository secret scan passed (${repositoryFiles.stdout.split("\0").filter(Boolean).length} files).\n`,
);

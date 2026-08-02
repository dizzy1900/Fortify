import { spawnSync } from "node:child_process";
import fs from "node:fs";

const files = fs
  .readdirSync("tests")
  .filter((file) => file.endsWith(".test.ts"))
  .sort();

for (const file of files) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--pool=threads",
      "--maxWorkers=1",
      "--no-file-parallelism",
      `tests/${file}`,
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Bounded test runner passed ${files.length} isolated files.`);

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("prohibited resilience and insurance claims guard", () => {
  test("passes bounded evidence language and rejects a direct guarantee", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "fortify-claims-"),
    );
    temporaryDirectories.push(directory);
    const fixture = path.join(directory, "runtime-copy.ts");
    fs.writeFileSync(
      fixture,
      'export const copy = "Evidence readiness does not determine insurance or physical performance.";\n',
    );
    const environment = {
      ...process.env,
      FORTIFY_CLAIMS_SCAN_ROOTS: directory,
    };
    expect(() =>
      execFileSync("node", ["scripts/scan-prohibited-claims.mjs"], {
        cwd: process.cwd(),
        env: environment,
        encoding: "utf8",
      }),
    ).not.toThrow();

    fs.writeFileSync(
      fixture,
      'export const copy = "This package provides guaranteed insurance.";\n',
    );
    expect(() =>
      execFileSync("node", ["scripts/scan-prohibited-claims.mjs"], {
        cwd: process.cwd(),
        env: environment,
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow();
  });
});

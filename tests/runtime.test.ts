import { describe, expect, test } from "vitest";
import {
  RuntimeConfigurationError,
  getRuntimeMode,
} from "@/lib/runtime";

describe("runtime data-plane selection", () => {
  test("requires an explicit mode in production", () => {
    expect(() =>
      getRuntimeMode({ NODE_ENV: "production" } as NodeJS.ProcessEnv),
    ).toThrow(RuntimeConfigurationError);
  });

  test("selects only the configured production or sandbox data plane", () => {
    expect(
      getRuntimeMode({
        NODE_ENV: "test",
        FORTIFY_RUNTIME_MODE: "sandbox",
      } as NodeJS.ProcessEnv),
    ).toBe("sandbox");
    expect(
      getRuntimeMode({
        NODE_ENV: "test",
        FORTIFY_RUNTIME_MODE: "production",
      } as NodeJS.ProcessEnv),
    ).toBe("production");
    expect(() =>
      getRuntimeMode({
        NODE_ENV: "test",
        FORTIFY_RUNTIME_MODE: "demo",
      } as NodeJS.ProcessEnv),
    ).toThrow(RuntimeConfigurationError);
  });
});

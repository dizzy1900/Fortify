import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["e2e/**", "node_modules/**"],
    sequence: { concurrent: false },
    fileParallelism: false,
    hookTimeout: 90_000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});

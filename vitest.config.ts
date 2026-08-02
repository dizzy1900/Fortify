import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"], exclude: ["e2e/**", "node_modules/**"], sequence: { concurrent: false }, fileParallelism: false, hookTimeout: 30_000 }, resolve: { alias: { "@": path.resolve(__dirname, ".") } } });

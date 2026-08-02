import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "node .next/standalone/server.js",
    env: {
      HOSTNAME: "127.0.0.1",
      PORT: "3000",
      FORTIFY_RUNTIME_MODE: "sandbox",
    },
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: true,
    timeout: 120000,
  },
});

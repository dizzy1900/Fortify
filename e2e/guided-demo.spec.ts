import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
  await fs.mkdir(path.resolve("artifacts/screenshots"), { recursive: true });
});

test("broker-to-underwriter guided demo", async ({ page }, testInfo) => {
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Renewals that need a decision" }),
  ).toBeVisible();
  await expect(page.getByText("Fictional Red Rock Townhomes")).toBeVisible();
  if (testInfo.project.name === "chromium")
    await page.screenshot({
      path: "artifacts/screenshots/01-portfolio.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm what the carrier said" }),
  ).toBeVisible();
  await page
    .getByLabel("Replace notice source")
    .setInputFiles(path.resolve("e2e/fixtures/replacement-notice.txt"));
  await expect(page.getByText("replacement-notice.txt")).toBeVisible();
  await page.getByRole("button", { name: "Confirm all fields" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmed by human" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByText("Evidence readiness", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Reference content, not legal or standards advice."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Vegetation task" }).click();
  await page.getByRole("button", { name: "Invoice task" }).click();
  await expect(
    page.getByText("Obtain current vegetation inspection").last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  const conflictButtons = page.getByRole("button", {
    name: "Resolve conflict",
  });
  await expect(conflictButtons).toHaveCount(2);
  await conflictButtons.first().click();
  await page
    .getByLabel("Add evidence file")
    .setInputFiles(path.resolve("e2e/fixtures/broker-attestation.txt"));
  await expect(page.getByText(/broker-attestation\.txt/)).toBeVisible();
  await page.getByRole("button", { name: "Provenance" }).first().click();
  await expect(page.getByText("Evidence provenance")).toBeVisible();
  await expect(page.getByText("SHA-256", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Confirm packet contents" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmed by Maya Chen" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Generate PDF + ZIP" }).click();
  await expect(page.getByText("Submission artifacts generated")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("link", { name: "PDF" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ZIP" })).toBeVisible();
  if (testInfo.project.name === "chromium")
    await page.screenshot({
      path: "artifacts/screenshots/02-packet.png",
      fullPage: true,
    });
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Demo role").selectOption("underwriter");
  await page
    .getByRole("button", { name: "Send clarification request" })
    .click();
  await expect(
    page.getByRole("button", { name: "Clarification requested" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Return to broker role" }).click();
  await page.getByRole("button", { name: "Mark response ready" }).click();
  await expect(
    page.getByRole("button", { name: "Response ready" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Record fictional outcome" }).click();
  await expect(page.getByText("Fictional outcome recorded")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(
    page.getByRole("heading", { name: "Make next year’s renewal faster" }),
  ).toBeVisible();
  await expect(page.getByText("2025 renewal")).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).first().click();
  await expect(page.getByRole("button", { name: "Completed" })).toBeDisabled();
  if (testInfo.project.name === "chromium")
    await page.screenshot({
      path: "artifacts/screenshots/03-maintenance.png",
      fullPage: true,
    });
});

test("public page and all workspace routes are healthy", async ({ page }) => {
  const routes = [
    "/",
    "/demo",
    "/portfolio",
    "/community",
    "/policy",
    "/notice",
    "/requirements",
    "/evidence",
    "/case",
    "/packet",
    "/underwriter",
    "/outcomes",
    "/maintenance",
    "/reports",
    "/settings",
  ];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("body")).not.toBeEmpty();
  }
});

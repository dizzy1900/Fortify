import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
  await fs.mkdir(path.resolve("artifacts/screenshots"), { recursive: true });
  await fs.mkdir(path.resolve("test-results/visual-inspection"), {
    recursive: true,
  });
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
    "/sign-in",
    "/demo",
    "/portfolio",
    "/imports",
    "/documents",
    "/playbooks",
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

test("public doctrine is explicit and responsive", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn verified resilience work into a submission a market can evaluate.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "California wildfire resilience · specialist property-risk practices",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Colorado renewal foundation · fictional sandbox"),
  ).toBeVisible();
  await expect(
    page.getByText(/not a wildfire model, verifier, insurer, lender/),
  ).toBeVisible();

  const assertNoOverflow = async () => {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  };

  await assertNoOverflow();
  if (testInfo.project.name === "chromium") {
    await page.screenshot({
      path: "test-results/visual-inspection/public-resilience-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.reload();
    await assertNoOverflow();
    await page.screenshot({
      path: "test-results/visual-inspection/public-resilience-tablet.png",
      fullPage: true,
    });
  } else {
    await page.screenshot({
      path: "test-results/visual-inspection/public-resilience-mobile.png",
      fullPage: true,
    });
  }
});

test("portfolio import walkthrough preserves quarantine, confirmation, receipts, and rollback", async ({ page }, testInfo) => {
  await page.goto("/imports");
  await expect(
    page.getByRole("heading", {
      name: "Turn a property book into a reviewable evidence graph.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Fictional fixture walkthrough")).toBeVisible();
  await expect(page.getByText("Clean object", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Generate preview" }).click();
  await expect(page.getByText("Synthetic dry run complete")).toBeVisible();
  await expect(page.getByText("PROP-100").first()).toBeVisible();
  await page.getByRole("button", { name: "ambiguous", exact: true }).click();
  await expect(page.getByText("PROP-200")).toBeVisible();
  await expect(page.getByText("PROP-100")).not.toBeVisible();
  await page.getByRole("button", { name: "all", exact: true }).click();

  await page
    .getByLabel(/I reviewed the source, mapping, accepted rows, and quarantine/)
    .check();
  await page.getByRole("button", { name: "Commit accepted rows" }).click();
  await expect(page.getByText("2 accepted rows committed")).toBeVisible();
  await expect(page.getByText("commit", { exact: true })).toBeVisible();

  await page
    .getByLabel("Rollback reason")
    .fill("Synthetic source version superseded during review");
  await page
    .getByRole("button", { name: "Rollback import-owned records" })
    .click();
  await expect(
    page.getByText("Import rolled back without destructive deletion"),
  ).toBeVisible();
  await expect(page.getByText("rollback", { exact: true })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  if (testInfo.project.name === "chromium")
    await page.screenshot({
      path: "test-results/visual-inspection/portfolio-import-desktop.png",
      fullPage: true,
    });
  else
    await page.screenshot({
      path: "test-results/visual-inspection/portfolio-import-mobile.png",
      fullPage: true,
    });
});

test("document workspace preserves provenance, human review, corrections, and dead-letter control", async ({ page }, testInfo) => {
  await page.goto("/documents");
  await expect(
    page.getByRole("heading", { name: "Document intake and fact review" }),
  ).toBeVisible();
  await expect(page.getByText("Synthetic sandbox", { exact: true })).toBeVisible();
  await expect(page.getByText("Clean scanned objects only")).toBeVisible();

  await page.getByRole("button", { name: /Policy candidate 1/ }).click();
  await expect(page.getByText("Policy: FICTIONAL-COA-2048")).toBeVisible();
  await expect(page.getByText(/Page 1 · line-4/)).toBeVisible();
  await page.getByRole("button", { name: "Save immutable review" }).click();
  await expect(
    page.getByText("Candidate confirmed by a human reviewer with its source citation."),
  ).toBeVisible();

  await page.getByRole("radio", { name: "corrected" }).check();
  await page.getByLabel("Corrected value").fill("FICTIONAL-COA-2049");
  await page
    .getByLabel(/Review note/)
    .fill("Synthetic human correction after checking page 1.");
  await page.getByRole("button", { name: "Save immutable review" }).click();
  await expect(
    page.getByText("Human correction saved as a superseding fact version."),
  ).toBeVisible();
  await expect(page.getByText("Fact v2")).toBeVisible();
  await expect(page.getByText("FICTIONAL-COA-2049")).toBeVisible();

  await page.getByRole("button", { name: /Required evidence candidate 1/ }).click();
  await expect(page.getByText(/Page 2 · table-r3-c2/)).toBeVisible();
  await expect(page.getByText(/Model-derived candidate; human review mandatory/)).toBeVisible();
  await page.getByRole("button", { name: "Save immutable review" }).click();
  await expect(
    page.getByText("Candidate confirmed by a human reviewer with its source citation."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Retry +1" }).click();
  await expect(
    page.getByText("Dead-letter retry recorded with one additional bounded attempt."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Queue durable processing" }).click();
  await expect(page.getByText(/Synthetic job queued/)).toBeVisible();
  await page
    .getByLabel("Source document")
    .selectOption({ label: "v1 · fictional-carrier-notice.pdf · review_required" });
  await page.getByRole("button", { name: /Policy candidate 1/ }).click();
  await expect(page.getByText("Fact v2")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document
      .querySelectorAll<HTMLElement>(".document-table-wrap")
      .forEach((element) => element.scrollTo({ left: 0 }));
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path:
      testInfo.project.name === "chromium"
        ? "test-results/visual-inspection/document-review-desktop.png"
        : "test-results/visual-inspection/document-review-mobile.png",
    fullPage: true,
  });
});

test("market playbooks preserve blockers, immutable versions, and independent review", async ({ page }, testInfo) => {
  await page.goto("/playbooks");
  await expect(
    page.getByRole("heading", { name: "Market playbooks" }),
  ).toBeVisible();
  await expect(page.getByText("No averaged score", { exact: true })).toBeVisible();
  await expect(page.getByText("blocked", { exact: true })).toBeVisible();
  await expect(page.getByText("Missing", { exact: true })).toBeVisible();
  await expect(page.getByText("Stale", { exact: true })).toBeVisible();
  await expect(page.getByText("Contradiction", { exact: true })).toBeVisible();
  await expect(page.getByText(/averages cannot offset blockers/)).toBeVisible();

  await page.getByRole("button", { name: "Version builder" }).click();
  await page.getByLabel("Verified current").check();
  await page.getByRole("button", { name: "Create draft version" }).click();
  await expect(
    page.getByText("Synthetic draft created. It is not applicable until independent review."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Version history" }).click();
  await expect(page.getByRole("heading", { name: "Version 3" })).toBeVisible();
  await expect(page.getByText("Change diff", { exact: true })).toBeVisible();
  await expect(page.getByText("Independent review pending")).toBeVisible();
  await page.getByRole("button", { name: "Approve version" }).click();
  await expect(
    page.getByText("Synthetic version independently approved for deterministic evaluation."),
  ).toBeVisible();
  await expect(page.getByText("approved", { exact: true }).last()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path:
      testInfo.project.name === "chromium"
        ? "test-results/visual-inspection/market-playbooks-desktop.png"
        : "test-results/visual-inspection/market-playbooks-mobile.png",
    fullPage: true,
  });
});

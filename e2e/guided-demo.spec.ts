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
    "/brokerage",
    "/property-graph",
    "/access",
    "/imports",
    "/documents",
    "/sources",
    "/playbooks",
    "/resilience-planning",
    "/funding",
    "/verification",
    "/model-recognition",
    "/recognition",
    "/programme-intelligence",
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

test("California brokerage case records a confirmed request and immutable packet artifacts", async ({ page }, testInfo) => {
  await page.goto("/brokerage");
  await expect(
    page.getByRole("heading", {
      name: "One governed case, from confirmed notice to exact packet bytes.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Fictional California development fixture")).toBeVisible();
  await expect(page.getByText("Human confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("Exact bytes stored", { exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "Evidence requests" }).click();
  await page
    .getByLabel(/I confirm this request scope/)
    .check();
  await page.getByRole("button", { name: "Record request draft" }).click();
  await expect(
    page.getByText(/human-confirmed request draft was recorded/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm and mark issued" })
    .first()
    .click();
  await expect(page.getByText(/Delivery remains separate/)).toBeVisible();

  await page.getByRole("button", { name: "Packet" }).click();
  await page
    .getByLabel(/I confirm these packet contents/)
    .check();
  await page.getByRole("button", { name: "Generate immutable packet" }).click();
  await expect(
    page.getByText(/exact artifact hashes were recorded/),
  ).toBeVisible();
  await expect(page.getByText("PDF", { exact: true })).toBeVisible();
  await expect(page.getByText("ZIP", { exact: true })).toBeVisible();
  await expect(page.getByText("MANIFEST", { exact: true })).toBeVisible();
  await expect(page.getByText(/Authority remains separate/)).toBeVisible();

  const assertNoOverflow = async () => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  };
  await assertNoOverflow();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path:
      testInfo.project.name === "chromium"
        ? "test-results/visual-inspection/brokerage-case-desktop.png"
        : "test-results/visual-inspection/brokerage-case-mobile.png",
    fullPage: true,
  });
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.reload();
    await assertNoOverflow();
    await page.screenshot({
      path: "test-results/visual-inspection/brokerage-case-tablet.png",
      fullPage: true,
    });
  }
});

test("identity workspace creates and revokes purpose-scoped access without erasing history", async ({ page }, testInfo) => {
  await page.goto("/access");
  await expect(
    page.getByRole("heading", {
      name: "Give each collaborator only the evidence context their work requires.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Fictional access fixture")).toBeVisible();
  await expect(page.getByText("Deny by default")).toBeVisible();

  await page.getByRole("button", { name: "Assignments" }).click();
  await expect(
    page.getByRole("heading", { name: "Portfolio and case assignments" }),
  ).toBeVisible();
  await page.getByLabel("Purpose").fill("Collect renewed roof and vent evidence");
  await page.getByRole("button", { name: "Create purpose grant" }).click();
  await expect(
    page.getByText(/Synthetic purpose grant created locally/),
  ).toBeVisible();
  await expect(
    page
      .locator(".access-assignment-list p")
      .filter({ hasText: "Collect renewed roof and vent evidence" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revoke" }).last().click();
  await expect(
    page.getByText(/Synthetic grant revoked locally/),
  ).toBeVisible();
  await expect(page.getByText("Reason: Access purpose ended by administrator")).toBeVisible();

  await page.getByRole("button", { name: "Access log" }).click();
  await expect(
    page.getByRole("heading", { name: "Purpose-specific data access" }),
  ).toBeVisible();
  await expect(page.getByText("Append only")).toBeVisible();
  await page.getByRole("button", { name: "Boundaries" }).click();
  await expect(
    page.getByRole("heading", { name: "Resilience ecosystem role boundaries" }),
  ).toBeVisible();
  await expect(page.getByText("Contractor evidence contributor")).toBeVisible();
  await expect(page.getByText(/do not establish inspection authority/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path:
      testInfo.project.name === "chromium"
        ? "test-results/visual-inspection/access-control-desktop.png"
        : "test-results/visual-inspection/access-control-mobile.png",
    fullPage: true,
  });
  if (testInfo.project.name === "chromium") {
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.reload();
    const tabletOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(tabletOverflow).toBe(false);
    await page.screenshot({
      path: "test-results/visual-inspection/access-control-tablet.png",
      fullPage: true,
    });
  }
});

test("California property graph preserves identity, missing geometry, provenance, and tenant boundaries", async ({ page }, testInfo) => {
  await page.goto("/property-graph");
  await expect(
    page.getByRole("heading", { name: "California property evidence graph" }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic California development fixture", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Separate organization and records from the preserved fictional Colorado/),
  ).toBeVisible();
  await expect(page.getByText("No approved parcel geometry")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Boundary unavailable" })).toBeVisible();

  const assertNoOverflow = async () => {
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  };

  await assertNoOverflow();
  await page.getByRole("button", { name: "Scope graph" }).click();
  await expect(page.getByRole("heading", { name: "Physical scope graph" })).toBeVisible();
  await expect(page.getByText("Entire fictional association")).toBeVisible();
  await expect(page.getByText("Fictional Ridge Access Road")).toBeVisible();

  await page
    .getByLabel("Property selector")
    .selectOption("property-ca-fixture-canyon-court");
  await expect(page.getByText("Shared access route", { exact: true })).toBeVisible();
  await expect(page.getByText("Shared water infrastructure")).toBeVisible();

  await page.getByRole("button", { name: "Versions" }).click();
  await expect(page.getByText("Immutable", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rights & provenance" }).click();
  await expect(page.getByRole("heading", { name: "Tenant-controlled use" })).toBeVisible();
  await expect(page.getByText("prohibited", { exact: true })).toBeVisible();

  if (testInfo.project.name === "chromium") {
    await page.getByRole("button", { name: "Property record" }).click();
    await page.screenshot({
      path: "test-results/visual-inspection/property-graph-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.reload();
    await assertNoOverflow();
    await page.screenshot({
      path: "test-results/visual-inspection/property-graph-tablet.png",
      fullPage: true,
    });
  } else {
    await assertNoOverflow();
    await page.screenshot({
      path: "test-results/visual-inspection/property-graph-mobile.png",
      fullPage: true,
    });
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
  await page.screenshot({
    path:
      testInfo.project.name === "chromium"
        ? "test-results/visual-inspection/portfolio-import-desktop.png"
        : testInfo.project.name === "tablet"
          ? "test-results/visual-inspection/portfolio-import-tablet.png"
          : "test-results/visual-inspection/portfolio-import-mobile.png",
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
        : testInfo.project.name === "tablet"
          ? "test-results/visual-inspection/document-review-tablet.png"
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

test("California source register preserves publication gates and successor impact", async ({ page }, testInfo) => {
  await page.goto("/sources");
  await expect(page.getByRole("heading", { name: "Source register" })).toBeVisible();
  await expect(page.getByText("Fail-closed publication", { exact: true })).toBeVisible();
  await expect(page.getByText("Published versions", { exact: true })).toBeVisible();
  await expect(page.getByText("Blocked candidates", { exact: true })).toBeVisible();
  await expect(page.getByText("Safer from Wildfires", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /Defensible Space Zones/ }).click();
  await expect(page.getByText("Candidate · non-operative", { exact: true }).last()).toBeVisible();
  await expect(page.getByText(/Model-assisted candidate is unreviewed/)).toBeVisible();

  await page.getByRole("button", { name: /Safer from Wildfires/ }).click();
  await page.getByRole("button", { name: "Stage successor" }).click();
  await expect(page.getByRole("heading", { name: "Stage a source change" })).toBeVisible();
  await page.getByRole("button", { name: "Register non-operative candidate" }).click();
  await expect(page.getByText(/Candidate registered as non-operative/)).toBeVisible();
  await page.getByRole("button", { name: "Record independent approval" }).click();
  await expect(page.getByText(/Independent review recorded/)).toBeVisible();
  await page.getByRole("button", { name: "Publish immutable version" }).click();
  await expect(page.getByText(/Published\. Any predecessor reliance is preserved/)).toBeVisible();

  await page.getByRole("button", { name: "Change impact" }).click();
  await expect(page.getByRole("heading", { name: "Impact queue" })).toBeVisible();
  await expect(page.getByText("Profiles", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/California community wildfire evidence-readiness/)).toBeVisible();
  await expect(page.getByText("Reports", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Generated analytics reports preserve exact source-version lineage/)).toBeVisible();
  await expect(page.getByText(/no automatic mutation occurred/)).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/visual-inspection/source-register-${
      testInfo.project.name === "chromium" ? "desktop" : testInfo.project.name
    }.png`,
    fullPage: true,
  });
});

test("resilience planning preserves evidence hierarchy and fail-closed capital paths", async ({ page }, testInfo) => {
  await page.goto("/resilience-planning");
  await expect(page.getByRole("heading", { name: /Resilience investment planning/ })).toBeVisible();
  await expect(page.getByText("Human-governed planning", { exact: true })).toBeVisible();
  await expect(page.getByText(/no wildfire score/i)).toBeVisible();
  await expect(page.getByText("Applicable · options available", { exact: true })).toBeVisible();
  await expect(page.getByText("3 of 3 rules matched", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Target profile" }).click();
  await expect(page.getByText("minimum", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("preferred", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Recognition unavailable", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Interventions" }).click();
  await expect(page.getByRole("heading", { name: "Evidence recovery" })).toBeVisible();
  await expect(page.getByText(/No risk reduction, premium, renewal/)).toBeVisible();

  await page.getByRole("button", { name: "Capital scenarios" }).click();
  await page.getByRole("button", { name: /Parallel evidence/ }).click();
  await expect(page.getByText("$29,500–$53,000", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("potential candidate", { exact: true })).toBeVisible();
  await expect(page.getByText("unverified", { exact: true })).toBeVisible();

  await page.getByLabel("Review assessment state").selectOption("insufficient_evidence");
  await expect(page.getByRole("heading", { name: "Insufficient evidence" })).toBeVisible();
  await expect(page.getByText(/system creates no replacement assumptions/)).toBeVisible();
  await page.getByLabel("Review assessment state").selectOption("inapplicable");
  await expect(page.getByRole("heading", { name: "Profile inapplicable" })).toBeVisible();
  await page.getByLabel("Review assessment state").selectOption("no_attractive_path");
  await expect(page.getByRole("heading", { name: "No attractive path documented" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByLabel("Review assessment state").selectOption("options_available");
  await page.getByRole("button", { name: "Capital scenarios" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/resilience-planning-desktop.png" : "test-results/visual-inspection/resilience-planning-mobile.png", fullPage: true });
});

test("funding and execution preserves rule, cost-share, approval, scope, and export boundaries", async ({ page }, testInfo) => {
  await page.goto("/funding");
  await expect(page.getByRole("heading", { name: "Fund the work. Govern every release." })).toBeVisible();
  await expect(page.getByText("Export-only boundary", { exact: true })).toBeVisible();
  await expect(page.getByText(/sponsor or financial institution makes the actual/)).toBeVisible();
  await expect(page.getByText("Rules matched", { exact: true })).toBeVisible();
  await expect(page.getByText("Exact rules, no hidden score", { exact: true })).toBeVisible();
  await expect(page.getByText("$24,000", { exact: true })).toBeVisible();

  await page.getByLabel("Review funding eligibility state").selectOption("insufficient_evidence");
  await expect(page.getByRole("heading", { name: "Insufficient evidence" })).toBeVisible();
  await expect(page.locator(".funding-stop").getByText(/Eligibility stops fail-closed/)).toBeVisible();
  await page.getByLabel("Review funding eligibility state").selectOption("ineligible");
  await expect(page.getByRole("heading", { name: "Rule mismatch" })).toBeVisible();
  await page.getByLabel("Review funding eligibility state").selectOption("eligible");

  await page.getByRole("button", { name: "Capital stack" }).click();
  await expect(page.getByText("Append-only commitment history", { exact: true })).toBeVisible();
  await expect(page.getByText("corrected", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /owner · 33.33%/ }).click();
  await expect(page.getByText("No commitment has been recorded for this source.")).toBeVisible();

  await page.getByRole("button", { name: "Milestones" }).click();
  await expect(page.getByText("Dependency-gated delivery", { exact: true })).toBeVisible();
  await expect(page.getByText(/requires WORKPLAN/)).toBeVisible();
  await expect(page.getByText(/not executed export only/)).toBeVisible();
  await page.getByRole("button", { name: "Inspect export boundary" }).click();
  await expect(page.getByText("No bank credentials, custody, settlement, transfer")).toBeVisible();

  await page.getByRole("button", { name: "Access & benefits" }).click();
  await expect(page.getByText("Only the work they need", { exact: true })).toBeVisible();
  await expect(page.getByText("Costs, contribution, and uncertainty stay separate", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview revoke" }).first().click();
  await expect(page.getByRole("button", { name: "Access revoked" })).toBeDisabled();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/funding-execution-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/funding-execution-tablet.png" : "test-results/visual-inspection/funding-execution-mobile.png", fullPage: true });
});

test("independent verification preserves assignment, evidence, correction, certificate, and maintenance boundaries", async ({ page }, testInfo) => {
  await page.goto("/verification");
  await expect(page.getByRole("heading", { name: "Make every conclusion inspectable." })).toBeVisible();
  await expect(page.getByText("Substantive-verifier boundary", { exact: true })).toBeVisible();
  await expect(page.getByText(/Fortify manages workflow and provenance/)).toBeVisible();
  await expect(page.getByText("Verification record current", { exact: true })).toBeVisible();
  await expect(page.getByText("No conflict declared", { exact: true })).toBeVisible();

  await page.getByLabel("Review verification governance state").selectOption("expired_credential");
  await expect(page.getByText("Credential expired", { exact: true })).toBeVisible();
  await expect(page.getByText("Assignment blocked", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("insufficient_evidence");
  await expect(page.getByText("Evidence insufficient", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("verified");

  await page.getByRole("button", { name: "Methods & evidence" }).click();
  await expect(page.getByText("Observation, not inference", { exact: true })).toBeVisible();
  await expect(page.getByText("Two immutable versions cited", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("insufficient_evidence");
  await expect(page.getByText("Required proof unavailable", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("verified");
  await page.getByRole("button", { name: "Findings & exceptions" }).click();
  await expect(page.getByText("Verified Installation", { exact: true })).toBeVisible();
  await expect(page.getByText("Exception resolved; history retained", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect corrective lineage" }).click();
  await expect(page.getByText(/eligible for reinspection/)).toBeVisible();

  await page.getByRole("button", { name: "Certificate & upkeep" }).click();
  await expect(page.getByText("FSBR-CV-2026-014", { exact: true })).toBeVisible();
  await expect(page.getByText("Maintenance stays evidence-bound", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("revoked_certificate");
  await expect(page.getByText("Certificate revoked", { exact: true })).toBeVisible();
  await expect(page.locator(".certificate-state").getByText("Revoked", { exact: true })).toBeVisible();
  await page.getByLabel("Review verification governance state").selectOption("no_assignment");
  await expect(page.getByRole("heading", { name: "Project evidence is unavailable" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByLabel("Review verification governance state").selectOption("verified");
  await page.getByRole("button", { name: "Findings & exceptions" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/independent-verification-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/independent-verification-tablet.png" : "test-results/visual-inspection/independent-verification-mobile.png", fullPage: true });
});

test("model recognition keeps proposals, external acceptance, and review-only commitments separate", async ({ page }, testInfo) => {
  await page.goto("/model-recognition");
  await expect(page.getByRole("heading", { name: "Trace what was proposed. Prove what was accepted." })).toBeVisible();
  await expect(page.getByText("External-authority boundary", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not calculate risk, set rates, bind coverage/)).toBeVisible();
  await expect(page.locator(".recognition-gate strong").getByText("Accepted with modification", { exact: true })).toBeVisible();
  await expect(page.getByText("Class A documented", { exact: true })).toBeVisible();
  await expect(page.getByText("Class A — documentation accepted with property-level qualifier", { exact: true })).toBeVisible();

  await page.getByLabel("Review model mapping state").selectOption("submitted");
  await expect(page.getByText("Submitted for external review", { exact: true })).toBeVisible();
  await expect(page.getByText("No acceptance evidence", { exact: true })).toBeVisible();
  await page.getByLabel("Review model mapping state").selectOption("unsupported");
  await expect(page.getByText("Input unsupported", { exact: true })).toBeVisible();
  await expect(page.getByText("No supported transformation", { exact: true })).toBeVisible();
  await page.getByLabel("Review model mapping state").selectOption("accepted_with_modification");
  await page.getByRole("button", { name: "Inspect decision record" }).click();
  await expect(page.getByText(/never overwrites Fortify’s proposal/)).toBeVisible();

  await page.getByRole("button", { name: "Model register" }).click();
  await expect(page.getByText("Exact source, limited use", { exact: true })).toBeVisible();
  await expect(page.getByText("Fire response time", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Market commitments" }).click();
  await expect(page.getByRole("heading", { name: "Will review ≠ will insure" })).toBeVisible();
  await expect(page.getByText("Review-only authority", { exact: true })).toBeVisible();
  await page.getByLabel("Review model mapping state").selectOption("no_commitment");
  await expect(page.getByRole("heading", { name: "No explicit market commitment" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByLabel("Review model mapping state").selectOption("accepted_with_modification");
  await page.getByRole("button", { name: "Input mapping" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/model-recognition-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/model-recognition-tablet.png" : "test-results/visual-inspection/model-recognition-mobile.png", fullPage: true });
});

test("market recognition preserves exact delivery, scoped review, correspondence, and separate outcomes", async ({ page }, testInfo) => {
  await page.goto("/recognition");
  await expect(page.getByRole("heading", { name: "Deliver exact evidence. Preserve the market’s exact answer." })).toBeVisible();
  await expect(page.getByText("Recognition is recorded, never predicted", { exact: true })).toBeVisible();
  await expect(page.getByText(/Delivery is not acceptance/)).toBeVisible();
  await expect(page.locator(".market-recognition-gate strong").getByText("Clarification answered", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect receipt chain" }).click();
  await expect(page.getByText(/recipient acceptance remains unclaimed/)).toBeVisible();

  await page.getByRole("button", { name: "Secure reviewer" }).click();
  await expect(page.getByRole("heading", { name: "Original language retained" })).toBeVisible();
  await expect(page.getByText(/Please identify which roof photographs/)).toBeVisible();
  await page.getByRole("button", { name: "Revoke access" }).click();
  await expect(page.locator(".market-recognition-gate strong").getByText("Reviewer access revoked", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Decisions" }).click();
  await expect(page.getByRole("heading", { name: "No category fills another" })).toBeVisible();
  await expect(page.getByText("Unknown", { exact: true })).toBeVisible();
  await expect(page.getByText("No determination supplied", { exact: true })).toBeVisible();
  await expect(page.getByText("Explicitly unavailable", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Highlight correction" }).click();
  await expect(page.locator(".market-recognition-gate strong").getByText("Correction appended", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Maintenance" }).click();
  await expect(page.getByRole("heading", { name: "Closed · outcome pending" })).toBeVisible();
  await page.getByRole("button", { name: "Queue human review" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.getByRole("button", { name: "Submission" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/market-recognition-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/market-recognition-tablet.png" : "test-results/visual-inspection/market-recognition-mobile.png", fullPage: true });
});

test("programme intelligence keeps cohort decisions, graph provenance, analytics, and privacy boundaries explicit", async ({ page }, testInfo) => {
  await page.goto("/programme-intelligence");
  await expect(page.getByRole("heading", { name: "See the programme. Trace every conclusion." })).toBeVisible();
  await expect(page.getByText("Descriptive operations evidence—not an impact model", { exact: true })).toBeVisible();
  await expect(page.getByText("Cohort active", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Madrone Court/ }).click();
  await expect(page.getByText("Evidence insufficient", { exact: true })).toBeVisible();
  await expect(page.getByText(/not counted as qualified/)).toBeVisible();
  await page.getByRole("button", { name: "Inspect decision lineage" }).click();
  await expect(page.getByText("Exact membership source and append-only decision lineage opened.")).toBeAttached();

  await page.getByRole("button", { name: "Recognition graph" }).click();
  await expect(page.getByRole("heading", { name: "Physical change → external response" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "6 traceable relations" })).toBeVisible();
  await expect(page.getByText(/graph edge records provenance/)).toBeVisible();

  await page.getByRole("button", { name: "Analytics & reports" }).click();
  await expect(page.getByRole("heading", { name: "Measures with denominators" })).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).first().click();
  await expect(page.getByText("Customer-confirmed baseline", { exact: true })).toBeVisible();
  await expect(page.getByText("Observed tenant snapshot", { exact: true })).toBeVisible();
  await expect(page.getByText(/No labour saving, financial return/)).toBeVisible();

  await page.getByRole("button", { name: "Rights & privacy" }).click();
  await expect(page.getByRole("heading", { name: "Tenant-only by default" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Not authorized" })).toBeVisible();
  await page.getByRole("button", { name: "Test blocked aggregate" }).click();
  await expect(page.getByText("Cross-customer query blocked", { exact: true })).toBeVisible();
  await expect(page.getByText(/No benchmark or customer-identifiable aggregate ran/)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/programme-intelligence-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/programme-intelligence-tablet.png" : "test-results/visual-inspection/programme-intelligence-mobile.png", fullPage: true });
});

test("integration operations preserves provider pins, retries, exact receipts, and signed webhook custody", async ({ page }, testInfo) => {
  await page.goto("/integrations");
  await expect(page.getByRole("heading", { name: "Connect deliberately. Replay without losing custody." })).toBeVisible();
  await expect(page.getByText("Credentials referenced—not stored in configuration", { exact: true })).toBeVisible();
  await expect(page.getByText("Provider output is candidate input", { exact: true })).toBeVisible();
  await expect(page.getByText("Provider fixture healthy", { exact: true })).toBeVisible();

  await page.getByLabel("Inspect integration control state").selectOption("rate_limited");
  await expect(page.getByText("Rate limit respected", { exact: true })).toBeVisible();
  await page.getByLabel("Inspect integration control state").selectOption("dead_letter");
  await expect(page.getByText("Sync dead-lettered", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sync & receipts" }).click();
  await expect(page.getByRole("heading", { name: "Cursor → attempt → exact receipt" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Failures remain evidence" })).toBeVisible();
  await expect(page.getByText("50 staged", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Inspect pagination lineage" }).click();
  await expect(page.getByText("Next-page job inspected; cursor and request hash are immutable.", { exact: true })).toBeAttached();
  await page.getByRole("button", { name: "Queue append-only replay" }).click();
  await expect(page.getByText(/Append-only replay job queued/)).toBeAttached();
  await expect(page.getByText("Provider fixture healthy", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Signed webhooks" }).click();
  await expect(page.getByRole("heading", { name: "Verify before quarantine" })).toBeVisible();
  await expect(page.getByText("HMAC SHA-256", { exact: true })).toBeVisible();
  await expect(page.getByText("Signature valid · bytes quarantined", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Test duplicate event" }).click();
  await expect(page.getByText(/Duplicate external event rejected/)).toBeAttached();
  await expect(page.getByRole("heading", { name: "No signature, no intake" })).toBeVisible();

  await page.getByRole("button", { name: "Provider catalog" }).click();
  for (const provider of ["Microsoft Graph email intake", "Gmail email intake", "Google Drive evidence intake", "Applied Epic compatible exchange", "AMS360 compatible exchange", "External model boundary", "Independent verifier boundary"])
    await expect(page.getByRole("heading", { name: provider })).toBeVisible();
  await expect(page.getByText("Credential-dependent live gate", { exact: true })).toBeVisible();

  await page.getByLabel("Inspect integration control state").selectOption("disconnected");
  await expect(page.getByText("Live credential unavailable", { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.project.name === "chromium" ? "test-results/visual-inspection/integration-operations-desktop.png" : testInfo.project.name === "tablet" ? "test-results/visual-inspection/integration-operations-tablet.png" : "test-results/visual-inspection/integration-operations-mobile.png", fullPage: true });
});

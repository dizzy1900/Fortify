import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/reset");
});

test("serves liveness, readiness, CSP, and secure browser headers", async ({
  request,
}) => {
  await expect(
    (await request.get("/api/health")).json(),
  ).resolves.toMatchObject({ status: "healthy", check: "liveness" });
  await expect((await request.get("/api/ready")).json()).resolves.toMatchObject(
    { ok: true, check: "readiness" },
  );
  const response = await request.get("/portfolio");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-request-id"]).toBeTruthy();
});

test("critical workspaces have no serious accessibility violations or horizontal overflow", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "One deterministic accessibility pass is sufficient.",
  );
  for (const route of [
    "/portfolio",
    "/integrations",
    "/programme-intelligence",
  ]) {
    await page.goto(route);
    await expect(page.locator("body")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
      `${route} serious/critical accessibility violations`,
    ).toEqual([]);
  }
});

test("portfolio launch surface matches the reviewed visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The desktop Chromium project owns the visual baseline.",
  );
  await page.goto("/portfolio");
  await expect(
    page.getByRole("heading", { name: "Renewals that need a decision" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot(
    `portfolio-launch-${process.platform}.png`,
    {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.03,
    },
  );
});

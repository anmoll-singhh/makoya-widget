/**
 * e2e/public-funnel.spec.ts — the PUBLIC, no-auth top of the funnel.
 *
 * Covers the cold-traffic path that drives leads:
 *   1. Landing `/` loads and surfaces the hero scan entry (CTA into /scan).
 *   2. `/scan` loads with its URL input + scan button.
 *   3. (network-gated) Running a real scan shows a score and the email-capture
 *      gate. This hits /api/public-scan which launches headless Chromium, so it
 *      is slow and needs outbound network — it's tagged @scan and skipped unless
 *      RUN_LIVE_SCAN=1 so the fast structural checks stay reliable.
 *
 * ── RUN (needs the app running; see playwright.config.ts header for full setup):
 *     npx playwright test e2e/public-funnel.spec.ts
 *     RUN_LIVE_SCAN=1 npx playwright test e2e/public-funnel.spec.ts   # incl. live scan
 *
 * NOTE: not runnable in the test-hardening worktree (no server, no env). The
 * specs are written to be correct + runnable against a real dev server.
 */
import { test, expect } from "@playwright/test";

test.describe("public landing page", () => {
  test("loads and offers a path to scan a site", async ({ page }) => {
    await page.goto("/");

    // The page renders (h1 present). Anonymous visitors stay on the landing page
    // (signed-in users are redirected to /dashboard — not our case here).
    await expect(page.locator("h1").first()).toBeVisible();

    // There is at least one "Scan your site" / "Scan" call to action pointing at /scan.
    const scanCta = page.getByRole("link", { name: /scan/i }).first();
    await expect(scanCta).toBeVisible();
  });

  test("hero scan entry navigates to the /scan tool", async ({ page }) => {
    await page.goto("/");
    // Click the first scan CTA and confirm we land on the scanner screen.
    await page.getByRole("link", { name: /scan/i }).first().click();
    await expect(page).toHaveURL(/\/scan/);
  });
});

test.describe("public scan page", () => {
  test("loads with a URL input and a scan button", async ({ page }) => {
    await page.goto("/scan");

    const urlInput = page.getByLabel(/website address to scan/i);
    await expect(urlInput).toBeVisible();

    const scanButton = page.getByRole("button", { name: /scan my site/i });
    await expect(scanButton).toBeVisible();
    // Button is disabled until a URL is entered.
    await expect(scanButton).toBeDisabled();

    await urlInput.fill("example.com");
    await expect(scanButton).toBeEnabled();
  });

  test("shows the honest, no-compliance-claim microcopy", async ({ page }) => {
    await page.goto("/scan");
    // Compliance guardrail: the public funnel must not promise "compliant".
    await expect(page.getByText(/don.t claim any site/i)).toBeVisible();
  });
});

test.describe("public scan → score → email gate", () => {
  // Live scan: slow + needs network + headless Chromium server-side. Opt in.
  test.skip(
    process.env.RUN_LIVE_SCAN !== "1",
    "Live scan is slow + network-bound; set RUN_LIVE_SCAN=1 to enable."
  );

  test("running a scan reveals a score and the email-capture form", async ({ page }) => {
    await page.goto("/scan");

    await page.getByLabel(/website address to scan/i).fill("https://example.com");
    await page.getByRole("button", { name: /scan my site/i }).click();

    // The score ring shows "/ 100" once results render.
    await expect(page.getByText("/ 100")).toBeVisible({ timeout: 60_000 });

    // The email-capture gate (the lead-generating CTA) appears with the results.
    await expect(page.getByLabel(/your email address/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /email .*download report/i })
    ).toBeVisible();
  });
});

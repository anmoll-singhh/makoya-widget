/**
 * playwright.config.ts — E2E config for the Makoya web app.
 *
 * SCOPE: only the e2e/ directory (Playwright .spec.ts). Vitest owns *.test.ts and
 * ignores e2e/ via its own `include`. These two runners never see each other's files.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO RUN (needs a running app + real Supabase env — NOT runnable in CI/this
 * worktree, which has no .env.local):
 *
 *   # 1. Provide Supabase env (apps/web/.env.local) — see apps/web/lib/env.ts:
 *   #      NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   #      SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS
 *   #
 *   # 2. Install browsers once:
 *   npx playwright install chromium
 *   #
 *   # 3a. Let Playwright start the dev server for you (default below):
 *   npx playwright test
 *   #
 *   # 3b. ...or run against an already-running server:
 *   npm run dev -w @makoya/web      # in one terminal → http://localhost:3000
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 PW_NO_SERVER=1 npx playwright test
 *
 * The public-funnel spec needs no auth. The RLS isolation suite lives under
 * vitest (lib/*.rls.test.ts), not here, because it talks to Supabase directly
 * with no browser.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

// Allow running against an already-up server (PW_NO_SERVER=1) instead of letting
// Playwright boot one. Useful when iterating with `npm run dev` in another tab.
const startOwnServer = process.env.PW_NO_SERVER !== "1";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Public funnel runs a real headless scan, which can take 10–30s.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: startOwnServer
    ? {
        // `next dev` on port 3000 (see package.json "dev"). Reuse a running one
        // locally so repeated runs are fast; always fresh in CI.
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});

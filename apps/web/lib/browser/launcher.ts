/**
 * lib/browser/launcher.ts
 *
 * Reusable Playwright browser launcher.
 *
 * Two environments:
 *
 * VERCEL / LAMBDA (isServerless = true)
 *   Uses @sparticuz/chromium which extracts a pre-built Chromium binary to
 *   /tmp and sets LD_LIBRARY_PATH so it can find its bundled shared libs.
 *   We use sparticuz's own recommended arg list but REMOVE --single-process.
 *   --single-process merges browser + renderer into one OS process; under
 *   memory pressure (axe-core doing deep DOM analysis) that process crashes
 *   with "Target page, context or browser has been closed".
 *   --no-zygote (already in sparticuz's list) is the safe replacement.
 *
 * LOCAL / CI (isServerless = false)
 *   Uses playwright-core with whatever Chromium is already installed via
 *   `npx playwright install chromium`.  We pass a small set of flags that
 *   make headless work on all major OSes without duplicating playwright's own
 *   internal defaults.
 */

import { chromium, type Browser, type Page } from "playwright-core";
import { AppError } from "@/lib/utils/error";

// ---------------------------------------------------------------------------
// Local-dev launch arguments
// ---------------------------------------------------------------------------

/**
 * Minimal flags for local development.
 * playwright-core adds its own headless/viewport/remote-debugging-pipe flags
 * on top of these, so we only include things that are not defaults.
 */
const LOCAL_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--mute-audio",
] as const;

/**
 * Resource types to abort on every page.
 * Blocking images / fonts / media cuts page weight by 40-60 % without
 * affecting axe-core which only needs the rendered DOM tree.
 */
const BLOCKED_RESOURCE_TYPES = new Set(["image", "font", "media"]);

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

function isServerless(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.AWS_LAMBDA_FUNCTION_NAME === "string"
  );
}

// ---------------------------------------------------------------------------
// Browser launcher
// ---------------------------------------------------------------------------

export interface BrowserHandle {
  browser: Browser;
  /** Call in a finally block — prevents zombie Chromium processes. */
  cleanup: () => Promise<void>;
}

/**
 * Launches a Playwright Chromium browser configured for the current runtime.
 *
 * @throws {AppError} "BROWSER_LAUNCH_FAILED" if Chromium cannot start.
 */
export async function launchBrowser(): Promise<BrowserHandle> {
  let executablePath: string | undefined;
  let launchArgs: string[];

  if (isServerless()) {
    /**
     * @sparticuz/chromium provides a Lambda-compatible Chromium binary.
     * executablePath() decompresses it to /tmp on first call and sets
     * LD_LIBRARY_PATH so bundled shared libs (libnss3, libgbm, etc.) load.
     */
    const chromiumPkg = await import("@sparticuz/chromium").then(
      (m) => m.default ?? m
    );

    executablePath = await chromiumPkg.executablePath();

    /**
     * Use sparticuz's recommended arg list as the base.
     * CRITICAL: filter out --single-process.
     *
     * --single-process merges the browser process and all renderer processes
     * into one. When axe-core injects its analysis script the combined memory
     * and CPU load can exceed what a single process can sustain, causing
     * Chromium to terminate mid-evaluation ("page.evaluate: Target page,
     * context or browser has been closed").
     *
     * --no-zygote is already in sparticuz's list and is the correct
     * replacement: it disables the zygote pre-spawner while still allowing
     * separate renderer processes that are individually stable.
     */
    launchArgs = (chromiumPkg.args as string[]).filter(
      (arg) => arg !== "--single-process"
    );
  } else {
    // Local development: use playwright-core's installed Chromium.
    // Run `npx playwright install chromium` once if not already installed.
    launchArgs = [...LOCAL_ARGS];
  }

  let browser: Browser;

  try {
    browser = await chromium.launch({
      executablePath,
      args: launchArgs,
      headless: true,
      timeout: 15_000,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);

    // Surface a helpful hint when the browser binary simply isn't installed locally.
    const isNotFound =
      detail.includes("Executable doesn't exist") ||
      detail.includes("No usable sandbox") ||
      detail.includes("playwright install");

    const message = isNotFound
      ? `Chromium not found. Run: npx playwright install chromium\n\nOriginal error: ${detail}`
      : `Chromium failed to start: ${detail}`;

    throw new AppError("BROWSER_LAUNCH_FAILED", message, 503);
  }

  async function cleanup(): Promise<void> {
    try {
      if (browser.isConnected()) await browser.close();
    } catch {
      // Suppress — already in cleanup path, container reclaims resources.
    }
  }

  return { browser, cleanup };
}

// ---------------------------------------------------------------------------
// Page factory
// ---------------------------------------------------------------------------

export interface PageHandle {
  page: Page;
}

/** UA string that identifies scanner traffic in server logs. */
const SCANNER_USER_AGENT =
  "Mozilla/5.0 (compatible; A11yScanner/1.0; +https://github.com/your-org/ada-checker)";

/**
 * Opens a new isolated browser context + page with the scanner user-agent
 * and optional asset blocking.
 *
 * A fresh context per scan ensures cookies, cache, and storage are fully
 * isolated between concurrent requests.
 */
export async function openPage(
  browser: Browser,
  blockAssets = true
): Promise<PageHandle> {
  const context = await browser.newContext({
    userAgent: SCANNER_USER_AGENT,
    reducedMotion: "reduce",
    serviceWorkers: "block",
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  if (blockAssets) {
    await page.route("**/*", (route) => {
      if (BLOCKED_RESOURCE_TYPES.has(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  return { page };
}

/**
 * lib/browser/scanPage.ts
 *
 * `scanPage` — the primary reusable entry point for the Playwright engine.
 *
 * What it does (current phase):
 *  1. Launches Chromium via `launchBrowser`.
 *  2. Opens an isolated page via `openPage`.
 *  3. Navigates to the requested URL with a 25-second hard deadline.
 *  4. Returns the page title and the final (post-redirect) URL.
 *  5. Safely closes the browser in all code paths.
 *
 * What it does NOT do (intentionally deferred):
 *  - Running axe-core — that lives in the scanner engine layer.
 *  - Scoring / reporting — that is the route handler's responsibility.
 *
 * Error contract:
 *  - Navigation failures (timeout, DNS error, HTTP 4xx/5xx) throw
 *    `AppError` with code "PAGE_LOAD_FAILED".
 *  - Browser startup failures propagate the "BROWSER_LAUNCH_FAILED"
 *    `AppError` from `launchBrowser` unchanged.
 *  - All other unexpected errors are wrapped and re-thrown as
 *    "INTERNAL_SERVER_ERROR" so callers never see raw Playwright errors.
 *
 * Execution budget:
 *  - Total wall-clock budget is kept well under 30 s by using a 25 s
 *    navigation timeout (leaves ~5 s for browser startup + teardown).
 *  - `waitUntil: "domcontentloaded"` is used instead of `"load"` so the
 *    function does not stall on lazy-loaded resources or long-polling XHRs.
 */

import { AppError } from "@/lib/utils/error";
import { launchBrowser, openPage } from "./launcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanPageResult {
  /** The final URL after all redirects (may differ from the input URL). */
  finalUrl: string;

  /** The document title of the loaded page, or empty string if none. */
  title: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum milliseconds to wait for the page's DOMContentLoaded event.
 * Set to 25 s to stay comfortably under Vercel's 30 s serverless limit,
 * accounting for ~1–2 s of Chromium startup and ~1 s of teardown.
 */
const PAGE_NAVIGATION_TIMEOUT_MS = 25_000;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Opens a real Chromium browser, visits `url`, and returns basic page metadata.
 *
 * @param url  Fully-qualified URL to visit. Must already be validated by the
 *             caller — no additional sanitisation is performed here.
 *
 * @returns    `{ finalUrl, title }` — safe to JSON-serialise.
 *
 * @throws {AppError}  "BROWSER_LAUNCH_FAILED" | "PAGE_LOAD_FAILED" |
 *                     "INTERNAL_SERVER_ERROR"
 *
 * @example
 * ```ts
 * const { finalUrl, title } = await scanPage("https://example.com");
 * ```
 */
export async function scanPage(url: string): Promise<ScanPageResult> {
  const { browser, cleanup } = await launchBrowser();

  try {
    const { page } = await openPage(browser);

    try {
      await page.goto(url, {
        timeout: PAGE_NAVIGATION_TIMEOUT_MS,
        /**
         * "domcontentloaded" fires as soon as the HTML is parsed and the DOM
         * is ready — JavaScript, images, and stylesheets may still be loading.
         * This is the correct strategy for a scanner because:
         *  - It avoids waiting for third-party analytics scripts that never
         *    finish loading in some environments.
         *  - The DOM available at this point is sufficient for both axe-core
         *    and title/URL extraction.
         */
        waitUntil: "domcontentloaded",
      });
    } catch (navErr) {
      const detail = navErr instanceof Error ? navErr.message : String(navErr);

      // Distinguish timeout from other navigation errors for clearer messaging.
      if (detail.toLowerCase().includes("timeout")) {
        throw new AppError(
          "SCAN_TIMEOUT",
          `Page did not respond within ${PAGE_NAVIGATION_TIMEOUT_MS / 1_000} seconds: ${url}`,
          504
        );
      }

      throw new AppError(
        "PAGE_LOAD_FAILED",
        `Failed to load page "${url}": ${detail}`,
        502
      );
    }

    // Extract metadata.  Both calls are synchronous in the page's JS context
    // so no additional timeout is needed.
    const finalUrl = page.url();
    const title = await page.title();

    return { finalUrl, title };
  } catch (err) {
    // Re-throw AppErrors unchanged so callers can type-narrow them.
    if (err instanceof AppError) throw err;

    // Wrap any unexpected Playwright or V8 error.
    const detail = err instanceof Error ? err.message : String(err);
    throw new AppError(
      "INTERNAL_SERVER_ERROR",
      `Unexpected scanner error: ${detail}`,
      500
    );
  } finally {
    // ALWAYS runs — even when an error is thrown above.
    // Prevents zombie Chromium processes in the Lambda execution environment.
    await cleanup();
  }
}

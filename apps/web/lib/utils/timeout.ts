/**
 * lib/utils/timeout.ts
 *
 * Promise-based timeout utility for async scan operations.
 *
 * Why this exists:
 * ─────────────────
 * Vercel Serverless Functions on the Hobby plan have a hard 60-second
 * execution limit; Pro is 300 seconds. Playwright page loads can stall
 * indefinitely on slow or misbehaving sites. Without an explicit timeout
 * the Lambda will hit the platform limit and return a generic 504 with no
 * useful information for the caller.
 *
 * This module provides:
 *  - `withTimeout`         — races any Promise against a deadline.
 *  - `MAX_SCAN_TIMEOUT_MS` — server-enforced ceiling; callers may request
 *                            shorter but never longer.
 *  - `DEFAULT_TIMEOUT_MS`  — sensible default when callers omit `timeoutMs`.
 */

import { AppError } from "@/lib/utils/error";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Hard upper bound applied server-side regardless of what the client sends.
 * Set conservatively below Vercel's Hobby limit so there's headroom for
 * the response serialisation phase after scanning completes.
 */
export const MAX_SCAN_TIMEOUT_MS = 50_000; // 50 s

/**
 * Default timeout used when the caller does not supply `timeoutMs`.
 * Covers most real-world pages while leaving budget for cold-start overhead.
 */
export const DEFAULT_TIMEOUT_MS = 30_000; // 30 s

// ---------------------------------------------------------------------------
// Core utility
// ---------------------------------------------------------------------------

/**
 * Races `promise` against a deadline of `ms` milliseconds.
 *
 * On timeout throws an `AppError` with code `SCAN_TIMEOUT` so the route
 * handler can return a structured 408 response rather than a dangling
 * unhandled-rejection or a platform-level 504.
 *
 * The `cleanup` callback is called in both success and timeout paths so
 * callers can release resources (e.g. close a Playwright browser) regardless
 * of which branch resolves first.
 *
 * @example
 * ```ts
 * const report = await withTimeout(
 *   runScan(page),
 *   timeoutMs,
 *   async () => browser.close(),
 * );
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  cleanup?: () => void | Promise<void>
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new AppError(
          "SCAN_TIMEOUT",
          `Scan exceeded the ${ms}ms time limit. The target page may be too slow or unresponsive.`,
          408
        )
      );
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    await cleanup?.();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Clamps a caller-supplied timeout to the server-enforced ceiling.
 * Always call this before passing `timeoutMs` from a request body into
 * `withTimeout` to prevent clients from requesting unlimited execution time.
 */
export function clampTimeout(ms: number | undefined): number {
  if (ms === undefined || ms <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(ms, MAX_SCAN_TIMEOUT_MS);
}

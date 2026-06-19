/**
 * lib/scanner/multi-scan.ts
 *
 * Orchestrates concurrent accessibility scans across multiple internal pages
 * and merges their violations into a single unified result.
 *
 * Architecture:
 * ─────────────
 *  1. Receives the homepage's `RawScanResult` (which contains `extractedLinks`)
 *     and a list of sub-page URLs to scan.
 *  2. Runs up to MAX_CONCURRENT sub-page scans using `Promise.allSettled` so a
 *     single failing page cannot abort the entire crawl.
 *  3. Enforces a hard wall-clock deadline — sub-scans that would exceed the
 *     remaining budget are not started.
 *  4. Merges violations from all pages by rule `id`, deduplicating nodes by
 *     the composite key `(ruleId, targetSelector)`.
 *  5. Returns a `MultiScanResult` carrying the merged violations plus
 *     per-page summaries for the breakdown UI panel.
 *
 * Memory safety:
 *  - Each `runScan` call already closes its own browser in a `finally` block.
 *  - `Promise.allSettled` guarantees all promises settle before we proceed —
 *    no orphaned promises or unclosed browser sessions.
 *  - Merged results are plain serialisable objects (no Playwright references).
 *
 * Concurrency model:
 *  - Production-safe: each sub-scan launches its own isolated Chromium process
 *    via the existing `launchBrowser` utility.  MAX_CONCURRENT = 3 keeps
 *    memory within Vercel's serverless container limits.
 */

import { runScan } from "@/lib/scanner";
import { buildReport } from "@/lib/scanner/report-builder";
import type { RawScanResult, ResolvedScanOptions, RawAxeViolation, RawAxeNode } from "./types";
import type { PageScanSummary } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum pages scanned concurrently (homepage is NOT counted here). */
const MAX_CONCURRENT = 3;

/**
 * Per sub-scan timeout in ms.
 * Sub-scans get a tighter budget than the homepage scan because they share
 * the remaining wall-clock time and run in parallel.
 */
const SUB_SCAN_TIMEOUT_MS = 12_000;

/**
 * Minimum remaining budget required to bother launching sub-scans.
 * Attempting a scan with less than this margin would almost certainly timeout.
 */
const MIN_BUDGET_TO_SCAN_MS = 4_000;

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface MultiScanResult {
  /** Violations merged across all successfully scanned pages. */
  mergedViolations: RawAxeViolation[];
  /** Lightweight per-page breakdown for the UI panel. */
  pageResults: PageScanSummary[];
  /** Total number of pages that were successfully scanned. */
  pagesScanned: number;
}

// ---------------------------------------------------------------------------
// Violation merger
// ---------------------------------------------------------------------------

/**
 * Merges violations from multiple `RawScanResult` objects into a single flat
 * array, deduplicating by rule `id` and then by node `target` selector.
 *
 * Deduplication strategy:
 *  - Two violations with the same `id` are merged into one entry.
 *  - Within a merged violation, nodes are deduped by their `target` array
 *    joined as a string.  This prevents the same DOM element from appearing
 *    multiple times when it is present on more than one scanned page — e.g. a
 *    shared navbar with a colour-contrast violation.
 *
 * Impact of the merged violation is taken from whichever page reported it
 * first (they are always identical for the same rule id).
 */
export function mergeViolations(results: RawScanResult[]): RawAxeViolation[] {
  // Map: ruleId → merged violation
  const byId = new Map<string, RawAxeViolation>();
  // Map: ruleId → Set of already-seen node target keys (for node dedup)
  const seenNodes = new Map<string, Set<string>>();

  for (const result of results) {
    for (const violation of result.violations) {
      if (!byId.has(violation.id)) {
        // First time we see this rule — create the merged entry (no nodes yet).
        byId.set(violation.id, {
          id: violation.id,
          description: violation.description,
          help: violation.help,
          impact: violation.impact,
          tags: violation.tags,
          helpUrl: violation.helpUrl,
          nodes: [],
        });
        seenNodes.set(violation.id, new Set<string>());
      }

      const merged = byId.get(violation.id)!;
      const nodeSeen = seenNodes.get(violation.id)!;

      // Append only nodes we haven't seen before (cross-page dedup).
      for (const node of violation.nodes) {
        const nodeKey = node.target.join(" > ");
        if (nodeSeen.has(nodeKey)) continue;
        nodeSeen.add(nodeKey);

        const mergedNode: RawAxeNode = {
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        };
        merged.nodes.push(mergedNode);
      }
    }
  }

  return Array.from(byId.values());
}

// ---------------------------------------------------------------------------
// Per-page summary builder
// ---------------------------------------------------------------------------

/**
 * Converts a `RawScanResult` into the lightweight `PageScanSummary` shape
 * used in the UI breakdown panel.  Scoring is derived independently per page
 * so the summary reflects that page's individual accessibility health.
 */
function toPageSummary(raw: RawScanResult): PageScanSummary {
  const report = buildReport(raw, raw.url);
  return {
    url: report.url,
    score: report.score,
    totalIssues: report.totalIssues,
    totals: report.totals,
    durationMs: raw.durationMs,
  };
}

// ---------------------------------------------------------------------------
// Concurrent sub-page scanner
// ---------------------------------------------------------------------------

/**
 * Scans up to `MAX_CONCURRENT` internal links concurrently within the
 * remaining time budget.
 *
 * @param links         URLs to scan (already filtered and deduplicated).
 * @param baseOptions   Scanner options from the original request (wcagLevel etc.).
 * @param deadlineEpoch Unix epoch ms of the hard deadline.  Sub-scans started
 *                      after this point would not complete in time and are skipped.
 * @returns             Array of results for successfully-scanned sub-pages.
 */
async function scanLinksWithinBudget(
  links: string[],
  baseOptions: ResolvedScanOptions,
  deadlineEpoch: number
): Promise<RawScanResult[]> {
  const remaining = deadlineEpoch - Date.now();
  if (remaining < MIN_BUDGET_TO_SCAN_MS || links.length === 0) return [];

  // Clamp per-scan timeout to what we have left, minus a small safety margin.
  const perScanTimeout = Math.min(
    SUB_SCAN_TIMEOUT_MS,
    Math.floor((remaining - 1_000) * 0.9)
  );

  const targets = links.slice(0, MAX_CONCURRENT);

  // Launch all sub-scans simultaneously — Promise.allSettled ensures we
  // always await all of them (no dangling promises / zombie browsers).
  const settled = await Promise.allSettled(
    targets.map((url) =>
      runScan({
        ...baseOptions,
        url,
        timeoutMs: perScanTimeout,
        scanInternalLinks: false, // never recurse
      })
    )
  );

  const results: RawScanResult[] = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    }
    // Rejected scans are silently dropped — a single bad page should not
    // invalidate the rest of the crawl.  Server-side errors are already
    // logged by the scanner engine.
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs concurrent sub-page scans and returns merged violations plus per-page
 * summaries.
 *
 * @param homepageResult  Result from the initial homepage scan (must contain
 *                        `extractedLinks` from the link-extractor step).
 * @param baseOptions     Original resolved scan options.
 * @param startEpoch      Epoch ms when the overall request started (for budget).
 * @param totalBudgetMs   Total allowed execution time in ms (default 28 000).
 */
export async function runMultiPageScan(
  homepageResult: RawScanResult,
  baseOptions: ResolvedScanOptions,
  startEpoch: number,
  totalBudgetMs = 28_000
): Promise<MultiScanResult> {
  const deadlineEpoch = startEpoch + totalBudgetMs;
  const links = homepageResult.extractedLinks ?? [];

  // Build the homepage summary before we potentially modify anything.
  const homepageSummary = toPageSummary(homepageResult);

  // Scan sub-pages concurrently within the remaining budget.
  const subResults = await scanLinksWithinBudget(links, baseOptions, deadlineEpoch);

  // Merge violations from homepage + all successful sub-pages.
  const allResults = [homepageResult, ...subResults];
  const mergedViolations = mergeViolations(allResults);

  // Build summaries for sub-pages.
  const subSummaries = subResults.map(toPageSummary);
  const pageResults: PageScanSummary[] = [homepageSummary, ...subSummaries];

  return {
    mergedViolations,
    pageResults,
    pagesScanned: allResults.length,
  };
}

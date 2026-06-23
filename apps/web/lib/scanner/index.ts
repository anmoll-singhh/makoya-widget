/**
 * lib/scanner/index.ts
 *
 * Real WCAG accessibility scanning engine.
 *
 * Architecture:
 * ─────────────
 *  1. Launches Chromium via the existing `launchBrowser` / `openPage` utilities.
 *  2. Navigates to the target URL, waits for `networkidle` (up to the budget)
 *     so that JS-rendered content is included in the axe-core DOM snapshot.
 *  3. Runs AxeBuilder from @axe-core/playwright with the configured WCAG tags.
 *  4. De-duplicates violations by rule id (axe may produce duplicate entries
 *     when the same rule fires on both shadow-DOM and light-DOM passes).
 *  5. Performs a second-pass DOM check — each violating node's selector is
 *     re-evaluated in the live page to confirm the element still exists.
 *     Stale nodes (removed by JS after the initial render) are silently dropped.
 *  6. Normalises raw axe results into `RawAxeViolation` domain objects,
 *     safely truncating oversized HTML snippets.
 *  7. Returns a `RawScanResult` that the route handler scores and serialises.
 *
 * WCAG tags enabled:
 *   wcag2a · wcag2aa · wcag21a · wcag21aa · best-practice
 *
 * Memory safety:
 *  - Browser and page are always closed in a `finally` block.
 *  - HTML snippets are capped at MAX_HTML_SNIPPET_BYTES to prevent huge strings
 *    from bloating the serverless response payload.
 *  - Incomplete / needs-review results are excluded (only hard violations are
 *    reported to keep signal-to-noise ratio high).
 *
 * Error contract:
 *  - "BROWSER_LAUNCH_FAILED"  — Chromium would not start (from launcher.ts).
 *  - "PAGE_LOAD_FAILED"       — Navigation timed out or DNS failed.
 *  - "SCAN_TIMEOUT"           — Page took too long to respond.
 *  - "SCAN_ENGINE_ERROR"      — axe-core threw an unexpected runtime error.
 *  - "INTERNAL_SERVER_ERROR"  — catch-all for unknown failures.
 */

import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright-core";
import { createHash } from "crypto";

import { launchBrowser, openPage } from "@/lib/browser/launcher";
import { AppError } from "@/lib/utils/error";
import { extractSameDomainLinks } from "@/lib/scanner/link-extractor";
import { buildA11ySkeleton, computeContentHash } from "./content-hash";
import { SCORING_MODEL_VERSION } from "@/lib/utils/score";
import type { EngineMeta, SeverityLevel } from "@/types";
import type { ResolvedScanOptions, RawAxeViolation, RawAxeNode, RawScanResult } from "./types";

/**
 * Engine pipeline version. Bump whenever the scan PIPELINE changes in a way
 * that could alter results (ruleset, freeze/settle behaviour, custom checks).
 * Stored in `engine_meta` so a score change can be attributed to the engine
 * rather than the site.
 */
const ENGINE_VERSION = 2 as const;

/**
 * Version of the custom-check suite. Bump when adding/removing/altering a
 * custom check so the `rulesetHash` changes and the shift is attributable.
 */
const CUSTOM_CHECKS_VERSION = 1 as const;

/** Stable list of custom-check ids (folded into the ruleset hash). */
const CUSTOM_CHECK_IDS = [
  "generic-link-text",
  "new-window-no-warning",
  "document-link-no-type",
  "media-autoplay",
  "focus-ring-hidden",
  "icon-button-no-label",
] as const;

/** Max DOM nodes displayed per issue (true count lives in `totalInstances`). */
const MAX_DISPLAY_NODES = 10;

// ---------------------------------------------------------------------------
// Custom DOM checks — supplement axe-core with rules it doesn't cover
// ---------------------------------------------------------------------------

/**
 * Runs 6 custom DOM checks inside the live page that axe-core misses:
 *  1. generic-link-text      — "click here", "here", "read more", etc.
 *  2. new-window-no-warning  — target="_blank" without new-window notice
 *  3. document-link-no-type  — links to .pdf/.doc/.xls without file-type text
 *  4. media-autoplay         — <video>/<audio> with autoplay attribute
 *  5. focus-ring-hidden      — inline style="outline:none" on focusable elements
 *  6. icon-button-no-label   — buttons containing only SVG/img with no aria-label
 *
 * All checks run in a single page.evaluate() call (one browser round-trip).
 * The function is non-fatal — any failure returns an empty array.
 */
async function runCustomChecks(page: Page): Promise<RawAxeViolation[]> {
  type CheckNode  = { selector: string; html: string; failureSummary: string };
  type CheckResult = {
    id: string; description: string; help: string; impact: string;
    /** TRUE number of matched elements (before display capping). */
    totalInstances: number;
    nodes: CheckNode[];
  };

  let raw: CheckResult[];
  try {
    raw = await page.evaluate((): CheckResult[] => {
      const out: CheckResult[] = [];

      // ── helpers ────────────────────────────────────────────────────────────
      function sel(el: Element): string {
        if (el.id) return `#${CSS.escape(el.id)}`;
        const parts: string[] = [];
        let cur: Element | null = el;
        while (cur && cur.tagName && parts.length < 4) {
          let s = cur.tagName.toLowerCase();
          if (cur.id) { s = `#${CSS.escape(cur.id)}`; parts.unshift(s); break; }
          const sibs = Array.from(cur.parentElement?.children ?? []).filter(c => c.tagName === cur!.tagName);
          if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
          parts.unshift(s);
          cur = cur.parentElement;
        }
        return parts.join(" > ");
      }
      function html(el: Element): string {
        const h = el.outerHTML ?? "";
        return h.length > 300 ? h.slice(0, 300) + "…" : h;
      }
      function txt(el: Element): string {
        return (el.textContent ?? "").trim().toLowerCase();
      }
      function attr(el: Element, name: string): string {
        return (el.getAttribute(name) ?? "").toLowerCase();
      }

      // ── 1. Generic / ambiguous link text ───────────────────────────────────
      const GENERIC = ["click here", "here", "read more", "more", "learn more",
                       "click", "this link", "continue", "details", "info", "link"];
      const genericLinks = Array.from(document.querySelectorAll("a[href]")).filter(el => {
        const t = txt(el);
        const al = attr(el, "aria-label");
        const check = al || t;
        return GENERIC.some(g => check === g);
      });
      if (genericLinks.length) {
        out.push({
          id: "generic-link-text",
          description: "Links use non-descriptive text that loses meaning out of context",
          help: 'Replace generic text like "click here" or "read more" with a description of the destination',
          impact: "serious",
          totalInstances: genericLinks.length,
          nodes: genericLinks.slice(0, 6).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: `Link text "${txt(el) || attr(el, "aria-label")}" is non-descriptive`,
          })),
        });
      }

      // ── 2. New-window links without warning ────────────────────────────────
      const newWin = Array.from(document.querySelectorAll("a[target='_blank']")).filter(el => {
        const combined = txt(el) + attr(el, "aria-label") + attr(el, "title");
        return !/(new (window|tab)|opens in)/i.test(combined);
      });
      if (newWin.length) {
        out.push({
          id: "new-window-no-warning",
          description: "Links that open in a new window or tab do not warn the user",
          help: 'Add "(opens in new window)" to link text or aria-label for target="_blank" links',
          impact: "minor",
          totalInstances: newWin.length,
          nodes: newWin.slice(0, 6).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: "Link opens in new window/tab without notifying the user",
          })),
        });
      }

      // ── 3. Document links without file-type indicator ──────────────────────
      const DOC_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|zip)(\?|$)/i;
      const docLinks = Array.from(document.querySelectorAll("a[href]")).filter(el => {
        const href = attr(el, "href");
        if (!DOC_PATTERN.test(href)) return false;
        const combined = txt(el) + attr(el, "aria-label");
        return !/(pdf|word|excel|spreadsheet|document|doc|xls|ppt|csv|download)/i.test(combined);
      });
      if (docLinks.length) {
        out.push({
          id: "document-link-no-type",
          description: "Links to downloadable documents do not identify the file format",
          help: 'Include the file type in the link text, e.g. "Annual Report (PDF)"',
          impact: "moderate",
          totalInstances: docLinks.length,
          nodes: docLinks.slice(0, 5).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: `Document link to "${attr(el, "href").split("/").pop()}" has no file-type indicator`,
          })),
        });
      }

      // ── 4. Autoplay media (WCAG 1.4.2) ────────────────────────────────────
      const autoplay = Array.from(
        document.querySelectorAll("video[autoplay], audio[autoplay]")
      ).filter(el => !el.hasAttribute("muted") || el.tagName === "AUDIO");
      if (autoplay.length) {
        out.push({
          id: "media-autoplay",
          description: "Media elements start playing without user interaction",
          help: "Remove autoplay, or ensure the media has no audio and provide a pause mechanism",
          impact: "serious",
          totalInstances: autoplay.length,
          nodes: autoplay.slice(0, 4).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: `${el.tagName.toLowerCase()} autoplays — users cannot control audio playback`,
          })),
        });
      }

      // ── 5. Focus ring hidden via inline style ──────────────────────────────
      const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";
      const noFocus = Array.from(document.querySelectorAll(FOCUSABLE)).filter(el => {
        const s = el.getAttribute("style") ?? "";
        return /outline\s*:\s*0|outline\s*:\s*none/i.test(s);
      });
      if (noFocus.length) {
        out.push({
          id: "focus-ring-hidden",
          description: "Focusable elements have their focus indicator removed via inline style",
          help: "Never set outline:none on focusable elements without providing a custom focus style",
          impact: "serious",
          totalInstances: noFocus.length,
          nodes: noFocus.slice(0, 6).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: 'Inline style removes focus ring (outline:none / outline:0)',
          })),
        });
      }

      // ── 6. Icon-only buttons without accessible label ──────────────────────
      const iconBtns = Array.from(
        document.querySelectorAll("button, [role='button']")
      ).filter(el => {
        const t = (el.textContent ?? "").replace(/\s+/g, "");
        const al = attr(el, "aria-label");
        const alby = attr(el, "aria-labelledby");
        const title = attr(el, "title");
        if (al || alby || title) return false;
        const hasSvg = el.querySelector("svg");
        const hasImg = el.querySelector("img");
        const hasText = t.length > 0;
        return (hasSvg || hasImg) && !hasText;
      });
      if (iconBtns.length) {
        out.push({
          id: "icon-button-no-label",
          description: "Icon-only buttons have no accessible name for screen readers",
          help: "Add aria-label or aria-labelledby to every button that contains only an icon",
          impact: "critical",
          totalInstances: iconBtns.length,
          nodes: iconBtns.slice(0, 6).map(el => ({
            selector: sel(el),
            html: html(el),
            failureSummary: "Button contains only SVG/img with no accessible label",
          })),
        });
      }

      return out;
    });
  } catch {
    return [];
  }

  return raw
    .filter(r => r.nodes.length > 0)
    .map(r => ({
      id: r.id,
      description: r.description,
      help: r.help,
      impact: normaliseImpact(r.impact),
      tags: CUSTOM_CHECK_TAGS[r.id] ?? ["custom", "best-practice"],
      helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/",
      totalInstances: r.totalInstances,
      nodes: r.nodes.map(n => ({
        target: [n.selector],
        html: truncateHtml(n.html),
        failureSummary: n.failureSummary,
      })),
    }));
}

/**
 * Per-custom-check axe-style tags, so each maps to a real WCAG criterion via
 * `resolveWcag`. Without specific tags the evidence layer can't show "the
 * impacted standard". (Previously all custom checks shared a generic tag set.)
 */
const CUSTOM_CHECK_TAGS: Record<string, string[]> = {
  "generic-link-text":     ["custom", "wcag2a",  "wcag244"], // 2.4.4 Link Purpose (In Context)
  "new-window-no-warning": ["custom", "best-practice"],      // no specific SC at A/AA
  "document-link-no-type": ["custom", "wcag2a",  "wcag244"], // 2.4.4 Link Purpose (In Context)
  "media-autoplay":        ["custom", "wcag2a",  "wcag142"], // 1.4.2 Audio Control
  "focus-ring-hidden":     ["custom", "wcag2aa", "wcag247"], // 2.4.7 Focus Visible
  "icon-button-no-label":  ["custom", "wcag2a",  "wcag412"], // 4.1.2 Name, Role, Value
};

/**
 * Stabilises the page for a DETERMINISTIC scan, before axe runs:
 *  1. Freezes all CSS animations/transitions (reducedMotion is already emulated
 *     at the context level, but this also pins any JS-independent CSS motion).
 *  2. Disables native lazy-loading and scrolls the full page once so
 *     IntersectionObserver / lazy content mounts — otherwise off-screen content
 *     may or may not exist at scan time depending on machine load, which axe
 *     scans and which would make results flaky.
 *  3. Returns to the top.
 *
 * Non-fatal: any failure leaves the page as-is rather than aborting the scan.
 */
async function stabilisePage(page: Page): Promise<void> {
  try {
    await page.addStyleTag({
      content: `*,*::before,*::after{animation:none!important;transition:none!important;` +
        `animation-duration:0s!important;transition-duration:0s!important;` +
        `scroll-behavior:auto!important;caret-color:transparent!important}`,
    });
  } catch { /* non-fatal */ }

  try {
    // Force eager loading so lazy images/iframes resolve deterministically.
    await page.evaluate(() => {
      document.querySelectorAll("[loading='lazy']").forEach((el) => {
        el.setAttribute("loading", "eager");
      });
    });
    // Scroll through the page in viewport-sized steps to trigger observers,
    // then return to the top so the screenshot is the hero.
    await page.evaluate(async () => {
      const step = window.innerHeight || 800;
      const max = document.body ? document.body.scrollHeight : 0;
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      window.scrollTo(0, 0);
    });
  } catch { /* non-fatal */ }
}

/** Computes the structural/a11y content hash from the live page (best-effort). */
async function computePageContentHash(page: Page): Promise<string> {
  try {
    // buildA11ySkeleton is self-contained; Playwright serializes it and runs it
    // in the browser, where its `root = document.documentElement` default
    // applies. Cast resolves the evaluate() arg-typing (no arg is passed).
    const skeleton = await page.evaluate(buildA11ySkeleton as () => string);
    return computeContentHash(skeleton);
  } catch {
    return "";
  }
}

/**
 * Builds the ruleset hash — folds the enabled axe tags, the exact axe version,
 * the custom-check ids, and the custom-check suite version into one digest, so
 * any change to WHAT we test is attributable in `engine_meta`.
 */
function buildRulesetHash(axeVersion: string): string {
  const material = JSON.stringify({
    axeTags: [...AXE_TAGS],
    axeVersion,
    customChecks: [...CUSTOM_CHECK_IDS],
    customChecksVersion: CUSTOM_CHECKS_VERSION,
    engineVersion: ENGINE_VERSION,
  });
  return createHash("sha256").update(material).digest("hex").slice(0, 32);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * WCAG rule tags passed to axe-core.
 *
 * wcag2a / wcag2aa   — WCAG 2.0 level A and AA (the legal baseline)
 * wcag21a / wcag21aa — WCAG 2.1 additions (mobile & cognitive criteria)
 * best-practice      — High-value non-normative heuristics axe bundles
 *
 * We do NOT include wcag2aaa because AAA conformance is rarely mandated,
 * and its violations would dilute the severity signal for most sites.
 */
/**
 * Full WCAG rule set for maximum audit coverage.
 *
 * wcag2a / wcag2aa     — WCAG 2.0 A and AA (the ADA legal baseline)
 * wcag21a / wcag21aa   — WCAG 2.1 additions (mobile, cognitive criteria)
 * wcag22a / wcag22aa   — WCAG 2.2 additions (focus appearance, drag motions,
 *                        target sizes) — the current published standard
 * best-practice        — High-value non-normative checks axe bundles
 *
 * wcag2aaa / wcag21aaa / wcag22aaa are excluded — AAA is rarely mandated
 * and would dilute severity signal with impractical requirements.
 */
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
  "best-practice",
] as const;

/**
 * Maximum byte length for a single HTML snippet stored in the report.
 * Snippets beyond this limit are truncated with a sentinel suffix so the
 * report consumer still knows the element type without storing a 50 kB blob.
 */
const MAX_HTML_SNIPPET_BYTES = 512;

/**
 * Milliseconds to wait for network idle after DOMContentLoaded.
 *
 * Modern SPAs (React, Vue, Next.js) continuously poll APIs and never truly
 * reach "networkidle". Capping at 2.5 s means we proceed as soon as the
 * initial render settles rather than burning half our budget waiting for a
 * state that never arrives.
 */
const NETWORK_IDLE_TIMEOUT_MS = 2_500;

/**
 * Milliseconds budgeted for the full axe-core analysis pass.
 *
 * Budget math (60 s Vercel limit):
 *   ~2 s  browser launch
 *   18 s  navigation cap (see below)
 *   2.5 s network idle
 *   18 s  axe full pass  ← this constant
 *   9 s   axe fallback   ← AXE_FALLBACK_TIMEOUT_MS
 *   2 s   screenshot + cleanup
 *   Total fallback path: 2+18+2.5+18+9+2 = 51.5 s  ✓ fits inside 60 s
 */
const AXE_ANALYSIS_TIMEOUT_MS = 18_000;

// ---------------------------------------------------------------------------
// HTML truncation
// ---------------------------------------------------------------------------

/**
 * Safely truncates an HTML snippet to MAX_HTML_SNIPPET_BYTES.
 *
 * Uses byte length (not character length) to cap the string correctly for
 * multi-byte Unicode characters found in some attribute values.
 * The sentinel suffix `…[truncated]` signals to the UI that the snippet
 * was clipped and should not be presented as the full element source.
 */
function truncateHtml(html: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(html);

  if (bytes.byteLength <= MAX_HTML_SNIPPET_BYTES) return html;

  // Decode only the first MAX_HTML_SNIPPET_BYTES bytes back to a string.
  // TextDecoder with `fatal: false` replaces incomplete multi-byte sequences
  // at the boundary with the replacement character (U+FFFD) rather than
  // throwing — safe for display purposes.
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const truncated = decoder.decode(bytes.slice(0, MAX_HTML_SNIPPET_BYTES));
  return `${truncated}…[truncated]`;
}

// ---------------------------------------------------------------------------
// Impact normalisation
// ---------------------------------------------------------------------------

/** axe-core impact is typed as string | null upstream; narrow it here. */
function normaliseImpact(raw: string | null | undefined): SeverityLevel | null {
  if (raw === "critical" || raw === "serious" || raw === "moderate" || raw === "minor") {
    return raw;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Second-pass DOM verification
// ---------------------------------------------------------------------------

/**
 * Re-evaluates each node selector against the live page DOM.
 *
 * Rationale:
 *  axe-core captures its results while the page is in a specific state.
 *  Some SPAs mutate the DOM between the axe pass and when we process results
 *  (e.g. loading spinners removed, lazy components mounted). Rather than
 *  reporting stale violations, we verify that each element still exists.
 *
 * Implementation:
 *  - We batch all selectors into a single `page.evaluate` call to avoid
 *    N round-trips to the browser process.
 *  - `document.querySelector` returns `null` for selectors that no longer
 *    match anything; we treat null as "node removed".
 *  - Complex axe target arrays (e.g. shadow-DOM pierce paths) are joined
 *    with a space to form a compound selector.  If the browser rejects the
 *    selector (throws a SyntaxError), the node is conservatively kept.
 *
 * @param page      The live Playwright page.
 * @param selectors Array of CSS selector paths (one per violating node).
 * @returns         Set of indices whose corresponding element still exists.
 */
async function verifyNodesExist(
  page: Page,
  selectors: string[]
): Promise<Set<number>> {
  if (selectors.length === 0) return new Set();

  try {
    const results: boolean[] = await page.evaluate((selectorList: string[]) => {
      return selectorList.map((selector) => {
        try {
          return document.querySelector(selector) !== null;
        } catch {
          // Malformed selector — conservatively treat as still present.
          return true;
        }
      });
    }, selectors);

    const existingIndices = new Set<number>();
    results.forEach((exists, i) => {
      if (exists) existingIndices.add(i);
    });
    return existingIndices;
  } catch {
    // If the whole evaluation fails (context destroyed, navigation, etc.),
    // conservatively keep all nodes rather than silently dropping violations.
    return new Set(selectors.map((_, i) => i));
  }
}

// ---------------------------------------------------------------------------
// Violation normalisation + second-pass filter
// ---------------------------------------------------------------------------

/**
 * Maps raw axe violations to normalised domain objects and performs
 * second-pass DOM verification to drop stale nodes.
 *
 * De-duplication strategy:
 *  axe-core can emit the same rule id multiple times when a page contains
 *  both light-DOM and shadow-DOM violations of the same rule.  We merge them
 *  by rule id, concatenating their node lists after dedup by target selector.
 *
 * @param page        Live page for DOM verification.
 * @param rawResults  Raw axe violations from AxeBuilder.analyze().
 */
async function normaliseViolations(
  page: Page,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawResults: any[]
): Promise<RawAxeViolation[]> {
  // ── Step 1: merge duplicates by rule id ──────────────────────────────────
  const byId = new Map<string, RawAxeViolation>();

  for (const v of rawResults) {
    const impact = normaliseImpact(v.impact);
    const existing = byId.get(v.id);

    if (!existing) {
      byId.set(v.id, {
        id: v.id,
        description: v.description ?? "",
        help: typeof v.help === "string" ? v.help : "",
        impact,
        tags: Array.isArray(v.tags) ? v.tags : [],
        helpUrl: v.helpUrl ?? "",
        nodes: [],
        totalInstances: 0,
      });
    }
  }

  // ── Step 2: collect all nodes (dedup by first target selector) ───────────
  const nodeTargetSeen = new Map<string, Set<string>>(); // ruleId → set of target strings

  for (const v of rawResults) {
    if (!nodeTargetSeen.has(v.id)) nodeTargetSeen.set(v.id, new Set());
    const seen = nodeTargetSeen.get(v.id)!;

    for (const node of v.nodes ?? []) {
      const target: string[] = Array.isArray(node.target) ? node.target : [];
      const targetKey = target.join(" > ");
      if (seen.has(targetKey)) continue;
      seen.add(targetKey);

      byId.get(v.id)!.nodes.push({
        target,
        html: truncateHtml(typeof node.html === "string" ? node.html : ""),
        failureSummary:
          typeof node.failureSummary === "string" ? node.failureSummary : null,
      });
    }
  }

  // ── Step 3: second-pass DOM verification ─────────────────────────────────
  // Flatten all (ruleId, nodeIndex, selector) tuples for a single batched eval.
  type NodeRef = { ruleId: string; nodeIndex: number; selector: string };
  const nodeRefs: NodeRef[] = [];

  for (const [ruleId, violation] of byId) {
    violation.nodes.forEach((node, idx) => {
      // Join target array into a compound CSS selector for querySelector.
      // axe uses arrays for shadow-DOM paths; space-joining approximates
      // the pierce path for light-DOM elements.
      const selector = node.target.join(" ");
      nodeRefs.push({ ruleId, nodeIndex: idx, selector });
    });
  }

  const selectors = nodeRefs.map((r) => r.selector);
  const existingSet = await verifyNodesExist(page, selectors);

  // Collect the indices of nodes that failed verification (no longer in DOM).
  const toRemove = new Map<string, Set<number>>();
  nodeRefs.forEach(({ ruleId, nodeIndex }, refIdx) => {
    if (!existingSet.has(refIdx)) {
      if (!toRemove.has(ruleId)) toRemove.set(ruleId, new Set());
      toRemove.get(ruleId)!.add(nodeIndex);
    }
  });

  // Remove stale nodes and purge violations that have no remaining nodes.
  // `totalInstances` is the TRUE verified count; `nodes` is display-capped.
  const verified: RawAxeViolation[] = [];
  for (const [ruleId, violation] of byId) {
    const staleIndices = toRemove.get(ruleId) ?? new Set<number>();
    const liveNodes: RawAxeNode[] = violation.nodes.filter(
      (_, idx) => !staleIndices.has(idx)
    );
    if (liveNodes.length > 0) {
      verified.push({
        ...violation,
        totalInstances: liveNodes.length,
        nodes: liveNodes.slice(0, MAX_DISPLAY_NODES),
      });
    }
  }

  return verified;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Runs a full WCAG accessibility scan against the given URL.
 *
 * @param options  Validated scan options from the route handler.
 * @returns        Raw scan result ready for scoring and serialisation.
 *
 * @throws {AppError}  "BROWSER_LAUNCH_FAILED" | "PAGE_LOAD_FAILED" |
 *                     "SCAN_TIMEOUT" | "SCAN_ENGINE_ERROR" |
 *                     "INTERNAL_SERVER_ERROR"
 */
export async function runScan(
  options: ResolvedScanOptions
): Promise<RawScanResult> {
  const { url, wcagLevel, timeoutMs } = options;

  const startTime = Date.now();
  const { browser, cleanup } = await launchBrowser();

  try {
    const { page } = await openPage(browser);

    // ── Navigate ────────────────────────────────────────────────────────────
    try {
      await page.goto(url, {
        // Cap navigation to 18 s so axe + teardown fit in the 60 s Vercel limit.
        timeout: Math.min(timeoutMs * 0.8, 18_000),
        // DOMContentLoaded fires quickly; we then separately wait for network idle.
        waitUntil: "domcontentloaded",
      });
    } catch (navErr) {
      const msg = navErr instanceof Error ? navErr.message : String(navErr);
      if (msg.toLowerCase().includes("timeout")) {
        throw new AppError(
          "SCAN_TIMEOUT",
          `Page did not load within the allowed time: ${url}`,
          504
        );
      }
      throw new AppError(
        "PAGE_LOAD_FAILED",
        `Navigation failed for "${url}": ${msg}`,
        502
      );
    }

    // ── Wait for network idle ────────────────────────────────────────────────
    // Best-effort: if the page keeps making requests (e.g. infinite polling),
    // we proceed after NETWORK_IDLE_TIMEOUT_MS rather than blocking forever.
    try {
      await page.waitForLoadState("networkidle", {
        timeout: NETWORK_IDLE_TIMEOUT_MS,
      });
    } catch {
      // Non-fatal — proceed with whatever DOM state exists.
      // This is intentional: some SPAs never reach true network idle.
    }

    // ── Stabilise + settle the page for a DETERMINISTIC scan ──────────────────
    // Wait for load, freeze animations, force lazy content to mount (scroll),
    // then a fixed settle buffer. A frozen, fully-mounted DOM is what makes
    // axe's (already deterministic) output reproducible run-to-run.
    const settleMs = options.scanInternalLinks ? 3_000 : 5_000;
    try {
      await page.waitForLoadState("load", { timeout: 4_000 });
    } catch { /* non-fatal — fires quickly after networkidle */ }
    await stabilisePage(page);
    await page.waitForTimeout(settleMs);

    // ── Screenshot ──────────────────────────────────────────────────────────
    // Taken after the page renders, before axe runs. Best-effort only.
    let screenshot: string | undefined;
    try {
      const buf = await page.screenshot({
        type: "jpeg",
        quality: 60,
        clip: { x: 0, y: 0, width: 1280, height: 720 },
      });
      screenshot = `data:image/jpeg;base64,${buf.toString("base64")}`;
    } catch {
      // Non-fatal — preview is decorative.
    }

    // ── Run axe-core ─────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let axeResults: any;

    /**
     * Builds an AxeBuilder for the given rule tags.
     *
     * Iframe strategy — "smart" not "blanket":
     *   We DO analyse first-party iframes (embedded contact forms, checkout
     *   widgets, self-hosted video players) because the site owner can fix
     *   those violations.  We EXCLUDE known third-party service iframes that
     *   the owner cannot control and that dramatically inflate analysis time.
     *   The iframes:false option is NOT used so first-party iframes ARE
     *   analysed — this is the key difference from a shallow scanner.
     *
     * Third-party exclusions cover: live chat (Tawk, Intercom, Crisp, Drift,
     * Zendesk), CRM widgets (HubSpot), analytics (GTM, Hotjar, Segment),
     * social/media embeds (YouTube, Vimeo, Spotify, Twitter/X, Instagram,
     * Facebook), ad networks (DoubleClick, Adsense), and cookie consent banners.
     */
    const buildAxe = (tags: readonly string[]) =>
      new AxeBuilder({ page })
        .withTags([...tags])
        // ── Third-party chat & support ────────────────────────────────────
        .exclude("iframe[src*='tawk.to']")
        .exclude("iframe[src*='intercom']")
        .exclude("iframe[src*='crisp.chat']")
        .exclude("iframe[src*='zendesk.com']")
        .exclude("iframe[src*='hubspot.com']")
        .exclude("iframe[src*='drift.com']")
        .exclude("iframe[src*='freshchat']")
        .exclude("iframe[src*='livechatinc']")
        // ── Analytics & tag managers ──────────────────────────────────────
        .exclude("iframe[src*='googletagmanager']")
        .exclude("iframe[src*='hotjar']")
        .exclude("iframe[src*='segment.com']")
        .exclude("iframe[src*='fullstory']")
        .exclude("iframe[src*='clarity.ms']")
        // ── Social / media embeds ─────────────────────────────────────────
        .exclude("iframe[src*='youtube.com']")
        .exclude("iframe[src*='youtu.be']")
        .exclude("iframe[src*='vimeo.com']")
        .exclude("iframe[src*='spotify.com']")
        .exclude("iframe[src*='twitter.com']")
        .exclude("iframe[src*='platform.twitter']")
        .exclude("iframe[src*='instagram.com']")
        .exclude("iframe[src*='facebook.com']")
        .exclude("iframe[src*='fb.com']")
        // ── Advertising ───────────────────────────────────────────────────
        .exclude("iframe[src*='doubleclick']")
        .exclude("iframe[src*='googlesyndication']")
        .exclude("iframe[src*='adservice.google']")
        // ── Cookie consent banners ────────────────────────────────────────
        .exclude("iframe[src*='cookiebot']")
        .exclude("iframe[src*='onetrust']")
        .exclude("iframe[src*='cookiepro']")
        // Only collect violations — we discard passes/incomplete anyway, and
        // skipping their serialisation shaves analysis time WITHOUT changing
        // which violations are found (so results stay deterministic).
        .options({ resultTypes: ["violations"] });

    const makeTimeout = (ms: number) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("axe analysis timeout")), ms)
      );

    try {
      // ── Single full-ruleset pass — NEVER degrade the ruleset ──────────────
      // Determinism contract: we run the IDENTICAL full ruleset every time. On
      // timeout we FAIL honestly (SCAN_TIMEOUT) rather than silently switching
      // to a reduced ruleset, because a reduced ruleset finds fewer violations
      // and would make the SAME site score differently between runs. Returning
      // "no score" is honest; returning a "different score" is not.
      axeResults = await Promise.race([
        buildAxe(AXE_TAGS).analyze(),
        makeTimeout(AXE_ANALYSIS_TIMEOUT_MS),
      ]);
    } catch (axeErr) {
      const msg = axeErr instanceof Error ? axeErr.message : String(axeErr);

      if (msg.includes("timeout")) {
        throw new AppError(
          "SCAN_TIMEOUT",
          "The page took too long to analyse within the allowed time. " +
            "Please try again; very large pages may need a few attempts.",
          504
        );
      }

      // Non-timeout engine error — surface immediately.
      throw new AppError(
        "SCAN_ENGINE_ERROR",
        `axe-core analysis failed: ${msg}`,
        500
      );
    }

    // ── Normalise violations + second-pass verification ──────────────────────
    const axeViolations = await normaliseViolations(
      page,
      axeResults.violations ?? []
    );

    // ── Custom DOM checks (supplement axe-core) ───────────────────────────────
    // Run in parallel with link extraction — both need the live page DOM.
    // Results are merged with axe violations; any id already reported by axe
    // is skipped to avoid double-counting.
    let customViolations: RawAxeViolation[] = [];
    try {
      customViolations = await runCustomChecks(page);
    } catch {
      // Non-fatal — custom checks are purely supplementary.
    }
    const axeIds = new Set(axeViolations.map(v => v.id));
    const violations = [
      ...axeViolations,
      ...customViolations.filter(v => !axeIds.has(v.id)),
    ];

    // ── Extract internal links (optional, before browser closes) ─────────────
    // Runs inside the same browser session so no extra launch cost is paid.
    // Extraction is best-effort: any failure returns an empty array.
    let extractedLinks: string[] | undefined;
    if (options.scanInternalLinks) {
      extractedLinks = await extractSameDomainLinks(page, url, 3);
    }

    // ── Provenance (engine_meta) ──────────────────────────────────────────────
    // axe reports the exact engine version in its results; fall back gracefully.
    const axeVersion: string =
      (axeResults?.testEngine?.version as string | undefined) ?? "unknown";
    const contentHash = await computePageContentHash(page);
    const engineMeta: EngineMeta = {
      axeVersion,
      engineVersion: ENGINE_VERSION,
      scoringModelVersion: SCORING_MODEL_VERSION,
      rulesetHash: buildRulesetHash(axeVersion),
      contentHash,
    };

    const durationMs = Date.now() - startTime;

    return {
      url: page.url(), // use final URL after redirects
      scannedAt: new Date().toISOString(),
      wcagLevel,
      violations,
      javascriptRendered: true,
      durationMs,
      extractedLinks,
      screenshot,
      engineMeta,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new AppError("INTERNAL_SERVER_ERROR", `Unexpected scanner error: ${msg}`, 500);
  } finally {
    // ALWAYS runs — prevents zombie Chromium processes in Lambda containers.
    await cleanup();
  }
}

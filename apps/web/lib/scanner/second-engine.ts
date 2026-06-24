/**
 * lib/scanner/second-engine.ts
 *
 * Runs a SECOND, independent accessibility engine (HTML_CodeSniffer — the same
 * engine Pa11y uses) inside the live Playwright page, so its findings can be
 * cross-validated against axe-core (see `cross-validate.ts`). Two independent
 * engines agreeing on a rule is the strongest automated signal we can give.
 *
 * Design constraints (this is why the code looks the way it does):
 *  - NEVER break the scan. Every step is wrapped; ANY failure → return `[]`.
 *    axe-core remains the source of truth; the second engine only ever ADDS
 *    signal, never removes or blocks.
 *  - NO hard dependency / import. HTMLCS is injected as a script STRING obtained
 *    at runtime from a pluggable source, so a missing/edge bundling situation in
 *    the Lambda can't fail the build or the scan — it just yields no second-
 *    engine findings until the source is wired and verified live.
 *  - Deterministic-friendly: runs after `stabilisePage`, same frozen DOM axe
 *    sees; results are normalised + sorted by the caller (cross-validate).
 *
 * Status: ships OFF by default (`ResolvedScanOptions.useSecondEngine`). The pure
 * merge logic in `cross-validate.ts` is fully unit-tested; this in-browser
 * runner needs a live Lambda verification pass before being enabled in prod.
 */

import type { Page } from "playwright-core";
import type { SecondEngineFinding } from "./cross-validate";

/** Map an HTMLCS code's embedded SC ("1_4_3") to a dotted criterion ("1.4.3"). */
export function htmlcsCodeToCriterion(code: string): string | null {
  // HTMLCS codes look like:
  //   WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail
  // The criterion is the "1_4_3" segment.
  const m = code.match(/\.(\d{1,2})_(\d{1,2})_(\d{1,2})\./);
  if (!m) return null;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

/** HTMLCS message type 1 = ERROR, 2 = WARNING, 3 = NOTICE. We keep errors only. */
const HTMLCS_ERROR = 1;

/**
 * Returns the HTMLCS source JavaScript to inject, or null if unavailable.
 * Pluggable + guarded: tries the `html_codesniffer` package's built bundle via
 * a runtime require of `fs`; on any failure returns null (→ no second engine).
 * Kept out of the static import graph on purpose (see file header).
 */
async function loadHtmlcsSource(): Promise<string | null> {
  try {
    // Dynamic, guarded — never part of the static bundle graph.
    const { readFileSync } = await import("node:fs");
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    // Common build locations across html_codesniffer versions.
    const candidates = ["html_codesniffer/build/HTMLCS.js"];
    for (const c of candidates) {
      try {
        const path = require.resolve(c);
        return readFileSync(path, "utf8");
      } catch {
        /* try next */
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Runs HTML_CodeSniffer (WCAG2AA) in the page and returns normalised findings.
 * Best-effort + bounded: on any error or timeout, returns `[]`.
 *
 * @param page       Live, stabilised Playwright page (post-axe is fine).
 * @param timeoutMs  Hard cap so a hung engine can't eat the scan budget.
 */
export async function runSecondEngine(
  page: Page,
  timeoutMs = 8_000
): Promise<SecondEngineFinding[]> {
  const source = await loadHtmlcsSource();
  if (!source) return [];

  try {
    await page.addScriptTag({ content: source });

    type RawMsg = { type: number; code: string; msg: string };
    const run = page.evaluate(async (): Promise<RawMsg[]> => {
      // HTMLCS attaches itself to window.HTMLCS once the script tag runs.
      const HTMLCS = (window as unknown as { HTMLCS?: unknown }).HTMLCS as
        | {
            process: (std: string, doc: Document, cb: () => void) => void;
            getMessages: () => RawMsg[];
          }
        | undefined;
      if (!HTMLCS) return [];
      return await new Promise<RawMsg[]>((resolve) => {
        try {
          HTMLCS.process("WCAG2AA", document, () => {
            try {
              resolve(HTMLCS.getMessages());
            } catch {
              resolve([]);
            }
          });
        } catch {
          resolve([]);
        }
      });
    });

    const timeout = new Promise<RawMsg[]>((resolve) =>
      setTimeout(() => resolve([]), timeoutMs)
    );
    const messages = await Promise.race([run, timeout]);

    // Collapse to one finding per code, counting instances; errors only.
    const byCode = new Map<string, SecondEngineFinding>();
    for (const m of messages) {
      if (m.type !== HTMLCS_ERROR) continue;
      const existing = byCode.get(m.code);
      if (existing) {
        existing.totalInstances += 1;
        continue;
      }
      byCode.set(m.code, {
        code: m.code,
        wcagCriterion: htmlcsCodeToCriterion(m.code),
        // HTMLCS doesn't grade severity; treat all hard errors as "serious".
        impact: "serious",
        description: typeof m.msg === "string" ? m.msg.slice(0, 300) : "",
        help: "Confirmed by a second engine (HTML_CodeSniffer).",
        totalInstances: 1,
      });
    }
    return [...byCode.values()];
  } catch {
    return [];
  }
}

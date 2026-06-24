/**
 * lib/scanner/cross-validate.ts
 *
 * Merges findings from TWO independent accessibility engines (axe-core + a
 * second engine such as HTML_CodeSniffer) into one violation list, and tags
 * each with a CONFIDENCE level:
 *
 *   - "high"     — both engines independently flagged the same rule. Cross-
 *                  validated → very unlikely to be a false positive.
 *   - "standard" — only one engine flagged it.
 *
 * Why: a single engine has blind spots and the occasional false positive.
 * Agreement between two independent engines is the strongest automated signal
 * we can give a site owner. Disagreement isn't "wrong" — each engine covers
 * rules the other doesn't — so single-engine findings are still reported, just
 * labelled honestly.
 *
 * This module is PURE (no DOM, no I/O) so the merge logic is fully unit-tested
 * without a browser. The browser-side engine runner lives in `second-engine.ts`.
 *
 * Mapping note: the two engines use different rule ids, so we cross-validate on
 * the shared WCAG SUCCESS CRITERION (e.g. "1.4.3"), not the engine-specific id.
 * A second-engine finding that maps to the same criterion as an axe violation
 * promotes that axe violation to "high" confidence; second-engine findings with
 * no axe counterpart are appended as their own "standard" violations.
 */

import type { RawAxeViolation } from "./types";
import { resolveWcag } from "./wcag-criteria";

export type Confidence = "high" | "standard";

/** A normalised finding from the second engine (engine-agnostic shape). */
export interface SecondEngineFinding {
  /** Second-engine rule code (e.g. an HTMLCS code). */
  code: string;
  /** WCAG criterion this maps to, e.g. "1.4.3" — null if unknown. */
  wcagCriterion: string | null;
  /** Severity, already normalised to our scale. */
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  help: string;
  /** Number of offending elements the second engine reported. */
  totalInstances: number;
}

/** A merged violation carries which engines found it + a confidence label. */
export interface CrossValidatedViolation extends RawAxeViolation {
  confidence: Confidence;
  /** Engine ids that independently flagged this issue, e.g. ["axe","htmlcs"]. */
  foundBy: string[];
}

/** The primary WCAG criterion for an axe violation (from its tags), or null. */
function criterionOf(v: RawAxeViolation): string | null {
  return resolveWcag(v.tags ?? []).criterion;
}

/**
 * Cross-validates axe violations against second-engine findings.
 *
 * - Every axe violation is kept. If any second-engine finding shares its WCAG
 *   criterion, it's promoted to "high" confidence and foundBy gains the second
 *   engine.
 * - Second-engine findings whose criterion matches NO axe violation are added
 *   as their own "standard" violations (so the second engine genuinely widens
 *   coverage, not just confirms axe).
 *
 * Deterministic: input order is preserved; appended findings are sorted by
 * criterion then code so the output never flickers run-to-run.
 */
export function crossValidate(
  axeViolations: RawAxeViolation[],
  secondFindings: SecondEngineFinding[],
  secondEngineId = "htmlcs"
): CrossValidatedViolation[] {
  // Criteria the second engine independently flagged.
  const secondByCriterion = new Map<string, SecondEngineFinding[]>();
  for (const f of secondFindings) {
    if (!f.wcagCriterion) continue;
    const arr = secondByCriterion.get(f.wcagCriterion) ?? [];
    arr.push(f);
    secondByCriterion.set(f.wcagCriterion, arr);
  }

  const matchedCriteria = new Set<string>();

  const merged: CrossValidatedViolation[] = axeViolations.map((v) => {
    const crit = criterionOf(v);
    const confirmed = crit != null && secondByCriterion.has(crit);
    if (confirmed) matchedCriteria.add(crit!);
    return {
      ...v,
      confidence: confirmed ? "high" : "standard",
      foundBy: confirmed ? ["axe", secondEngineId] : ["axe"],
    };
  });

  // Append second-engine-only findings (criterion not covered by any axe rule).
  const extras: CrossValidatedViolation[] = secondFindings
    .filter((f) => !f.wcagCriterion || !matchedCriteria.has(f.wcagCriterion))
    // collapse duplicates by code (one violation per second-engine rule)
    .reduce<SecondEngineFinding[]>((acc, f) => {
      if (!acc.some((x) => x.code === f.code)) acc.push(f);
      return acc;
    }, [])
    .sort((a, b) =>
      (a.wcagCriterion ?? "~").localeCompare(b.wcagCriterion ?? "~") || a.code.localeCompare(b.code)
    )
    .map((f) => ({
      id: `${secondEngineId}:${f.code}`,
      description: f.description,
      help: f.help,
      impact: f.impact,
      tags: f.wcagCriterion ? [`wcag${f.wcagCriterion.replace(/\./g, "")}`] : ["best-practice"],
      helpUrl: "https://www.w3.org/WAI/WCAG21/quickref/",
      totalInstances: f.totalInstances,
      nodes: [],
      confidence: "standard" as const,
      foundBy: [secondEngineId],
    }));

  return [...merged, ...extras];
}

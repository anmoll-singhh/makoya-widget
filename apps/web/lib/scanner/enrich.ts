/**
 * lib/scanner/enrich.ts
 *
 * Turns a raw rule (id + axe tags + help/description) into the evidence fields
 * every reported issue must carry:
 *  - `wcag`         — the impacted success criterion + level ("the standard")
 *  - `whyItMatters` — plain-language user impact
 *  - `whoItAffects` — which disability groups are affected
 *
 * It composes the two pure building blocks (`resolveWcag` + the plain-language
 * map) so the report-builder has a single call to enrich each violation. Both
 * inputs degrade safely: an unknown rule still yields a non-empty explanation
 * (from axe's own help/description) and best-practice rules get no fabricated
 * criterion.
 */

import type { AccessibilityIssue, WcagInfo } from "@/types";
import { resolveWcag } from "./wcag-criteria";
import { toPlainIssue } from "./plain-language";

export interface IssueEvidence {
  wcag: WcagInfo;
  whyItMatters: string;
  whoItAffects: string;
}

/** Derives the evidence fields for a rule from its id, axe tags, and copy. */
export function deriveEvidence(
  ruleId: string,
  tags: string[],
  help: string,
  description: string
): IssueEvidence {
  const resolved = resolveWcag(tags);
  const wcag: WcagInfo = {
    criterion: resolved.criterion,
    name: resolved.name,
    level: resolved.level,
    url: resolved.url,
    others: resolved.others,
  };

  // Reuse the plain-language map (curated entries + safe fallback from axe copy).
  const minimalIssue: AccessibilityIssue = {
    id: ruleId,
    description,
    help,
    impact: null,
    tags,
    helpUrl: "",
    nodes: [],
  };
  const plain = toPlainIssue(minimalIssue);

  return {
    wcag,
    whyItMatters: plain.whatItMeans,
    whoItAffects: plain.whoItAffects,
  };
}

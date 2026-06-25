/**
 * IssueCard.tsx
 *
 * An expandable plain-English accessibility finding card — the honest-product
 * differentiator that turns raw WCAG violations into language real humans can act on.
 *
 * Design decisions:
 * ─────────────────
 * • Built on shadcn's Accordion primitive (Radix UI) for accessible expand/collapse
 *   with keyboard support out of the box (Enter/Space toggles, focus managed).
 * • Collapsed trigger row surfaces the minimum decision-making signal:
 *   severity chip (colour-coded urgency), the help headline (what's wrong),
 *   and the WCAG criterion reference (professional credibility).
 * • Expanded content follows a structured narrative arc:
 *     1. What it means  — plain-English impact statement (no jargon)
 *     2. Who it affects — the people this hurts (builds empathy)
 *     3. How to fix     — actionable step (only when the scanner can provide one)
 *     4. Offending element — the exact DOM snippet in a mono code block so devs
 *        can grep for it immediately. Shown only when `element` is present.
 * • All colours via CSS custom properties (no hardcoded hex) through SeverityChip.
 * • null `impact` renders a neutral "Unknown" label — the widget never crashes on
 *   partially-scored results from third-party scanner integrations.
 * • Uses `cn` (tailwind-merge) for conditional class composition.
 *
 * Issue shape matches `topIssues` returned by /api/public-scan so this component
 * can drop straight into the scanner surface with zero prop-mapping.
 */

"use client";

import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/design/severity";
import { SeverityChip } from "@/components/makoya/SeverityChip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single accessibility finding returned by the scanner.
 * Mirrors the shape of `topIssues` in the /api/public-scan response so the
 * component can be used without any data transformation.
 */
export interface Issue {
  /** Unique identifier (axe rule id or custom check id). */
  id: string;
  /** WCAG impact level; null when the scanner couldn't determine severity. */
  impact: Severity | null;
  /** Short headline — what the rule checks. E.g. "Images must have alternate text". */
  help: string;
  /** Plain-English explanation of why this matters. */
  whatItMeans: string;
  /** The group of people most affected by this issue. */
  whoItAffects: string;
  /** Actionable remediation step. Omitted when the scanner can't provide one. */
  howToFix?: string;
  /** WCAG criterion reference, e.g. "1.1.1". Shown muted in the trigger row. */
  wcag?: string;
  /** The offending DOM element as a string snippet. Shown in a mono code block. */
  element?: string;
  /** Structured disability groups this issue affects (rendered as small chips). */
  disabilityGroups?: string[];
  /** A concrete measured fact ("Contrast 2.1:1, needs 4.5:1") — the honest-evidence
   *  line that proves we measured rather than guessed. Shown in a mono evidence pill. */
  measuredEvidence?: string;
}

/** Short, human labels for the structured disability-group keys the scanner emits. */
const DISABILITY_LABELS: Record<string, string> = {
  blind: "Blind",
  "low-vision": "Low vision",
  "color-blind": "Colour blindness",
  "deaf-hard-of-hearing": "Deaf / HoH",
  motor: "Motor",
  cognitive: "Cognitive",
  vestibular: "Motion sensitivity",
  speech: "Speech",
};

export interface IssueCardProps {
  issue: Issue;
  /** Additional class names applied to the outer Accordion wrapper. */
  className?: string;
}

// ─── Fallback chip for null impact ────────────────────────────────────────────

/**
 * Renders a neutral, visually de-emphasised chip when `impact` is null.
 * Keeps the layout consistent without misrepresenting severity.
 */
function UnknownChip() {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        "bg-muted text-muted-foreground opacity-70"
      )}
    >
      <span aria-hidden="true" className="text-[0.6em] leading-none">–</span>
      <span>Unknown</span>
    </span>
  );
}

// ─── Section label component ───────────────────────────────────────────────────

/** Small bold label for sections inside the expanded content. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
      {children}
    </p>
  );
}

// ─── IssueCard ────────────────────────────────────────────────────────────────

/**
 * An expandable card that presents a single accessibility finding in plain English.
 *
 * COLLAPSED  → severity chip + help headline + WCAG ref
 * EXPANDED   → what it means, who it affects, how to fix (optional),
 *              offending element in a mono pre block (optional)
 *
 * @example
 * <IssueCard issue={{
 *   id: "image-alt",
 *   impact: "serious",
 *   help: "Images must have alternate text",
 *   whatItMeans: "Screen readers cannot describe the image to blind users.",
 *   whoItAffects: "Users who rely on screen readers.",
 *   howToFix: "Add a descriptive alt attribute to each <img> element.",
 *   wcag: "1.1.1",
 *   element: '<img src="banner.jpg">',
 * }} />
 */
export function IssueCard({ issue, className }: IssueCardProps) {
  const {
    id,
    impact,
    help,
    whatItMeans,
    whoItAffects,
    howToFix,
    wcag,
    element,
    disabilityGroups,
    measuredEvidence,
  } = issue;

  return (
    <Accordion type="single" collapsible className={cn("w-full", className)}>
      <AccordionItem value={id} className="border rounded-lg px-3">
        {/* ── Trigger row ─────────────────────────────────────────────────── */}
        <AccordionTrigger className="hover:no-underline">
          <span className="flex flex-wrap items-center gap-2 text-left pr-2">
            {/* Severity chip — null impact gets a neutral fallback */}
            {impact !== null ? (
              <SeverityChip severity={impact} />
            ) : (
              <UnknownChip />
            )}

            {/* Help headline */}
            <span className="font-medium text-sm leading-snug">{help}</span>

            {/* WCAG criterion ref — small and muted, shown only when present */}
            {wcag && (
              <span className="text-xs text-muted-foreground font-normal whitespace-nowrap">
                WCAG {wcag}
              </span>
            )}
          </span>
        </AccordionTrigger>

        {/* ── Expanded content ─────────────────────────────────────────────── */}
        <AccordionContent className="text-sm">
          <div className="flex flex-col gap-3 py-1">
            {/* Measured evidence — the honest "we measured this, didn't guess" proof.
                Rendered first because it is the most credible signal. */}
            {measuredEvidence && (
              <p
                className="inline-block w-fit rounded-md px-2 py-1 font-mono text-xs"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--ink-600)",
                }}
              >
                {measuredEvidence}
              </p>
            )}

            {/* What it means */}
            <div>
              <SectionLabel>What it means</SectionLabel>
              <p className="text-foreground/90 leading-relaxed">{whatItMeans}</p>
            </div>

            {/* Who it affects */}
            <div>
              <SectionLabel>Who it affects</SectionLabel>
              <p className="text-foreground/90 leading-relaxed">{whoItAffects}</p>
              {disabilityGroups && disabilityGroups.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {disabilityGroups.map((g) => (
                    <span
                      key={g}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: "var(--color-signal-50)", color: "var(--color-signal-700)" }}
                    >
                      {DISABILITY_LABELS[g] ?? g}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* How to fix — only rendered when provided */}
            {howToFix && (
              <div>
                <SectionLabel>How to fix</SectionLabel>
                <p className="text-foreground/90 leading-relaxed">{howToFix}</p>
              </div>
            )}

            {/* Offending element — mono code block, only when provided */}
            {element && (
              <div>
                <SectionLabel>Offending element</SectionLabel>
                <pre
                  className={cn(
                    "font-mono text-xs leading-relaxed",
                    "rounded-md bg-muted px-3 py-2 overflow-x-auto",
                    "whitespace-pre-wrap break-all text-foreground/80"
                  )}
                >
                  {element}
                </pre>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

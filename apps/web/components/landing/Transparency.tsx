/**
 * components/landing/Transparency.tsx — "What the scan is — and isn't"
 *
 * WHY THIS SECTION EXISTS
 * ───────────────────────
 * The web-accessibility overlay industry's defining mistake was overclaiming:
 * "one line of code = compliant." Courts and the FTC have started punishing that.
 * The Transparency block is Makoya's explicit counter-move — an honest editor's
 * note that admits what automated scanning can and cannot do. This is not a
 * standard "disclaimer" buried in fine print; it is deliberately surfaced, styled
 * to feel like a human annotation, and placed where visitors have just been
 * convinced the product is real and useful. Trusting us enough to read it is
 * the point.
 *
 * DESIGN RATIONALE
 * ────────────────
 * The card reads like a hand-annotated page from an editorial:
 *   • Rounded card with the --surface-2 (#F4F2EE) warm-paper background —
 *     slightly off-white so it reads as a distinct "aside" without harsh contrast.
 *   • A 3 px Vellum (amber/warm-gold) left accent rule — the system's marker for
 *     "attention but not alarm." Vellum is used for the manuscript-underline motif
 *     across the Redline spec; this repurposes it as a candid disclosure flag.
 *   • The rule is absolutely positioned inside the card so it spans the full
 *     interior height (top-8 / bottom-8 matching the card's p-8 padding) — not
 *     the card border, which would compete visually.
 *   • Content is padded left (pl-6) to create a gutter between the rule and text,
 *     exactly mimicking the AnnotationMargin gutter motif used in the scan report.
 *   • No icons, no check-marks, no hero imagery. The copy carries the weight.
 *
 * MOTION
 * ──────
 * The entire block is a single <Reveal> — one element fading and rising in as it
 * enters the viewport. This matches the "one editorial reveal" pattern used on
 * the heading blocks throughout the landing. No stagger needed for a single card.
 * Users who prefer reduced motion get a plain, fully-visible static render.
 *
 * ACCESSIBILITY
 * ─────────────
 *   • The section's <h2> heading has id="transparency-heading" referenced by the
 *     section's aria-labelledby. Correct landmark + heading outline.
 *   • The Vellum accent rule is <span aria-hidden> — purely decorative chrome.
 *   • Text colors: ink-900 heading and ink-600 body on the --surface-2 (#F4F2EE)
 *     background pass WCAG AA contrast ratios at the font sizes used.
 *   • max-w-4xl keeps line length in the comfortable 60-75 character range on
 *     large viewports, improving readability for users with cognitive disabilities.
 */
"use client";

import Link from "next/link";
import { transparency } from "@/lib/landing-copy";
import { Reveal } from "@/components/landing/Reveal";

// ─── Section ─────────────────────────────────────────────────────────────────

/**
 * Transparency — an honest, hand-annotated disclosure card.
 *
 * Surfaced on the marketing landing page between the process steps and the
 * final CTA. Consumed with zero props — all copy lives in lib/landing-copy.ts.
 *
 * Visual contract with the rest of the Redline system:
 *   • Same max-w-4xl / px-6 horizontal rhythm as other landing sections.
 *   • --surface-2 card on the --paper page background — visible but calm layering.
 *   • Vellum left rule: same amber token used as the manuscript underline motif.
 *   • font-display (Newsreader) heading, font-sans body — matches the section
 *     typography established in HowItWorks and the Contrast section.
 *
 * @example
 * ```tsx
 * import { Transparency } from "@/components/landing/Transparency";
 * // ...
 * <Transparency />
 * ```
 */
export function Transparency() {
  return (
    <section
      className="mx-auto w-full max-w-4xl px-6 py-24 md:py-32"
      aria-labelledby="transparency-heading"
    >
      {/*
       * <Reveal> wraps the entire card so it enters the viewport as a single
       * cohesive object — the editorial "note" appears at once, not piece-meal.
       */}
      <Reveal>
        {/*
         * Outer card — rounded rectangle on --surface-2 (warm off-white paper),
         * bordered with --border (light hairline), padding 8 (32 px) / md:12 (48 px).
         * `relative` is required for the absolutely-positioned Vellum accent rule.
         */}
        <div
          className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-8 md:p-12"
        >
          {/*
           * Vellum left accent rule — 3 px wide, rounded pill, amber/warm-gold.
           *
           * Placement: absolute, spanning top-8 to bottom-8 (matching the card's
           * p-8 padding) so the rule starts/ends flush with the card's inner edge.
           * At md:p-12 the padding is larger but the rule stays at top-8/bottom-8 —
           * a deliberate choice: the rule marks the text's y-span, not the card's.
           *
           * aria-hidden: purely decorative. Screen readers skip it.
           */}
          <span
            aria-hidden
            className="absolute left-0 top-8 bottom-8 w-[3px] rounded-full"
            style={{ background: "var(--color-vellum-500)" }}
          />

          {/*
           * Content column — pl-6 creates the annotation gutter between the
           * Vellum rule and the text. This is the same spatial motif as the
           * <AnnotationMargin> primitive used in the scan report: rule → gap → text.
           */}
          <div className="pl-6">
            {/*
             * Section heading — Newsreader (font-display), ink-900, large but not
             * overwhelming. "What the scan is — and isn't" is a direct, honest
             * framing. The em-dash pair signals a candid parenthetical.
             */}
            <h2
              id="transparency-heading"
              className="font-display text-3xl md:text-4xl tracking-tight text-[var(--ink-900)]"
            >
              {transparency.heading}
            </h2>

            {/*
             * Body — ink-600 (mid-grey) on --surface-2 background. text-lg at
             * generous line-height (leading-relaxed = 1.625) for comfortable long-
             * form reading. The copy is a single paragraph: no bullet points, no
             * icons — an honest prose statement, like a human wrote it.
             */}
            <p className="mt-5 text-lg leading-relaxed text-[var(--ink-600)]">
              {transparency.body}
            </p>
            <p className="mt-6">
              <Link href="/scan" className="text-sm font-medium text-signal-600 underline underline-offset-4 hover:text-signal-700">See exactly what we check →</Link>
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

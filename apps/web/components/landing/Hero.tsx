/**
 * components/landing/Hero.tsx — the above-the-fold hero section.
 *
 * This is the centrepiece of the marketing landing page. It has two jobs:
 *
 *  1. Communicate the value proposition instantly (5-second test) — headline +
 *     subhead make the "real scanner, honest findings, no fake compliance badge"
 *     promise crystal clear before the visitor scrolls a pixel.
 *
 *  2. Get the visitor to type their URL — the `<HeroScanInput>` client island
 *     converts intent to action in one step (url → /scan?url= auto-run), so the
 *     value lands before any sign-up friction.
 *
 * Layout decisions:
 * ─────────────────
 * • Two-column grid on `lg` (copy left, product drama right), single-column on
 *   mobile with the product preview below the CTA so conversion elements come
 *   first on small screens.
 * • Both columns are wrapped in `<Reveal>` from @/components/landing/Reveal,
 *   which fades/rises the column in once as it enters the viewport. The Reveal
 *   wrapper is fully reduced-motion safe (renders plain at rest state when
 *   `prefers-reduced-motion: reduce` is set — critical for an a11y brand).
 * • The headline is the page's single `<h1>`. Only one `<h1>` per page;
 *   subsequent headings use `<h2>`. This is a WCAG 1.3.1 / ARIA best practice
 *   that our own scanner would flag if violated.
 * • "your visitors" receives a Vellum-amber underline bar (not a color change)
 *   because color alone is not a sufficient differentiator for users with color
 *   vision deficiencies (WCAG 1.4.1). The underline makes the accent obvious
 *   even in greyscale.
 *
 * Product drama (right column):
 * ─────────────────────────────
 * • `<AnnotatedPreview>` is the hero demo — a mock-browser with Vellum-amber
 *   annotation marks drawing in once via `mode="reveal"`. The three annotations
 *   represent the three most common severity classes (critical, serious, moderate)
 *   so the label vocabulary matches what the scanner would actually return.
 * • A `<ScoreMark>` floats in the top-right corner of the preview frame, in a
 *   small elevated card, to show the "score" concept at a glance. It uses
 *   `size="app"` (compact, 80px ring) so it sits elegantly without overpower-
 *   ing the annotated preview behind it.
 * • The floating card uses `var(--shadow-md)` and `var(--radius)` to stay on
 *   design-system tokens rather than raw values.
 *
 * Copy:
 * ─────
 * All user-facing strings come from `@/lib/landing-copy` (pure data). The
 * honesty guardrail test in `landing-copy.test.ts` scans every exported string
 * for banned compliance claims — we keep Hero.tsx free of inline copy so the
 * test catches any future edits.
 */

"use client";

import { hero } from "@/lib/landing-copy";
import { Reveal } from "@/components/landing/Reveal";
import { HeroScanInput } from "@/components/landing/HeroScanInput";
import { AnnotatedPreview } from "@/components/makoya/AnnotatedPreview";
import { ScoreMark } from "@/components/makoya/ScoreMark";
import { cn } from "@/lib/utils";

// ─── Annotation data ─────────────────────────────────────────────────────────
// Three representative accessibility findings — one per severity tier that the
// scanner surfaces (critical / serious / moderate). Positions and dimensions are
// percentage-based relative to the mock-browser viewport so they scale cleanly.
// The labels are plain-English descriptions exactly as the scanner would return
// them, reinforcing the "honest findings" brand promise.

const HERO_ANNOTATIONS = [
  {
    x: 8,
    y: 18,
    w: 42,
    h: 7,
    severity: "critical" as const,
    label: "Image missing alt text",
  },
  {
    x: 12,
    y: 46,
    w: 34,
    h: 7,
    severity: "serious" as const,
    label: "Low-contrast button",
  },
  {
    x: 55,
    y: 70,
    w: 30,
    h: 7,
    severity: "moderate" as const,
    label: "Unlabeled icon button",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Above-the-fold hero section for the marketing landing page.
 *
 * Must be placed immediately after <LandingHeader> and before the first <h2>
 * section. Contains the page's single `<h1>`.
 *
 * @example
 * // In app/page.tsx:
 * <LandingHeader />
 * <main id="content">
 *   <Hero />
 *   {// … further sections}
 * </main>
 */
export function Hero() {
  return (
    <section
      // aria-labelledby connects the section landmark to its headline so
      // screen-reader users who browse by landmarks hear the section name.
      aria-labelledby="hero-heading"
      className="relative mx-auto w-full max-w-6xl px-6 py-14 md:py-28"
    >
      {/* ── Subtle radial glow behind the grid ──────────────────────────── */}
      {/*
       * A very faint Signal-600 radial bloom behind the content gives the
       * hero depth without a background image. aria-hidden — decorative only.
       * Opacity is intentionally low (≤ 0.06) to avoid interfering with text
       * contrast (AA compliance on our own product page is non-negotiable).
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/4 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--color-signal-100) 0%, transparent 70%)",
            opacity: 0.45,
          }}
        />
      </div>

      {/* ── Two-column grid ─────────────────────────────────────────────── */}
      <div className="relative grid lg:grid-cols-2 lg:gap-12 items-center">

        {/* ── LEFT: Copy + scan input ───────────────────────────────────── */}
        <Reveal className="flex flex-col">

          {/* Eyebrow — category signal above the headline. Uses signal-600
              directly (4.6:1+ on Paper) without the full-weight blue fill, so
              it reads as a label not a status badge. */}
          <p
            className="text-xs font-medium uppercase tracking-[0.08em] text-signal-600"
            // Not a heading — intentionally a <p> so the document outline
            // has exactly one <h1> (this section) with no competing structure.
          >
            Honest accessibility
          </p>

          {/* ── H1 headline ────────────────────────────────────────────── */}
          {/*
           * The display headline is split into two prose runs:
           *   headlineLead   → "See what's really blocking"  (plain weight)
           *   headlineAccent → "your visitors"               (Vellum underline)
           *
           * The underline is implemented as an absolutely-positioned `<span>`
           * child inside a `relative whitespace-nowrap` wrapper so it:
           *   a) never wraps mid-phrase (the accent phrase stays intact)
           *   b) sits exactly at baseline-ish regardless of line-height
           *   c) works in greyscale (no color-only distinction — WCAG 1.4.1)
           *
           * We use `leading-[1.05]` (tighter than 1) for display-heading
           * aesthetics at large sizes; this is safe because the headline is
           * not body copy and the letter spacing / font metrics compensate.
           */}
          <h1
            id="hero-heading"
            className={cn(
              "mt-4 font-display",
              "text-4xl sm:text-5xl md:text-6xl",
              "tracking-tight leading-[1.05]",
              "text-[var(--ink-900)]",
            )}
          >
            {hero.headlineLead}{" "}
            {/* Accent phrase — Vellum amber underline bar */}
            <span className="relative inline-block whitespace-nowrap">
              {hero.headlineAccent}
              {/*
               * Underline bar: absolutely positioned, inset-x-0 spans the full
               * phrase width, -bottom-1 tucks just below the descenders.
               * h-[3px] matches the weight of the annotation bracket strokes in
               * <AnnotatedPreview> — a subtle but intentional brand echo.
               * aria-hidden — purely decorative, does not convey meaning.
               */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-2 h-[4px] rounded-sm"
                style={{ background: "var(--color-vellum-500)" }}
              />
            </span>
          </h1>

          {/* Subhead — explains the "what" and "how" in one sentence.
              max-w-xl prevents the line from stretching to full column width
              on large screens, keeping the comfortable ~65-70 char measure. */}
          <p className="mt-6 text-lg text-[var(--ink-600)] max-w-xl">
            {hero.subhead}
          </p>

          {/* Scan input — the page's primary conversion element. The HeroScanInput
              client island takes a URL, pushes to /scan?url=…, and the scan page
              auto-runs. CTA and placeholder come from landing-copy so the honesty
              guardrail test covers them. */}
          <HeroScanInput cta={hero.cta} placeholder={hero.inputPlaceholder} />

          {/* Microcopy — the trust line directly below the CTA. Confirms: no card,
              no compliance badge, no deception. Small + muted so it supports the
              CTA without drawing attention away from the input. */}
          <p className="mt-3 text-sm text-[var(--ink-400)]">
            {hero.microcopy}
          </p>

          {/* Mobile-only product proof — shows a ScoreMark on small screens where
              the right-column product preview is hidden. Gives mobile visitors
              a tangible glimpse of the scanner output before they scroll. */}
          <div className="mt-8 lg:hidden">
            <div className="inline-flex items-center rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)]">
              <ScoreMark score={68} size="app" verdict="3 real issues found" />
            </div>
          </div>
        </Reveal>

        {/* ── RIGHT: Product dramatization ──────────────────────────────── */}
        {/*
         * This column shows the product (scanner output) before the visitor
         * has done anything — the "aha" moment is visible immediately.
         *
         * Layout: relative-positioned wrapper so the <ScoreMark> floating card
         * can be absolutely pinned inside it without disrupting the grid flow.
         *
         * Mobile: hidden on small screens (hidden lg:block) — the copy + CTA
         * are the primary conversion path on mobile; the preview is a nice-to-
         * have that would push the CTA below the fold if kept visible.
         */}
        <Reveal className="hidden lg:block">
          <div className="relative">

            {/* ── Annotated mock-browser ─────────────────────────────────── */}
            {/*
             * No `src` prop → AnnotatedPreview renders its neutral placeholder
             * (striped lines suggesting a page layout). This is intentional:
             *   • We don't ship a real screenshot in the marketing bundle.
             *   • The placeholder + annotation marks make the product concept
             *     legible without any network dependency.
             *   • mode="reveal" draws the bracket strokes once on scroll-in;
             *     reduced-motion safe via useReducedMotion() inside the component.
             */}
            <AnnotatedPreview
              mode="reveal"
              annotations={HERO_ANNOTATIONS}
              className="w-full"
            />

            {/* ── Floating score card ────────────────────────────────────── */}
            {/*
             * A small elevated card pins to the top-right of the preview frame,
             * visually answering "what does a score look like?" without needing
             * a separate section. Positioned with absolute + translate so it
             * overlaps the preview border slightly — the overlap creates depth
             * and ties the card to the preview visually.
             *
             * verdict text: "3 real issues found" echoes the 3 annotations above,
             * making the score + findings connection immediately readable.
             *
             * z-10 keeps the card above the AnnotatedPreview SVG strokes.
             * aria-label on the wrapper gives screen readers context for the
             * floating element (ScoreMark itself reads the number aloud).
             */}
            <div
              aria-label="Example scan result: score 68, 3 real issues found"
              className={cn(
                "absolute z-10",
                // Pin to the top-right, slightly overlapping the frame edge
                "-top-4 -right-4",
                // Card shell
                "bg-[var(--surface)] border border-[var(--border)]",
                "rounded-[var(--radius)]",
                "p-4",
                // Elevation
                "shadow-[var(--shadow-md)]",
                // Subtle animation: fade + rise in sync with the preview column
                "transition-all duration-300",
              )}
              style={{
                // Belt-and-suspenders: also via CSS var so it degrades cleanly
                // if the Tailwind shadow utility isn't resolved in this context.
                boxShadow: "var(--shadow-md)",
              }}
            >
              <ScoreMark
                score={68}
                size="app"
                verdict="3 real issues found"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

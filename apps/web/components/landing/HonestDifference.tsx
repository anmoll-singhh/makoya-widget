/**
 * components/landing/HonestDifference.tsx — "The Record" strategic-wedge section.
 *
 * This section is the brand's core honesty statement: it surfaces the public
 * record on overlay vendors (using only category facts — no competitor named)
 * to establish why Makoya's "fix at the source" approach is categorically
 * different. It converts by leading with credibility, not sales language.
 *
 * ─── Design System ("The Redline") ──────────────────────────────────────────
 *   Warm neutral palette driven by CSS custom properties (--paper, --surface,
 *   --border, --ink-900 / 600 / 400, --radius, --shadow-xs) layered over
 *   Tailwind utilities. Typography: Newsreader serif for display via font-display;
 *   font-sans body; font-mono + tnums for the numeric stats (tabular lining
 *   numerals keep columns crisp). Signal-600 is the brand primary accent.
 *
 * ─── Motion approach ────────────────────────────────────────────────────────
 *   SAFE FALLBACK: the entire heading block and the stat grid are each wrapped
 *   in a single <Reveal> (opacity + y-translate once on scroll-in). The stat
 *   grid does NOT use <RevealStagger> + per-card stagger because plain <div>
 *   children (without motion.*) won't receive the staggerChildren variant
 *   cascade — using RevealStagger on plain divs would silently produce no
 *   per-card animation. A working single reveal beats a broken stagger.
 *   Both Reveal instances are reduced-motion safe (Reveal short-circuits to a
 *   plain element with no Framer Motion animation when prefers-reduced-motion
 *   is set — guaranteed by the Reveal component itself).
 *
 * ─── Accessibility ──────────────────────────────────────────────────────────
 *   - Section heading is a semantic <h2>.
 *   - All text colours meet WCAG AA contrast on --surface (#fff).
 *   - CTA renders as a real <a> via Button asChild + Link — keyboard, screen
 *     reader, and right-click "open in new tab" all work correctly.
 *   - Source labels on stat cards use <p> (not <caption> or <abbr>) to keep
 *     them scannable without adding meaningless abbreviation tooltips.
 *
 * ─── Copy source ────────────────────────────────────────────────────────────
 *   All strings come from @/lib/landing-copy → contrast export. That file is
 *   the single source of truth; the honesty guardrail test (landing-copy.test.ts)
 *   scans every string there for banned compliance claims. This component never
 *   introduces its own user-facing copy.
 */
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";
import { contrast } from "@/lib/landing-copy";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// StatCard — a single data point in the "public record" grid.
// Kept as a simple presentational sub-component (no motion wrapper) so the
// safe single-Reveal approach on the grid works cleanly.
// ---------------------------------------------------------------------------
function StatCard({
  figure,
  label,
  source,
}: {
  figure: string;
  label: string;
  source: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--border)]",
        "bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]",
      )}
    >
      {/*
       * Figure — the headline number. font-mono + tnums keeps multi-character
       * stats like "67% / 72%" from shifting width as they load or resize.
       */}
      <p className="font-mono tnums text-4xl font-semibold text-[var(--ink-900)]">
        {figure}
      </p>

      {/*
       * Label — one or two sentences explaining what the figure means in
       * plain English, grounded to real users and real outcomes.
       */}
      <p className="mt-3 text-sm text-[var(--ink-600)]">{label}</p>

      {/*
       * Source — the citation attribution. Small caps treatment keeps it
       * visually subordinate while remaining legible and truthful.
       */}
      <p className="mt-4 text-xs uppercase tracking-wide text-[var(--ink-400)]">
        {source}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HonestDifference — exported section component.
// ---------------------------------------------------------------------------
export function HonestDifference() {
  return (
    <section
      id="honest"
      aria-labelledby="honest-heading"
      className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32"
      // Ceramic green wash — faint bilateral fade that warms the section without
      // touching text or accent tokens. Alpha kept at ≤8% to preserve AA contrast.
      style={{ backgroundImage: "linear-gradient(to bottom, rgba(138,179,155,.08) 0%, transparent 60%)" }}
    >
      {/* ── Eyebrow + Heading + Intro ─────────────────────────────────────── */}
      <Reveal>
        {/*
         * Eyebrow — "The record" frames this as evidence, not sales copy.
         * Small-caps treatment + signal-600 colour signals editorial
         * credibility without loudness.
         */}
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-signal-600">
          The record
        </p>

        {/*
         * h2 — the strategic wedge headline. Newsreader (font-display) gives
         * this the weight of a broadsheet pull-quote; the tight tracking
         * tightens the editorial feel. max-w-3xl keeps line length readable.
         */}
        <h2
          id="honest-heading"
          className="mt-3 font-display text-4xl tracking-tight text-[var(--ink-900)] md:text-5xl max-w-3xl"
        >
          {contrast.heading}
        </h2>

        {/*
         * Intro — one paragraph framing the public record. text-lg + ink-600
         * reads as body copy subordinate to the heading but large enough to
         * carry weight. max-w-2xl keeps it from spanning all 6 columns on
         * wide viewports.
         */}
        <p className="mt-5 text-lg text-[var(--ink-600)] max-w-2xl">
          {contrast.intro}
        </p>
      </Reveal>

      {/* ── Stats grid ────────────────────────────────────────────────────── */}
      {/*
       * Single Reveal wraps the entire grid — safe fallback as specified.
       * The grid has a short stagger delay relative to the heading block
       * because each Reveal instance uses whileInView with its own threshold,
       * so the heading reveals first, the grid follows naturally as the user
       * reads down. No explicit delay is set — the natural scroll pacing is
       * enough.
       */}
      <Reveal className="mt-12 grid gap-6 md:grid-cols-3">
        {contrast.stats.map((stat) => (
          <StatCard
            key={stat.figure}
            figure={stat.figure}
            label={stat.label}
            source={stat.source}
          />
        ))}
      </Reveal>

      {/* ── Takeaway + CTA ────────────────────────────────────────────────── */}
      <Reveal>
        {/*
         * Takeaway — the brand position restated positively after the evidence.
         * font-display (Newsreader) at text-2xl/3xl gives it editorial weight
         * without competing with the h2. max-w-3xl mirrors the heading width.
         */}
        <p className="mt-12 font-display text-2xl text-[var(--ink-900)] md:text-3xl max-w-3xl">
          {contrast.takeaway}
        </p>

        {/*
         * Primary CTA — Button asChild lets Next/Link handle routing while the
         * Button component applies the correct visual treatment. size="lg"
         * matches the hero CTA scale so the section feels resolved, not tacked
         * on. bg-signal-600 is the primary action colour throughout.
         */}
        <Button asChild size="lg" className="mt-8">
          <Link href="/scan">{contrast.cta}</Link>
        </Button>
      </Reveal>
    </section>
  );
}

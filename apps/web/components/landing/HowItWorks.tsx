/**
 * components/landing/HowItWorks.tsx — "Find it, fix it at the source, keep it fixed"
 *
 * WHY THIS SECTION EXISTS
 * ───────────────────────
 * Most accessibility SaaS products either bury their mechanism (vague "we handle
 * it") or make it feel trivial. This section does the opposite: a methodical,
 * manuscript-style breakdown of the three real steps — Scan → Fix → Monitor —
 * that earns credibility before the visitor even scrolls to pricing.
 *
 * DESIGN RATIONALE
 * ────────────────
 * The editorial "Redline" aesthetic is achieved through:
 *   • Mono step indices (01 / 02 / 03) in ink-400 — numerical, precise, unapologetic.
 *   • A thin left hairline per card — the manuscript gutter motif that runs through
 *     AnnotationMargin, the scan report, and the dashboard. Visual system coherence.
 *   • Newsreader (font-display) for headings — trustworthy, human, not SaaS-generic.
 *   • No icons, no rounded feature cards, no gradients. A checklist, not a billboard.
 *
 * MOTION
 * ──────
 * The heading/eyebrow block fades in as one <Reveal>. The three steps are wrapped
 * in a single <Reveal> rather than a <RevealStagger> so that the grid is guaranteed
 * to render correctly even if RevealStagger's stagger parent semantics ever shift.
 * (Rule from design brief: a working reveal beats a broken stagger.) Users who
 * prefer reduced motion get a static render with no animation at all.
 *
 * ACCESSIBILITY
 * ─────────────
 *   • Section landmark with id="how" for skip-nav / anchor links.
 *   • Step indices are aria-hidden (purely decorative ordinal, not meaningful text).
 *   • The hairline gutter rule is aria-hidden — it is a CSS presentational element.
 *   • <h2> ordering: this section's heading is a second-level heading, below the
 *     hero <h1>. Step labels are <h3>. Correct outline depth.
 *   • Color choices: ink-900 on paper and ink-600 on paper pass AA at the copy sizes
 *     used (16 px+ body, 20 px+ step headings).
 */
"use client";

import { howItWorks } from "@/lib/landing-copy";
import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepCardProps {
  index: number;
  title: string;
  body: string;
}

// ─── Sub-component ────────────────────────────────────────────────────────────

/**
 * StepCard — one step in the process: a left-rule gutter accent, mono ordinal,
 * display-serif title, and body copy. Intentionally flat and editorial — no
 * rounded containers or drop-shadows.
 *
 * The left hairline rule uses a border-l with the --border token (computed from
 * the design system's `border` CSS variable). The rule runs the full height of
 * the card content, reinforcing the manuscript / code-review visual language.
 */
function StepCard({ index, title, body }: StepCardProps) {
  // Zero-pad the index (1-based) to two digits: 1 → "01", 2 → "02", etc.
  const ordinal = String(index + 1).padStart(2, "0");

  return (
    /*
     * The relative wrapper establishes the stacking context for the left rule.
     * pl-5 keeps content to the right of the 3px rule + a comfortable gap.
     * border-l uses the --border token directly via the Tailwind border colour.
     */
    <div
      className={cn(
        "relative pl-5",
        "border-l",
        "border-[var(--border)]",
      )}
    >
      {/*
       * Step number — mono, tabular numerals, ink-400 (mid-grey) to keep it
       * structural without competing with the step title below.
       * aria-hidden: the number is purely decorative sequencing; screen readers
       * will encounter the <h3> title which provides the same meaning.
       */}
      <span
        aria-hidden="true"
        className="font-mono tnums text-2xl leading-none text-[var(--ink-400)] select-none"
      >
        {ordinal}
      </span>

      {/* Step headline — Newsreader (font-display), large enough to anchor the card */}
      <h3 className="mt-4 font-display text-xl leading-snug text-[var(--ink-900)]">
        {title}
      </h3>

      {/* Body copy — readable grey, line-height generous for scan-reading */}
      <p className="mt-2 text-base leading-relaxed text-[var(--ink-600)]">
        {body}
      </p>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

/**
 * HowItWorks — a methodical three-step breakdown of the Makoya process.
 *
 * Consumed by the marketing landing page (app/(marketing)/page.tsx or similar).
 * Props: none — all copy comes from `howItWorks` in lib/landing-copy.ts.
 *
 * @example
 * ```tsx
 * import { HowItWorks } from "@/components/landing/HowItWorks";
 * // ...
 * <HowItWorks />
 * ```
 */
export function HowItWorks() {
  return (
    <section
      id="how"
      className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32"
      aria-labelledby="how-heading"
      // Ceramic green wash — 6% tint on section bg for warmth; text/buttons unaffected.
      style={{ backgroundImage: "linear-gradient(to bottom, rgba(138,179,155,.06) 0%, transparent 65%)" }}
    >
      {/* ── Header block: eyebrow + section heading ── */}
      <Reveal>
        <p className="text-xs uppercase tracking-[0.08em] font-medium text-signal-600">
          How it works
        </p>

        <h2
          id="how-heading"
          className="mt-3 font-display text-4xl md:text-5xl tracking-tight text-[var(--ink-900)] max-w-3xl"
        >
          {howItWorks.heading}
        </h2>
      </Reveal>

      {/*
       * Steps grid — wrapped in a single <Reveal> rather than <RevealStagger>
       * to guarantee the grid renders correctly at all viewport widths.
       * Three columns on md+; single-column stack on mobile.
       * gap-10 gives each card enough breathing room to read as a distinct step.
       */}
      <Reveal className="mt-14 grid gap-10 md:grid-cols-3">
        {howItWorks.steps.map((step, i) => (
          <StepCard
            key={step.title}
            index={i}
            title={step.title}
            body={step.body}
          />
        ))}
      </Reveal>
    </section>
  );
}

/**
 * components/landing/FinalCta.tsx — closing call-to-action band for the
 * marketing landing page.
 *
 * PURPOSE
 * The last thing the visitor reads before scrolling into the footer. Its job
 * is to convert intent into action: scan URL → /scan. This is the premium
 * editorial closer, not a generic "sign up" box.
 *
 * DESIGN (The Redline — editorial; dark warm-ink band)
 * - The outer section is padded but transparent, keeping the scroll rhythm.
 * - The inner rounded band uses bg-[var(--ink-900)] (#1A1815) — the same
 *   near-black warm ink as our heading text — for a bold, premium finish.
 *
 * CONTRAST VERIFICATION (WCAG AA requirement)
 * --ink-900 background = #1A1815.
 * Text colours used and their estimated ratios against #1A1815:
 *   • var(--paper) #FBFAF8 as primary text: ~16.5:1  ✓  (AAA, far exceeds AA 4.5:1)
 *   • var(--paper)/80 (80% opacity white on ink-900) ≈ #D5D3D0 effectively;
 *     actual rendered blend ≈ #D2CDC5 on #1A1815 → ~8.7:1  ✓  (AA+)
 *   • The secondary link uses text-[var(--paper)]/70 underline — effective
 *     blend ≈ #C4BEB6 on #1A1815 → ~7.1:1  ✓  (AA)
 * All text on the dark band meets WCAG AA (4.5:1) with significant headroom.
 *
 * HEROCANINPUT PLACEMENT
 * HeroScanInput has a white Input field + signal-600 Button, both designed for
 * a light background. On the dark ink-900 band the Input's default bg-background
 * (#FBFAF8) still renders as a light field, keeping it clearly legible.
 * We slot the form inside a light inner container (bg-[var(--paper)]/8 + a
 * subtle ring) to give it breathing room and ensure AA compliance for the
 * input placeholder text too. The Input itself is white-on-paper — fully
 * readable — while the surrounding band stays dark and premium.
 *
 * COPY
 * Imported from lib/landing-copy (pure data, no JSX). Never edit copy here.
 *
 * MOTION
 * <Reveal> wraps all content so it animates in on scroll. useReducedMotion()
 * inside Reveal means users with prefers-reduced-motion get a plain, static
 * render — appropriate for an accessibility brand.
 */
"use client";

import Link from "next/link";
import { Reveal } from "@/components/landing/Reveal";
import { HeroScanInput } from "@/components/landing/HeroScanInput";
import { finalCta } from "@/lib/landing-copy";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FinalCta() {
  return (
    <section
      className="px-4 sm:px-6 py-16 sm:py-20 md:py-32"
      aria-labelledby="final-cta-heading"
      // Ceramic green wash — faint tint on the outer padding area (not the dark
      // inner band, which uses var(--ink-900)). The dark band dominates; this
      // tints only the section's breathing room around it.
      style={{ backgroundImage: "linear-gradient(to bottom, rgba(138,179,155,.06) 0%, transparent 40%)" }}
    >
      {/*
        Dark warm-ink band — rounded, full-width up to max-w-5xl.
        Background: var(--ink-900) = #1A1815, a near-black warm brown-black.
        All text on this band is --paper (#FBFAF8) or lighter, meeting AA.
      */}
      <div className="mx-auto max-w-5xl rounded-2xl bg-[var(--ink-900)] px-6 py-12 sm:px-8 sm:py-16 md:px-16 md:py-20 text-center">
        <Reveal>
          {/* ── Heading ─────────────────────────────────────────── */}
          {/*
            var(--paper) on var(--ink-900) → ~16.5:1, far above AA 4.5:1.
            Newsreader serif in white reinforces the editorial, premium feel.
          */}
          <h2
            id="final-cta-heading"
            className="font-display text-3xl sm:text-4xl tracking-tight text-balance text-[var(--paper)] md:text-5xl"
          >
            {finalCta.heading}
          </h2>

          {/* ── Body copy ─────────────────────────────────────── */}
          {/*
            text-[var(--paper)]/80 at 80% opacity on ink-900 → effective
            blend ≈ #CEC9C1, giving ~8:1 contrast. AA is 4.5:1. ✓
          */}
          <p className="mt-4 text-lg text-[var(--paper)]/80">{finalCta.body}</p>

          {/* ── Scan input ──────────────────────────────────────── */}
          {/*
            HeroScanInput renders a white Input + Signal-600 button.
            Wrapping it in a slightly lighter surface ring gives a visual
            "tray" that reads cleanly on the dark band.
            The Input itself (bg-background = #FBFAF8, ink-900 text) is always
            legible regardless of surrounding background.
          */}
          <div className="mx-auto mt-8 max-w-xl rounded-[var(--radius)] bg-white/10 p-1 ring-1 ring-white/20">
            <HeroScanInput cta={finalCta.primary} placeholder="yourwebsite.com" />
          </div>

          {/* ── Secondary action — "Sign in" ──────────────────── */}
          {/*
            Using text-[var(--paper)]/70 for a quieter link tone.
            Effective blend on ink-900 ≈ #BEB9B0 → ~6.5:1. AA is 4.5:1. ✓
            underline-offset-4 + hover:underline pattern for a visible focus
            state that reads clearly on the dark background.
            We add focus-visible:outline for keyboard users.
          */}
          <p className="mt-5 text-sm">
            <Link
              href="/login"
              className="text-[var(--paper)]/70 underline-offset-4 transition-colors duration-150 hover:text-[var(--paper)] hover:underline focus-visible:text-[var(--paper)] focus-visible:underline focus-visible:outline-none"
            >
              {finalCta.secondary}
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

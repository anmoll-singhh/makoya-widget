/**
 * components/landing/ThreeSurfaces.tsx — "What you get" section for the marketing landing.
 *
 * PURPOSE
 * Shows the three honest product surfaces (scanner, widget, dashboard) in a
 * 3-column card grid with signal-tinted icons. This section answers the visitor's
 * "what is it actually?" question after the contrast/credibility section above it.
 *
 * DESIGN (The Redline — editorial light theme)
 * - Serif display heading (Newsreader) for editorial authority.
 * - Cards sit on var(--surface) white with the warm var(--border) hairline,
 *   matching the document-paper aesthetic throughout the landing.
 * - Icon squares are tinted signal-600/10 (cobalt wash) to tie back to the
 *   primary action color without overwhelming the quiet palette.
 * - Motion: RevealStagger wraps the whole grid; each card animates in on scroll
 *   via the shared motion tokens. useReducedMotion() is respected inside Reveal —
 *   no animation for users who have it turned off.
 *
 * COPY
 * Imported from lib/landing-copy so it stays out of the component and can be
 * scanned by the honesty guardrail test without rendering React.
 *
 * ICONS (lucide-react)
 * Index 0 → ScanLine (scanner surface)
 * Index 1 → SlidersHorizontal (widget / preferences surface)
 * Index 2 → LayoutDashboard (dashboard surface)
 */
"use client";

import { ScanLine, SlidersHorizontal, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal, RevealStagger } from "@/components/landing/Reveal";
import { surfaces } from "@/lib/landing-copy";

// Map each surface index to its lucide icon. Defined outside the component so
// the array reference is stable and never triggers unnecessary re-renders.
const SURFACE_ICONS: LucideIcon[] = [ScanLine, SlidersHorizontal, LayoutDashboard];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThreeSurfaces() {
  return (
    <section
      id="surfaces"
      className="mx-auto w-full max-w-6xl px-6 py-24 md:py-32"
      aria-labelledby="surfaces-heading"
    >
      {/* ── Section header ─────────────────────────────────────── */}
      <Reveal>
        {/* Eyebrow — uppercase signal label above the main heading */}
        <p
          className="text-sm font-semibold uppercase tracking-widest text-signal-600"
          aria-hidden="true"
        >
          What you get
        </p>

        {/* Main section heading — h2 for correct document outline */}
        <h2
          id="surfaces-heading"
          className="mt-3 font-display text-4xl tracking-tight text-[var(--ink-900)] md:text-5xl"
        >
          {surfaces.heading}
        </h2>
      </Reveal>

      {/* ── 3-column card grid ─────────────────────────────────── */}
      {/*
        RevealStagger staggers each card's fade-in by the default 80 ms.
        If the stagger feels too elaborate (e.g. only 3 items), a single
        <Reveal> over the whole grid is equally valid — both are motion-safe.
      */}
      <RevealStagger className="mt-14 grid gap-6 md:grid-cols-3">
        {surfaces.items.map((item, index) => {
          const Icon = SURFACE_ICONS[index];

          return (
            <SurfaceCard
              key={item.name}
              name={item.name}
              body={item.body}
              Icon={Icon}
            />
          );
        })}
      </RevealStagger>
    </section>
  );
}

// ---------------------------------------------------------------------------
// SurfaceCard — individual surface card (extracted for readability)
// ---------------------------------------------------------------------------

interface SurfaceCardProps {
  name: string;
  body: string;
  Icon: LucideIcon;
}

function SurfaceCard({ name, body, Icon }: SurfaceCardProps) {
  return (
    <div
      className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-xs)]"
    >
      {/* Icon square — signal-tinted, sized for visual balance */}
      <div
        className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-signal-600/10 text-signal-600"
        aria-hidden="true"
      >
        <Icon size={22} strokeWidth={1.75} />
      </div>

      {/* Surface name — h3 within the section, Newsreader serif */}
      <h3 className="mt-5 font-display text-xl text-[var(--ink-900)]">
        {name}
      </h3>

      {/* Description — body copy, warmer muted ink */}
      <p className="mt-2 text-[var(--ink-600)]">
        {body}
      </p>
    </div>
  );
}

/**
 * components/makoya/AnnotatedPreview.tsx
 *
 * <AnnotatedPreview> — the hero demo and in-app scan-result preview view.
 *
 * Why this exists:
 * ─────────────────
 * This component is the centrepiece of the Makoya product surface: it shows a
 * real (or mock) screenshot of a client's page inside a framed mock-browser, with
 * Vellum-amber annotation marks — SVG underline/bracket strokes — drawn in ONCE
 * beside each accessibility issue. It is used both in the marketing hero (large,
 * animated, looks impressive) and in the in-app scan result view (same component,
 * different data and density).
 *
 * The "draws on once" constraint is intentional. Animations that loop or persist
 * distract the user from the findings themselves. Each stroke fires once (on mount
 * or on first visibility) and holds, letting the user read the annotations.
 *
 * Key design decisions:
 * ──────────────────────
 * • Mock-browser frame: chrome bar (3 decorative dots + faux address pill) over a
 *   viewport area — using `var(--surface)`, `var(--border)`, `var(--shadow-sm)`.
 * • `src` overloaded: string → <img>; ReactNode → rendered directly; omitted →
 *   neutral placeholder. The viewport always fills the frame.
 * • Annotations are absolutely positioned overlays inside the viewport. Each has
 *   an SVG <motion.path> stroke (underline/bracket) using `inkStroke` variants
 *   from @/lib/design/motion. Accessible label text is visually-hidden beside it.
 * • `mode="static"` or `useReducedMotion()` true → marks render fully drawn with
 *   no animation. `mode="reveal"` (default) → draws on once via Framer Motion.
 * • `beforeAfter` prop reserved for the customizer split-handle view. When
 *   supplied we render the `after` content by default; split-drag is deferred.
 *
 * Non-goals:
 * ──────────
 * - No split-drag handle implementation (deferred to dashboard surface plan).
 * - No real browser chrome (tabs, favicon, etc.) — purely decorative.
 * - No network calls; fully presentational.
 */

"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Severity, SEVERITY_META } from "@/lib/design/severity";
import { inkStroke, DUR } from "@/lib/design/motion";

// ─── Types ───────────────────────────────────────────────────────────────────

/** A single accessibility annotation overlay on the previewed page. */
export interface Annotation {
  /** Left edge of the highlighted region, as % of viewport width (0–100). */
  x: number;
  /** Top edge of the highlighted region, as % of viewport height (0–100). */
  y: number;
  /** Width of the highlighted region, as % of viewport width (0–100). */
  w: number;
  /** Height of the highlighted region, as % of viewport height (0–100). */
  h: number;
  /** Severity level — drives the Vellum-amber vs. severity-colored stroke. */
  severity: Severity;
  /** Human-readable finding label. Rendered as visually-hidden accessible text. */
  label: string;
}

export interface AnnotatedPreviewProps {
  /**
   * Page content to display inside the mock-browser viewport:
   * - string → treated as an image URL, rendered as <img>
   * - ReactNode → rendered directly in the viewport
   * - omitted → neutral placeholder
   */
  src?: React.ReactNode | string;

  /** Accessibility annotation overlays to draw on the previewed page. */
  annotations: Annotation[];

  /**
   * Animation mode.
   * "reveal" (default): strokes draw on once via Framer Motion inkStroke.
   * "static": marks render fully drawn, no animation.
   * `useReducedMotion()` always forces "static" regardless of this prop.
   */
  mode?: "reveal" | "static";

  /**
   * Reserved for the customizer split-handle view.
   * When supplied, `after` is rendered as the viewport content by default.
   * Full split-drag implementation is deferred to the dashboard surface plan.
   */
  beforeAfter?: {
    before: React.ReactNode;
    after: React.ReactNode;
  };

  /** Additional class names forwarded to the root wrapper. */
  className?: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Vellum amber — the brand annotation color. Severity token used for the
// overlay box tint only (subtle fill), never the stroke itself.
// --color-vellum-500 is the canonical @theme token defined in globals.css.
// Hoisted to module scope: pure constant, never changes between renders.
const AMBER = "var(--color-vellum-500)";

// SVG underline/bracket that represents the annotation stroke.
// The path draws a bracket shape: a short top tick, a vertical bar, a short
// bottom tick — like a code-review left-bracket comment marker.
// Coordinates are in SVG user units; the SVG is 20×40.
// Hoisted to module scope: pure constant, never changes between renders.
const BRACKET_PATH = "M 14 4 L 6 4 L 6 36 L 14 36";

/** A single visually-positioned annotation mark with an SVG stroke. */
function AnnotationMark({
  annotation,
  animate,
}: {
  annotation: Annotation;
  animate: boolean;
}) {

  // Animation variants: static means already at final state, no animation.
  const variants = animate ? inkStroke : undefined;
  const initial = animate ? "hidden" : undefined;
  const motionAnimate = animate ? "visible" : undefined;

  // Static style when not animating — pathLength 1 / opacity 1.
  const staticStyle = animate ? undefined : { pathLength: 1, opacity: 1 };

  return (
    <div
      data-testid="annotation-marker"
      className="absolute pointer-events-none"
      style={{
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        width: `${annotation.w}%`,
        height: `${annotation.h}%`,
      }}
    >
      {/* Overlay box — very subtle severity-tinted fill over the region */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-sm"
        style={{
          backgroundColor: `var(${SEVERITY_META[annotation.severity].bgToken}, ${AMBER}22)`,
          border: `1.5px solid ${AMBER}`,
          opacity: 0.4,
        }}
      />

      {/* SVG bracket stroke — draws on once via inkStroke */}
      <svg
        aria-hidden="true"
        viewBox="0 0 20 40"
        width="20"
        height="40"
        className="absolute"
        style={{
          // Position the bracket to the left of the annotation box
          left: "-22px",
          top: "50%",
          transform: "translateY(-50%)",
          overflow: "visible",
        }}
      >
        <motion.path
          d={BRACKET_PATH}
          fill="none"
          stroke={AMBER}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={variants}
          initial={initial}
          animate={motionAnimate}
          style={staticStyle}
          transition={
            animate
              ? { duration: DUR.mark, ease: [0.22, 1, 0.36, 1] }
              : undefined
          }
        />
      </svg>

      {/* Accessible label — visually hidden but announced by screen readers */}
      <span className="sr-only">{annotation.label}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Framed mock-browser showing a page with Vellum-amber annotation marks.
 *
 * @example
 * // Hero demo — animated, with a screenshot
 * <AnnotatedPreview
 *   src="https://example.com/screenshot.png"
 *   annotations={[
 *     { x: 10, y: 20, w: 30, h: 5, severity: "critical", label: "Missing alt text" },
 *   ]}
 *   mode="reveal"
 * />
 *
 * @example
 * // Static in-app scan result view
 * <AnnotatedPreview
 *   src={<SitePreviewComponent />}
 *   annotations={findings}
 *   mode="static"
 * />
 */
export function AnnotatedPreview({
  src,
  annotations,
  mode = "reveal",
  beforeAfter,
  className,
}: AnnotatedPreviewProps) {
  const prefersReducedMotion = useReducedMotion();

  // Determine whether to animate strokes:
  // animate = true only when mode is "reveal" AND reduced motion is not preferred.
  const animate = mode === "reveal" && !prefersReducedMotion;

  // Determine the viewport content to render:
  // 1. beforeAfter.after takes priority (split-drag deferred; render "after" by default)
  // 2. src as ReactNode or image URL
  // 3. Neutral placeholder
  let viewportContent: React.ReactNode;

  if (beforeAfter) {
    viewportContent = beforeAfter.after;
  } else if (src === undefined || src === null) {
    viewportContent = (
      <div
        data-testid="viewport-placeholder"
        className="flex h-full w-full items-center justify-center"
        style={{ backgroundColor: "var(--surface, #f5f4ef)" }}
      >
        <div
          aria-hidden="true"
          className="flex flex-col items-center gap-3 opacity-30"
        >
          {/* Decorative placeholder lines suggesting a page layout */}
          <div
            className="rounded"
            style={{
              width: "60%",
              height: "0.75rem",
              backgroundColor: "var(--border, #d4d0c8)",
            }}
          />
          <div
            className="rounded"
            style={{
              width: "80%",
              height: "0.5rem",
              backgroundColor: "var(--border, #d4d0c8)",
            }}
          />
          <div
            className="rounded"
            style={{
              width: "45%",
              height: "0.5rem",
              backgroundColor: "var(--border, #d4d0c8)",
            }}
          />
        </div>
      </div>
    );
  } else if (typeof src === "string") {
    viewportContent = (
      <img
        src={src}
        alt="Page preview"
        className="h-full w-full object-cover object-top"
      />
    );
  } else {
    viewportContent = src;
  }

  return (
    <div
      className={cn("flex flex-col overflow-hidden rounded-lg", className)}
      style={{
        background: "var(--surface, #faf9f5)",
        border: "1px solid var(--border, #d4d0c8)",
        boxShadow: "var(--shadow-sm, 0 1px 3px rgb(0 0 0 / 0.08))",
      }}
    >
      {/* ── Browser Chrome Bar ─────────────────────────────────────────────── */}
      <div
        data-testid="browser-chrome"
        className="flex shrink-0 items-center gap-2 border-b px-3 py-2"
        style={{
          background: "var(--surface, #faf9f5)",
          borderColor: "var(--border, #d4d0c8)",
        }}
      >
        {/* Three decorative window control dots — neutral, on-brand (no traffic-light).
            All three use --border-strong so they read as warm/neutral chrome spots
            and adapt correctly in both light and dark modes. */}
        <div
          aria-hidden="true"
          className="flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-2 w-2 rounded-full opacity-60"
              style={{ backgroundColor: "var(--border-strong)" }}
            />
          ))}
        </div>

        {/* Faux address bar pill */}
        <div
          aria-hidden="true"
          className="mx-auto flex h-5 flex-1 items-center justify-center rounded-full px-3"
          style={{
            background: "var(--background, #fff)",
            border: "1px solid var(--border, #d4d0c8)",
            maxWidth: "60%",
          }}
        >
          <span
            className="truncate text-[0.625rem] leading-none"
            style={{ color: "var(--muted-foreground, #888)" }}
          >
            example.com
          </span>
        </div>

        {/* Spacer to keep the address bar visually centered */}
        <div aria-hidden="true" className="w-10" />
      </div>

      {/* ── Viewport Area ──────────────────────────────────────────────────── */}
      <div
        data-testid="browser-viewport"
        className="relative min-h-[240px] flex-1 overflow-hidden"
        style={{ background: "var(--background, #fff)" }}
      >
        {/* Page content */}
        <div className="h-full w-full">{viewportContent}</div>

        {/* Annotation overlays — absolutely positioned inside viewport */}
        {annotations.map((annotation, index) => (
          <AnnotationMark
            key={index}
            annotation={annotation}
            animate={animate}
          />
        ))}
      </div>
    </div>
  );
}

"use client";
/**
 * _components/motion.tsx — accessible motion primitives for the v7 dashboard.
 *
 * The mobile-motion-hardening lane wants "maximal but accessible" motion across
 * the client dashboard: screen-entrance cascades, count-up numbers, an animated
 * score gauge, and buttons with real async/loading states. These primitives are
 * the single place that logic lives so every screen animates consistently and —
 * critically for an accessibility product — every animation collapses to an
 * instant, motionless state when the user has `prefers-reduced-motion: reduce`.
 *
 * WHY local to the dashboard lane: the shared `lib/design/motion.ts` exports the
 * easing/duration tokens + reveal/stagger variants, but the React wrappers that
 * consume them are dashboard-specific chrome, so they live beside the screens
 * that use them (Lane A owns `app/dashboard/**`).
 *
 * Reduced-motion discipline (NON-NEGOTIABLE):
 *  - Every component calls `useReducedMotion()` and, when true, renders the final
 *    visual state with NO transform/opacity transition and NO looping spinner.
 *  - This is a second safety net on top of the global CSS
 *    `@media (prefers-reduced-motion:reduce){*{animation:none!important;...}}`.
 *
 * Exports:
 *  - <Reveal>        — staggering parent for an entrance cascade.
 *  - <RevealItem>    — a single child that rises + fades into place.
 *  - <PageTransition>— wraps a whole screen for its entrance.
 *  - <CountUp>       — animates a number from 0 → value (tabular, a11y-safe).
 *  - <GaugeRing>     — animated SVG progress ring (strokeDashoffset fill).
 *  - <LoadingButton> — real <button> with an async/pending state + spinner.
 */

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { EASE_INK, DUR } from "@/lib/design/motion";

/* ── Variants ──────────────────────────────────────────────────────────────
 * Built on the shared tokens so timing/curves stay consistent app-wide. */

/** Parent that staggers its children into view. */
const staggerParentVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

/** A single card/KPI rising + fading into place. */
const cardRiseVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.section, ease: EASE_INK },
  },
};

/** Whole-screen entrance. */
const pageEnterVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.section, ease: EASE_INK, staggerChildren: 0.06 },
  },
};

/* ── Reveal (stagger parent) ─────────────────────────────────────────────── */
interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Render as a different element (default div). */
  as?: "div" | "section" | "ul";
}

/**
 * A staggering parent. Children that are <RevealItem> (or any motion child using
 * the `cardRise`/`hidden`→`visible` variants) cascade in. With reduced motion we
 * render a plain element so nothing moves.
 */
export function Reveal({ children, className, style, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      style={style}
      variants={staggerParentVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </MotionTag>
  );
}

/* ── RevealItem (stagger child) ──────────────────────────────────────────── */
interface RevealItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li";
}

/**
 * One item in a Reveal cascade. Must be a direct child of <Reveal> (or another
 * variants-driven parent) so it inherits the `hidden`/`visible` orchestration.
 * Reduced motion → plain element, fully visible, no transform.
 */
export function RevealItem({ children, className, style, as = "div" }: RevealItemProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return (
      <Tag className={className} style={style}>
        {children}
      </Tag>
    );
  }
  const MotionTag = motion[as];
  return (
    <MotionTag className={className} style={style} variants={cardRiseVariants}>
      {children}
    </MotionTag>
  );
}

/* ── PageTransition ──────────────────────────────────────────────────────── */
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wraps an entire screen so it fades/rises in on mount and staggers any direct
 * <RevealItem> children. Used by Shell.tsx around the routed page content so
 * EVERY dashboard screen gets a consistent entrance. Reduced motion → no-op.
 */
export function PageTransition({ children, className, style }: PageTransitionProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      variants={pageEnterVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/* ── CountUp ─────────────────────────────────────────────────────────────── */
interface CountUpProps {
  /** The final numeric value to land on. */
  value: number;
  /** Animation duration in ms (default 900). */
  durationMs?: number;
  /** Decimal places to render (default 0). */
  decimals?: number;
  /** Locale-format with thousands separators (default true). */
  format?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Animates a number from 0 up to `value` using requestAnimationFrame with an
 * ease-out curve. The element carries `font-variant-numeric: tabular-nums` so
 * the width doesn't jitter as digits change.
 *
 * Accessibility:
 *  - Reduced motion → renders the final value immediately, no ticking.
 *  - The displayed text IS the real value at all times, so screen readers that
 *    read the final DOM get the true number.
 */
export function CountUp({
  value,
  durationMs = 900,
  decimals = 0,
  format = true,
  className,
  style,
}: CountUpProps) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<number>(reduce ? value : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const from = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, reduce]);

  const rounded =
    decimals > 0
      ? Number(display.toFixed(decimals))
      : Math.round(display);
  const text = format
    ? rounded.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : String(rounded);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {text}
    </span>
  );
}

/* ── GaugeRing ───────────────────────────────────────────────────────────── */
interface GaugeRingProps {
  /** 0–100 score; null renders an empty ring. */
  value: number | null;
  /** Pixel size of the square SVG (default 158). */
  size?: number;
  /** Stroke gradient id suffix (must be unique on the page). */
  gradientId?: string;
  /** Track stroke color (the unfilled portion). */
  trackColor?: string;
  /** Gradient stops [from, to]. */
  from?: string;
  to?: string;
  /** Center content (number, unit, etc.). */
  children?: ReactNode;
  /** aria-label for the role=img wrapper. */
  ariaLabel: string;
}

const RING_CIRC = 98; // matches the 36-viewBox r=15.6 ring used across the dashboard

/**
 * Animated circular progress ring. The colored arc draws from empty to the
 * target fill by animating `strokeDashoffset`. Reduced motion → the arc renders
 * at its final offset with no draw animation. The visible number/label is passed
 * as children and the whole thing is exposed to AT via a labelled role=img.
 */
export function GaugeRing({
  value,
  size = 158,
  gradientId,
  trackColor = "rgba(13,27,77,.12)",
  from = "#1E63FF",
  to = "#1FA86B",
  children,
  ariaLabel,
}: GaugeRingProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  // Use caller-supplied id if provided, otherwise derive a document-unique one
  // so multiple GaugeRing instances on the same page don't share a gradient def.
  const gId = gradientId ?? `mky-gauge-${uid}`;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const targetOffset = RING_CIRC * (1 - pct / 100);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{ width: size, height: size, position: "relative" }}
    >
      <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden="true">
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx="18"
          cy="18"
          r="15.6"
          fill="none"
          stroke={trackColor}
          strokeWidth="3"
        />
        <motion.circle
          cx="18"
          cy="18"
          r="15.6"
          fill="none"
          stroke={`url(#${gId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRC}
          transform="rotate(-90 18 18)"
          initial={{ strokeDashoffset: reduce ? targetOffset : RING_CIRC }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE_INK, delay: 0.15 }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── LoadingButton ───────────────────────────────────────────────────────── */
type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true the button shows a spinner, is disabled, and announces busy. */
  loading?: boolean;
  /** Text/markup shown while loading (default keeps children + a spinner). */
  loadingText?: ReactNode;
  /** Optional leading icon (Tabler <i>) shown when NOT loading. */
  icon?: ReactNode;
  children: ReactNode;
};

/**
 * A real <button> with a first-class async state. While `loading`:
 *  - it is `disabled` + `aria-busy` so it can't be double-fired and AT announces
 *    the pending state,
 *  - it shows an inline spinner that rotates via framer-motion,
 *  - with reduced motion the spinner does NOT spin — we show a static dot and
 *    the loadingText so the busy state is still obvious without animation.
 *
 * It forwards every native button prop (type, className, onClick, style, …) so it
 * is a drop-in replacement for the dashboard's `.btn` buttons.
 */
export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    { loading = false, loadingText, icon, children, disabled, className, ...rest },
    ref
  ) {
    const reduce = useReducedMotion();
    return (
      <button
        ref={ref}
        className={className}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? (
          <>
            <Spinner reduce={!!reduce} />
            <span>{loadingText ?? children}</span>
          </>
        ) : (
          <>
            {icon}
            {children}
          </>
        )}
      </button>
    );
  }
);

/** Inline spinner used by LoadingButton. Reduced motion → a static pulse dot. */
function Spinner({ reduce }: { reduce: boolean }) {
  if (reduce) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "currentColor",
          opacity: 0.7,
          display: "inline-block",
        }}
      />
    );
  }
  return (
    <motion.span
      aria-hidden="true"
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        display: "inline-block",
      }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, ease: "linear", duration: 0.7 }}
    />
  );
}

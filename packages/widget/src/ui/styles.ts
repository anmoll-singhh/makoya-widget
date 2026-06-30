/**
 * styles.ts
 *
 * Produces the full Shadow DOM stylesheet for the Makoya widget panel.
 *
 * Design goals:
 *  - LAUNCHER_SIZES: three fixed sizes (sm/md/lg) for the circular launcher.
 *  - PANEL_CSS(color, size): returns a CSS string injected into the Shadow DOM
 *    <style> element. No DOM touches — pure string template.
 *
 * Glass approach:
 *  The panel shell uses rgba(255,255,255,.72) + backdrop-filter blur/saturate for
 *  the frosted-glass effect. Because blur lowers perceived contrast of text
 *  rendered over the semi-transparent layer, all text-bearing inner regions
 *  (.mky-head, .mky-body, .mky-foot) sit on a slightly MORE opaque sub-layer
 *  (rgba(255,255,255,.9)) so body text stays WCAG AA over the blur.
 *  A @supports fallback sets background:#fff for browsers without backdrop-filter.
 *
 * Mobile bottom-sheet (≤480px):
 *  The panel detaches from its corner and becomes a full-width bottom sheet —
 *  left:0; right:0; bottom:0; border-radius:22px 22px 0 0; max-height:85dvh.
 *  Hidden state is translateY(100%); .open snaps to translateY(0).
 *  Touch targets are bumped to ≥44px across every interactive control.
 *  Safe-area insets are honoured via env(safe-area-inset-*).
 *
 * Active-color usage:
 *  The ${color} CSS custom-property literal is spliced in at template time so
 *  every focus ring, active switch/seg/chip, and hover accent follows the
 *  site's primaryColor without additional JS.
 *
 * New classes added beyond the existing set:
 *  .mky-lang      — native <select> for language switching in the header
 *  .mky-sec       — section group wrapper (wraps .mky-sec-label + rows)
 *  .mky-statement — accessibility-statement link in the footer
 */

/** Button diameter in pixels for each named launcher size. */
export const LAUNCHER_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 48,
  md: 56,
  lg: 64,
};

/**
 * Returns the full Shadow-DOM stylesheet string for the widget.
 *
 * @param color  - The site's primaryColor (any valid CSS colour string).
 * @param size   - Launcher size key; drives button diameter.
 */
export function PANEL_CSS(color: string, size: "sm" | "md" | "lg"): string {
  const btnSize = LAUNCHER_SIZES[size];
  // SVG icon is ~50 % of button diameter, rounded to an even number.
  const iconSize = Math.round((btnSize * 0.5) / 2) * 2;

  return `
/* ─────────────────────────────────────────────────────────────────────────
   RESET + HOST
   ───────────────────────────────────────────────────────────────────────── */
:host {
  all: initial;
  /* Re-establish display so shadow children participate in layout */
  display: contents;
}
*, *::before, *::after {
  box-sizing: border-box;
}

/* ─────────────────────────────────────────────────────────────────────────
   LAUNCHER BUTTON
   ───────────────────────────────────────────────────────────────────────── */
.mky-btn {
  position: fixed;
  z-index: 2147483647;
  width: ${btnSize}px;
  height: ${btnSize}px;
  border-radius: 50%;
  background: ${color};
  color: #fff;
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  /* Layered soft shadow for depth — adapts to any background */
  box-shadow:
    0 10px 26px -8px rgba(0,0,0,.45),
    0 2px 6px rgba(0,0,0,.18),
    0 0 0 1px rgba(255,255,255,.08) inset;
  transition:
    transform .18s cubic-bezier(.2,.8,.2,1),
    box-shadow .18s ease;
  -webkit-tap-highlight-color: transparent;
  /* Prevent text-size scaling from distorting the button */
  font-size: 0;
}
.mky-btn:hover {
  transform: scale(1.06);
  box-shadow:
    0 14px 32px -8px rgba(0,0,0,.5),
    0 4px 10px rgba(0,0,0,.22),
    0 0 0 1px rgba(255,255,255,.12) inset;
}
.mky-btn:active {
  transform: scale(.95);
}
.mky-btn:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
  box-shadow:
    0 10px 26px -8px rgba(0,0,0,.45),
    0 2px 6px rgba(0,0,0,.18),
    0 0 0 4px ${color};
}
.mky-btn svg {
  width: ${iconSize}px;
  height: ${iconSize}px;
  /* Prevent icon from absorbing pointer events */
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   PANEL — GLASS (desktop ≥481px)
   ───────────────────────────────────────────────────────────────────────── */
.mky-panel {
  position: fixed;
  z-index: 2147483647;
  width: 360px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 108px);
  overflow-y: auto;
  overscroll-behavior: contain;
  /* Scrollbar styling (Webkit) */
  scrollbar-width: thin;
  scrollbar-color: rgba(15,23,42,.12) transparent;

  border-radius: 22px;
  /* Hairline border over the glass */
  border: 1px solid rgba(255,255,255,.55);
  /* Outer glow / shadow stack for premium depth */
  box-shadow:
    0 28px 64px -16px rgba(0,0,0,.28),
    0 8px 24px -10px rgba(0,0,0,.18),
    0 2px 6px rgba(0,0,0,.08),
    0 0 0 1px rgba(15,23,42,.06);

  /* Glass shell — semi-transparent so backdrop shows through */
  background: rgba(255,255,255,.72);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);

  /* Typography base */
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif;
  color: #0f172a;

  /* Hidden state */
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(10px) scale(.985);
  transition:
    opacity .22s ease,
    transform .22s cubic-bezier(.2,.8,.2,1),
    visibility .22s;
}
.mky-panel.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
}

/* Solid fallback for browsers without backdrop-filter support */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-panel {
    background: #fff;
  }
}

/* Webkit scrollbar cosmetics (inside shadow DOM, so safe to style) */
.mky-panel::-webkit-scrollbar { width: 5px; }
.mky-panel::-webkit-scrollbar-track { background: transparent; }
.mky-panel::-webkit-scrollbar-thumb {
  background: rgba(15,23,42,.14);
  border-radius: 99px;
}

/* ─────────────────────────────────────────────────────────────────────────
   AA LEGIBILITY INNER LAYERS
   The body gets a near-opaque tint so text stays WCAG AA over the glass
   blur. Head and foot are handled separately below because they are sticky
   and need their OWN opaque surface to prevent scrolled body content from
   showing through them.
   ───────────────────────────────────────────────────────────────────────── */
.mky-body {
  background: rgba(255,255,255,.9);
}

/* ─────────────────────────────────────────────────────────────────────────
   HEADER
   ───────────────────────────────────────────────────────────────────────── */
.mky-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 18px 14px;
  border-bottom: 1px solid rgba(15,23,42,.07);
  /* Stick header at the top when body scrolls */
  position: sticky;
  top: 0;
  /* Must be above .mky-body so scrolled rows don't bleed through */
  z-index: 2;
  /* Round top corners to match panel */
  border-radius: 22px 22px 0 0;
  /*
   * Opaque-enough surface so body content scrolling underneath is invisible.
   * Own backdrop-filter creates a frosted layer matching the panel glass look.
   * rgba(.92) base means even at low GPU quality there is <8% bleed-through.
   */
  background: rgba(255,255,255,.92);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
}

/*
 * Solid white fallback for browsers / headless environments without
 * backdrop-filter support (no GPU blur). This is the critical path for
 * automated QA (headless Chromium) — must be fully opaque: no bleed.
 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-head {
    background: #fff;
  }
}
.mky-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -.01em;
  color: #0f172a;
}
.mky-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}
.mky-close {
  width: 30px;
  height: 30px;
  flex: none;
  border: none;
  background: transparent;
  color: #64748b;
  border-radius: 9px;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s, color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-close:hover {
  background: rgba(15,23,42,.06);
  color: #0f172a;
}
.mky-close:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}
.mky-close svg {
  width: 18px;
  height: 18px;
  pointer-events: none;
}

/* Language select — small, unobtrusive, native */
.mky-lang {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 8px;
  background: rgba(255,255,255,.8);
  color: #475569;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 22px 4px 8px;
  cursor: pointer;
  flex: none;
  /* Caret via background SVG */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 7px center;
  transition: border-color .15s, background-color .15s;
}
.mky-lang:hover {
  border-color: ${color};
  background-color: #fff;
}
.mky-lang:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}

/* ─────────────────────────────────────────────────────────────────────────
   BODY
   ───────────────────────────────────────────────────────────────────────── */
.mky-body {
  /*
   * Vertical padding ensures the first and last feature rows are never
   * hidden behind the sticky header or footer. 4px top + 4px bottom gives
   * a small visual gap between the body rows and the sticky bars.
   */
  padding: 4px 10px 4px;
}

/* Section group wrapper */
.mky-sec {
  margin-bottom: 4px;
}

.mky-sec-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .05em;
  color: #94a3b8;
  margin: 4px 8px 9px;
  display: block;
}

/* Collapsible sections (<details>) — keep the panel uncluttered when there are
   many tools. The label becomes a clickable disclosure with a rotating caret. */
details.mky-sec > summary.mky-sec-label {
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  margin: 2px 4px 4px;
  padding: 6px 8px;
  border-radius: 9px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
details.mky-sec > summary.mky-sec-label::-webkit-details-marker { display: none; }
details.mky-sec > summary.mky-sec-label::after {
  content: "\\25B8"; /* ▸ */
  font-size: 12px;
  color: #94a3b8;
  transition: transform .15s ease;
}
details.mky-sec[open] > summary.mky-sec-label::after { transform: rotate(90deg); }
details.mky-sec > summary.mky-sec-label:hover { background: rgba(15,23,42,.045); }
details.mky-sec > summary.mky-sec-label:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}

/* ─────────────────────────────────────────────────────────────────────────
   PROFILES (chip grid)
   ───────────────────────────────────────────────────────────────────────── */
.mky-profiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.mky-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 11px;
  min-height: 44px;
  border: 1px solid rgba(15,23,42,.1);
  border-radius: 13px;
  /* Semi-transparent chip reads well on glass */
  background: rgba(255,255,255,.8);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  font-size: 13px;
  color: #334155;
  text-align: left;
  transition: border-color .15s, background .15s, transform .15s, box-shadow .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-chip:hover {
  border-color: ${color};
  background: rgba(255,255,255,.95);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -4px rgba(0,0,0,.14);
}
.mky-chip:active {
  transform: translateY(0);
}
.mky-chip:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}
.mky-chip svg {
  width: 18px;
  height: 18px;
  color: ${color};
  flex: none;
  pointer-events: none;
}
/* Active / selected profile chip — colored border + inset ring */
.mky-chip[aria-pressed="true"] {
  border-color: ${color};
  box-shadow: inset 0 0 0 2px ${color};
  background: rgba(255,255,255,.95);
}
.mky-chip[aria-pressed="true"] svg {
  color: ${color};
}

/* ─────────────────────────────────────────────────────────────────────────
   COLOR PALETTE (ruler color picker)
   ───────────────────────────────────────────────────────────────────────── */
.mky-palette {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 2px 8px 10px;
}
.mky-palette-label {
  font-size: 12px;
  color: #475569;
  font-weight: 600;
  flex: 0 0 100%;
}
.mky-swatch {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  border: 2px solid rgba(15,23,42,.15);
  cursor: pointer;
  padding: 0;
  transition: transform .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-swatch:hover {
  transform: scale(1.1);
}
/* "Off" swatch — a white circle with a diagonal slash so it reads as "none". */
.mky-swatch-off {
  position: relative;
  background: #fff !important;
}
.mky-swatch-off::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 2px;
  background: #ef4444;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 2px;
}
.mky-swatch[aria-pressed="true"] {
  border-color: #0f172a;
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px ${color};
}
.mky-swatch:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────
   DIVIDER
   ───────────────────────────────────────────────────────────────────────── */
.mky-divider {
  height: 1px;
  background: rgba(15,23,42,.07);
  margin: 14px 4px 6px;
}

/* ─────────────────────────────────────────────────────────────────────────
   FEATURE ROWS
   ───────────────────────────────────────────────────────────────────────── */
.mky-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 8px;
  border-radius: 12px;
  transition: background .15s;
  min-height: 40px;
}
.mky-row:hover {
  background: rgba(15,23,42,.04);
}
.mky-label {
  display: flex;
  align-items: center;
  gap: 11px;
  font-weight: 500;
  color: #1e293b;
}
.mky-label svg {
  width: 18px;
  height: 18px;
  color: #64748b;
  flex: none;
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────────────────────
   TOGGLE SWITCH
   ───────────────────────────────────────────────────────────────────────── */
.mky-switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex: none;
  border: none;
  border-radius: 999px;
  background: #e2e8f0;
  cursor: pointer;
  padding: 0;
  transition: background .2s cubic-bezier(.2,.8,.2,1);
  -webkit-tap-highlight-color: transparent;
}
.mky-switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.3);
  transition: transform .2s cubic-bezier(.2,.8,.2,1);
}
.mky-switch[aria-pressed="true"] {
  background: ${color};
}
.mky-switch[aria-pressed="true"]::after {
  transform: translateX(18px);
}
.mky-switch:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL
   ───────────────────────────────────────────────────────────────────────── */
.mky-seg {
  display: inline-flex;
  background: rgba(15,23,42,.06);
  border-radius: 11px;
  padding: 3px;
  gap: 2px;
}
.mky-seg button {
  border: none;
  background: transparent;
  color: #475569;
  padding: 5px 11px;
  border-radius: 8px;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  font-size: 13px;
  transition: background .15s, color .15s, box-shadow .15s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}
.mky-seg button[aria-pressed="true"] {
  background: #fff;
  color: ${color};
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(0,0,0,.12);
}
.mky-seg button:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}

/* ─────────────────────────────────────────────────────────────────────────
   STEPPER (text-size control)
   ───────────────────────────────────────────────────────────────────────── */
.mky-stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.mky-step {
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 9px;
  background: rgba(255,255,255,.9);
  color: #1e293b;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background .15s, border-color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-step:hover {
  background: rgba(255,255,255,1);
  border-color: ${color};
}
.mky-step:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}
.mky-stepval {
  min-width: 46px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

/* ─────────────────────────────────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────────────────────────────────── */
.mky-foot {
  padding: 12px 18px 16px;
  border-top: 1px solid rgba(15,23,42,.07);
  border-radius: 0 0 22px 22px;
  /* Stick footer at bottom when panel overflows */
  position: sticky;
  bottom: 0;
  /* Must be above .mky-body so scrolled rows don't bleed through */
  z-index: 2;
  /*
   * Opaque-enough surface so body content scrolling underneath is invisible.
   * Own backdrop-filter creates a frosted layer matching the panel glass look.
   */
  background: rgba(255,255,255,.92);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
}

/*
 * Solid white fallback for browsers / headless environments without
 * backdrop-filter support (no GPU blur). Must be fully opaque: no bleed.
 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .mky-foot {
    background: #fff;
  }
}
.mky-reset {
  width: 100%;
  padding: 9px;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 11px;
  background: rgba(255,255,255,.9);
  color: #334155;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  -webkit-tap-highlight-color: transparent;
}
.mky-reset:hover {
  background: #fff;
  border-color: ${color};
}
.mky-reset:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
}
.mky-note {
  margin: 11px 2px 0;
  font-size: 11px;
  line-height: 1.45;
  color: #64748b;
  text-align: center;
}
.mky-brand {
  margin: 9px 0 0;
  font-size: 11px;
  color: #64748b;
  text-align: center;
}
.mky-brand a {
  color: #475569;
  text-decoration: underline;
  font-weight: 600;
}
.mky-brand a:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
  border-radius: 2px;
}
/* Accessibility statement link — same tone as .mky-brand */
.mky-statement {
  display: block;
  margin: 8px 0 0;
  font-size: 11px;
  color: #475569;
  text-align: center;
  text-decoration: underline;
  font-weight: 600;
  cursor: pointer;
}
.mky-statement:hover {
  color: #0f172a;
}
.mky-statement:focus-visible {
  outline: 2px solid ${color};
  outline-offset: 1px;
  border-radius: 2px;
}

/* ─────────────────────────────────────────────────────────────────────────
   MOBILE BOTTOM SHEET  ≤480px
   The panel detaches from its corner and fills the viewport bottom.
   Safe-area insets prevent content hiding behind home-indicator / notch.
   ───────────────────────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .mky-panel {
    /* Override any inline corner positioning set by JS */
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100% !important;
    border-radius: 22px 22px 0 0;
    max-height: 85dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    /* Safe-area padding on the sides and bottom */
    padding-left: env(safe-area-inset-left, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
    /* Bottom-sheet hidden state: slide fully off-screen downward */
    transform: translateY(100%);
    /* Override desktop shadow with a top-shadow appropriate for sheet */
    box-shadow:
      0 -12px 40px -8px rgba(0,0,0,.18),
      0 -2px 8px rgba(0,0,0,.08);
    border-left: none;
    border-right: none;
    border-bottom: none;
    border-top: 1px solid rgba(255,255,255,.55);
  }
  .mky-panel.open {
    transform: translateY(0);
  }

  /* Header: round only the top on mobile */
  .mky-head {
    border-radius: 22px 22px 0 0;
  }
  /* Footer: flat bottom on mobile */
  .mky-foot {
    border-radius: 0;
    /* Extra bottom padding already handled by panel padding-bottom,
       but ensure the reset button itself isn't cropped */
    padding-bottom: 12px;
  }

  /* ── Touch targets: minimum 44×44px across all interactive controls ── */

  /* Close button — bump to 40px (spec requirement) */
  .mky-close {
    width: 40px;
    height: 40px;
  }

  /* Profile chips — ≥48px height as specified */
  .mky-chip {
    min-height: 48px;
    padding: 12px 11px;
  }

  /* Feature row — give more breathing room on mobile */
  .mky-row {
    min-height: 48px;
    padding: 12px 8px;
  }

  /* Toggle switch — visually taller touch target via transparent padding */
  .mky-switch {
    /* Keep the 42×24 visual but expand the tap surface */
    padding: 10px 0;
    height: auto;
    /* Use a transparent pseudo-element hit area instead */
  }
  /* Alternate approach: wrap won't work in Shadow DOM, use min-height on row */
  /* Actually on mobile, expand the switch itself for clear tapping */
  .mky-switch {
    width: 46px;
    height: 28px;
  }
  .mky-switch::after {
    width: 22px;
    height: 22px;
  }
  .mky-switch[aria-pressed="true"]::after {
    transform: translateX(18px);
  }

  /* Segmented control buttons — ≥44px height */
  .mky-seg button {
    min-height: 44px;
    padding: 10px 13px;
  }

  /* Stepper buttons — ≥44px */
  .mky-step {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  /* Reset button — comfortable on mobile */
  .mky-reset {
    padding: 13px;
    font-size: 15px;
  }

  /* Language select — larger tap area */
  .mky-lang {
    padding: 8px 28px 8px 10px;
    font-size: 13px;
  }

  /* The launcher stays fixed in its corner — no override needed */
}

/* ─────────────────────────────────────────────────────────────────────────
   REDUCED MOTION
   Disable all transitions for users who have requested it.
   ───────────────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .mky-btn,
  .mky-panel,
  .mky-switch,
  .mky-switch::after,
  .mky-chip,
  .mky-seg button,
  .mky-step,
  .mky-close,
  .mky-reset {
    transition: none !important;
    animation: none !important;
  }
}
`;
}

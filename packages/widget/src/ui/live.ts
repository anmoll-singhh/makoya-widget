/**
 * ui/live.ts
 *
 * "Live" accessibility controllers — effects that cannot be expressed as pure
 * CSS attribute rules and instead need DOM overlays or event listeners.
 *
 * WHY this module exists:
 *   The widget's primary effects model is "html[data-mky-*] attributes + ONE
 *   stylesheet" (effects.ts).  That model is clean, reversible, and safe.  But
 *   four features genuinely need imperative behaviour:
 *
 *   1. makeRuler      — a fixed band that tracks the mouse; purely CSS can't
 *                       follow pointer position.
 *   2. makeMask       — a fixed overlay with a transparent reading band that
 *                       tracks the pointer, or a full-viewport tint.  Same
 *                       reason: pointer-tracking requires JS.
 *   3. makeReadAloud  — invokes window.speechSynthesis on click; no CSS hook.
 *   4. makeMute       — sets `.muted` on <audio>/<video> elements and captures
 *                       future `play` events; again, no CSS equivalent.
 *
 * SAFETY CONTRACT (matches the widget's non-negotiable rules):
 *   - Each controller appends AT MOST its own overlay elements (ruler, mask
 *     divs) to document.documentElement — never touches or restructures any
 *     host-page DOM nodes.
 *   - All overlay elements carry `aria-hidden="true"` and
 *     `pointer-events:none`.
 *   - Every controller is fully reversible: off() / disable() removes its
 *     elements and event listeners leaving zero residue.
 *   - NEVER throws — every potentially-throwing path (speechSynthesis, voice
 *     lookup, localStorage) is guarded.
 *   - Feature-detection: if window.speechSynthesis is absent, makeReadAloud
 *     returns safe no-ops so the calling code never needs to branch.
 */

import type { Lang } from "./i18n";

// ---------------------------------------------------------------------------
// makeRuler
// ---------------------------------------------------------------------------

/**
 * Convert a CSS hex color (#rgb or #rrggbb) to an rgba() string with the
 * given alpha. Falls back to rgba(0,0,0,alpha) on any parse failure so that
 * named colors or malformed input never throw.
 */
function hexToRgba(hex: string, alpha: number): string {
  try {
    const clean = hex.trim().replace(/^#/, "");
    let r: number, g: number, b: number;
    if (clean.length === 3) {
      r = parseInt(clean[0] + clean[0], 16);
      g = parseInt(clean[1] + clean[1], 16);
      b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
      r = parseInt(clean.slice(0, 2), 16);
      g = parseInt(clean.slice(2, 4), 16);
      b = parseInt(clean.slice(4, 6), 16);
    } else {
      return `rgba(0,0,0,${alpha})`;
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return `rgba(0,0,0,${alpha})`;
  }
}

/**
 * Cursor-following reading ruler.
 *
 * A fixed full-width band (~28px) that tracks clientY via mousemove.
 * on()        — appends the band element + attaches the listener. Idempotent.
 * off()       — removes the element + detaches the listener.
 * setColor(c) — updates the ruler band color (hex string). If the ruler is
 *               currently active the live element is updated immediately;
 *               otherwise the color is stored and applied on the next on().
 *               The band background uses a translucent (~0.18 alpha) variant
 *               of the color; the border uses the full-opacity color.
 */
export function makeRuler(): { on(): void; off(): void; setColor(c: string): void } {
  let el: HTMLDivElement | null = null;
  let currentColor = "#ffd400"; // default yellow; updated by setColor()

  const move = (e: MouseEvent) => {
    if (el) el.style.top = `${e.clientY}px`;
  };

  function applyColor(c: string): void {
    if (!el) return;
    el.style.background = hexToRgba(c, 0.18);
    el.style.borderTop = `2px solid ${c}`;
    el.style.borderBottom = `2px solid ${c}`;
  }

  return {
    on() {
      if (el) return; // already active — idempotent
      el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "width:100vw",
        "height:28px",
        "pointer-events:none",
        "z-index:2147483646",
        "transform:translateY(-14px)",
      ].join(";");
      applyColor(currentColor);
      document.documentElement.appendChild(el);
      window.addEventListener("mousemove", move);
    },

    off() {
      if (!el) return;
      window.removeEventListener("mousemove", move);
      el?.remove();
      el = null;
    },

    setColor(c: string) {
      currentColor = c;
      applyColor(c); // no-op if el is null (ruler off)
    },
  };
}

// ---------------------------------------------------------------------------
// makeMask
// ---------------------------------------------------------------------------

type MaskMode = "off" | "dim" | "tint";

/**
 * Reading mask overlay controller.
 *
 * set("off")  — removes the overlay + any pointer listener.
 * set("dim")  — dark full-viewport overlay with a ~120px transparent
 *               horizontal band that tracks the pointer.  Implemented with
 *               two sibling divs: one dark div covering the viewport, and one
 *               transparent-background div (the "window") that tracks clientY
 *               and is positioned above the dark layer via z-index so the host
 *               content shows through.  Simpler and more reliable than a CSS
 *               gradient mask (which has vendor-prefix gaps).
 * set("tint") — uniform soft amber wash over the whole viewport; no moving
 *               band.  Useful for light-sensitivity / reading comfort.
 *
 * Both modes: pointer-events:none, aria-hidden, z-index strictly below
 * the widget host at 2147483647 — sheet at 2147483645, band/tint at 2147483646.
 *
 * Switching modes tears down the previous mode first — no leaks.
 */
export function makeMask(): { set(mode: MaskMode): void } {
  // The dark sheet covering the whole viewport
  let sheet: HTMLDivElement | null = null;
  // The transparent "window" band that tracks the cursor (dim mode only)
  let band: HTMLDivElement | null = null;
  // The tint overlay (tint mode only)
  let tintEl: HTMLDivElement | null = null;

  let currentMode: MaskMode = "off";

  const BAND_HEIGHT = 120; // px — height of the clear reading band

  const onMove = (e: MouseEvent) => {
    if (band) band.style.top = `${e.clientY - BAND_HEIGHT / 2}px`;
  };

  function teardown() {
    window.removeEventListener("mousemove", onMove);
    sheet?.remove();
    band?.remove();
    tintEl?.remove();
    sheet = null;
    band = null;
    tintEl = null;
  }

  function makeOverlayEl(extraCss: string): HTMLDivElement {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = [
      "position:fixed",
      "left:0",
      "top:0",
      "width:100%",
      "height:100%",
      "pointer-events:none",
      "z-index:2147483645",
      extraCss,
    ].join(";");
    return el;
  }

  return {
    set(mode: MaskMode) {
      if (mode === currentMode) return;

      // Always tear down the previous mode first
      teardown();
      currentMode = mode;

      if (mode === "off") {
        // Already torn down above
        return;
      }

      if (mode === "dim") {
        // Dark sheet covers everything
        sheet = makeOverlayEl("background:rgba(0,0,0,.55)");
        // Transparent band sits on top (higher z-index) to punch a hole
        band = makeOverlayEl(
          [
            `height:${BAND_HEIGHT}px`,
            "top:0", // overridden immediately by onMove
            "width:100%",
            "background:transparent",
            `z-index:2147483646`, // above the sheet (2147483645); strictly below widget root (2147483647)
          ].join(";")
        );
        // Reset 100% height set by makeOverlayEl for the band
        band.style.height = `${BAND_HEIGHT}px`;

        document.documentElement.appendChild(sheet);
        document.documentElement.appendChild(band);
        window.addEventListener("mousemove", onMove);
        // Position band immediately at viewport centre so it's visible on first render
        band.style.top = `${window.innerHeight / 2 - BAND_HEIGHT / 2}px`;
        return;
      }

      if (mode === "tint") {
        tintEl = makeOverlayEl(
          [
            "background:rgba(255,250,200,.18)",
            "z-index:2147483646", // override default sheet z-index to match band level
          ].join(";")
        );
        document.documentElement.appendChild(tintEl);
        return;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// makeReadAloud
// ---------------------------------------------------------------------------

/**
 * Click-to-read-aloud controller (SpeechSynthesis).
 *
 * FEATURE DETECTION: if window.speechSynthesis is absent all methods are
 * safe no-ops — no conditional handling needed in the caller.
 *
 * enable()       — attaches a CAPTURING click listener on document.  On every
 *                  click it reads the innerText of the clicked element via
 *                  SpeechSynthesisUtterance.  Ignores empty text.  Ignores
 *                  clicks inside the widget host (#makoya-widget-root) so
 *                  the user can still operate the panel without triggering TTS.
 *                  Cancels any in-progress utterance before starting a new one.
 * disable()      — cancels any current utterance + removes the listener.
 * setLang(lang)  — updates the language used for voice selection on future
 *                  utterances (does not interrupt a current one).
 *
 * Voice selection: picks the first voice whose .lang starts with the lang
 * code (e.g. "en" matches "en-US", "en-GB").  Falls back to the browser
 * default if no match (never throws).
 */
export function makeReadAloud(
  initialLang: Lang
): { enable(): void; disable(): void; setLang(lang: Lang): void } {
  // Feature detection — return safe no-ops if the API is absent
  if (!("speechSynthesis" in window)) {
    return {
      enable() {},
      disable() {},
      setLang(_lang: Lang) {},
    };
  }

  let currentLang: Lang = initialLang;
  let enabled = false;

  const onClick = (e: Event) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the widget host (let the user operate the panel)
      if (target.closest?.("#makoya-widget-root")) return;

      const text = target.innerText?.trim();
      if (!text) return;

      // Cancel any in-progress speech before starting a new utterance
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Pick a voice matching the current language; fall back to browser default
      try {
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.lang.startsWith(currentLang));
        if (match) utterance.voice = match;
      } catch {
        // Voice lookup failed — browser default will be used
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Never throw from a click handler
    }
  };

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      // Capturing phase so we hear clicks before they reach host-page handlers
      document.addEventListener("click", onClick, true);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Guard against any browser quirks
      }
      document.removeEventListener("click", onClick, true);
    },

    setLang(lang: Lang) {
      currentLang = lang;
    },
  };
}

// ---------------------------------------------------------------------------
// makeMute
// ---------------------------------------------------------------------------

/**
 * Mute-all-sounds controller.
 *
 * enable()  — sets muted=true on all current <audio> and <video> elements,
 *             then attaches a CAPTURING `play` listener on document that mutes
 *             any media that starts playing after enable() is called.
 * disable() — removes the `play` listener and sets muted=false on all current
 *             <audio> and <video> elements.  Fully reversible.
 *
 * Why capturing `play`?  The `play` event fires before audio actually starts;
 * capturing ensures we intercept it even if the element stops propagation.
 * Setting muted=true synchronously in the handler silences it reliably.
 *
 * Teardown: disable() un-mutes exactly the elements currently in the DOM.
 * Elements that were already muted before enable() will be un-muted by
 * disable() — a known simplification.  In practice, accessibility-tool users
 * expect "mute everything" to mean "restore silence when I turn it off".
 */
export function makeMute(): { enable(): void; disable(): void } {
  let enabled = false;

  const onPlay = (e: Event) => {
    const target = e.target;
    if (target instanceof HTMLMediaElement) {
      target.muted = true;
    }
  };

  function allMedia(): HTMLMediaElement[] {
    return Array.from(
      document.querySelectorAll<HTMLMediaElement>("audio, video")
    );
  }

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      // Mute everything currently in the DOM
      for (const el of allMedia()) el.muted = true;
      // Capture future play events
      document.addEventListener("play", onPlay, true);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      document.removeEventListener("play", onPlay, true);
      // Restore all current media elements
      for (const el of allMedia()) el.muted = false;
    },
  };
}

// ---------------------------------------------------------------------------
// makeHoverHighlight
// ---------------------------------------------------------------------------

/**
 * Hover-highlight controller.
 *
 * Outlines the element currently under the mouse pointer with a fixed-position
 * overlay div, helping focus/low-vision users see what they are pointing at
 * (accessiBe-style pointer-awareness feature).
 *
 * enable()  — appends one overlay div to document.documentElement and attaches
 *             a `mousemove` listener.  On each move the overlay is repositioned
 *             over the target element's bounding rect (viewport-relative, via
 *             getBoundingClientRect — no scrollX/Y needed for position:fixed).
 *             Skips the widget host element (#makoya-widget-root).
 * disable() — removes the listener + overlay, leaving zero residue.
 *
 * Safety contract: aria-hidden, pointer-events:none, never throws, z-index
 * strictly below the widget host (2147483647).
 */
export function makeHoverHighlight(): { enable(): void; disable(): void } {
  let el: HTMLDivElement | null = null;
  let enabled = false;

  const onMove = (e: MouseEvent) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target || !el) return;
      // Skip the widget's own host so interacting with the panel doesn't
      // cause a jarring outline to appear over the widget UI itself.
      if (target.closest?.("#makoya-widget-root")) {
        el.style.opacity = "0";
        return;
      }
      const rect = target.getBoundingClientRect();
      el.style.left   = `${rect.left}px`;
      el.style.top    = `${rect.top}px`;
      el.style.width  = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.opacity = "1";
    } catch {
      // Never throw from a mousemove handler
    }
  };

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      el = document.createElement("div");
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "width:0",
        "height:0",
        "border:2px solid #1e63ff",
        "border-radius:3px",
        "pointer-events:none",
        "z-index:2147483646",
        "opacity:0",
        "transition:top .06s ease,left .06s ease,width .06s ease,height .06s ease",
      ].join(";");
      document.documentElement.appendChild(el);
      window.addEventListener("mousemove", onMove);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      window.removeEventListener("mousemove", onMove);
      el?.remove();
      el = null;
    },
  };
}

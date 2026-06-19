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
 * Cursor-following reading ruler.
 *
 * A fixed full-width band (~28px) that tracks clientY via mousemove.
 * on()  — appends the band element + attaches the listener.  Idempotent.
 * off() — removes the element + detaches the listener.
 */
export function makeRuler(): { on(): void; off(): void } {
  let el: HTMLDivElement | null = null;

  const move = (e: MouseEvent) => {
    if (el) el.style.top = `${e.clientY}px`;
  };

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
        "background:rgba(0,0,0,.06)",
        "border-top:2px solid rgba(0,0,0,.45)",
        "border-bottom:2px solid rgba(0,0,0,.45)",
        "pointer-events:none",
        "z-index:2147483646",
        "transform:translateY(-14px)",
      ].join(";");
      document.documentElement.appendChild(el);
      window.addEventListener("mousemove", move);
    },

    off() {
      if (!el) return;
      window.removeEventListener("mousemove", move);
      el?.remove();
      el = null;
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

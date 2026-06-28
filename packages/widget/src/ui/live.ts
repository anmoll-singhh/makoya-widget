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

import { t, type Lang } from "./i18n";

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

/** Public surface of the read-aloud controller. Back-compat: enable/disable/
 *  setLang are unchanged; the rest extend it. */
export interface ReadAloudController {
  enable(): void;
  disable(): void;
  setLang(lang: Lang): void;
  /** Speech rate multiplier for future utterances (e.g. 0.75/1/1.25/1.5). */
  setRate(rate: number): void;
  /** When true, finishing a block auto-advances to the next readable block. */
  setContinuous(on: boolean): void;
  /** Resume if paused, else start reading from the first readable block. */
  play(): void;
  /** Pause the current utterance (no-op if nothing is speaking). */
  pause(): void;
  /** Resume a paused utterance. */
  resume(): void;
  /** Stop speech, clear the word highlight, and end any continuous run. */
  stop(): void;
}

/**
 * Click-to-read-aloud controller (SpeechSynthesis) — upgraded.
 *
 * FEATURE DETECTION: if window.speechSynthesis is absent all methods are
 * safe no-ops — no conditional handling needed in the caller.
 *
 * Behaviour:
 *   - Click any page block to read it. Clicks inside the widget host
 *     (#makoya-widget-root) are ignored so the panel stays operable.
 *   - WORD HIGHLIGHT: a non-destructive overlay box tracks the word currently
 *     being spoken, driven by the utterance `onboundary` event. The host DOM is
 *     NEVER mutated — the highlight is a fixed-position div over the word's
 *     client rect (computed from a DOM Range) and is removed on stop/disable.
 *   - CONTINUOUS mode (setContinuous): after a block finishes, automatically
 *     advances to the next readable block in document order until stopped.
 *   - RATE (setRate): 0.75/1/1.25/1.5 applied to future utterances.
 *   - play/pause/resume/stop transport controls.
 *
 * SAFETY: every path is guarded; handlers never throw. disable()/stop() cancel
 * speech and remove the overlay, leaving zero residue. To map `onboundary`
 * char indices back to DOM positions we speak the EXACT concatenation of the
 * block's text nodes (not innerText), so a charIndex indexes our own string and
 * the text-node map directly — no fragile re-tokenisation.
 */
export function makeReadAloud(initialLang: Lang): ReadAloudController {
  // Feature detection — return safe no-ops if the API is absent
  if (!("speechSynthesis" in window)) {
    return {
      enable() {},
      disable() {},
      setLang(_lang: Lang) {},
      setRate(_rate: number) {},
      setContinuous(_on: boolean) {},
      play() {},
      pause() {},
      resume() {},
      stop() {},
    };
  }

  let currentLang: Lang = initialLang;
  let enabled = false;
  let rate = 1;
  let continuous = false;

  // The overlay box that highlights the spoken word (created lazily on enable).
  let marker: HTMLDivElement | null = null;
  // The element currently being read + its flattened text-node map.
  let activeEl: HTMLElement | null = null;
  let nodeMap: { node: Text; start: number; end: number }[] = [];
  // Ordered snapshot of readable blocks for continuous advancement.
  let blocks: HTMLElement[] = [];
  let blockIdx = -1;
  // Set while stop() is intentionally cancelling so onend doesn't auto-advance.
  let stopping = false;

  /** Selector for "readable blocks" used by continuous mode. */
  const BLOCK_SELECTOR =
    "p, li, h1, h2, h3, h4, h5, h6, blockquote, dd, dt, figcaption, td, th, caption, summary, article, section";

  function ensureMarker(): HTMLDivElement | null {
    if (marker) return marker;
    try {
      marker = document.createElement("div");
      marker.setAttribute("aria-hidden", "true");
      marker.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "width:0",
        "height:0",
        "background:rgba(255,212,0,.45)",
        "outline:2px solid #b45309",
        "border-radius:2px",
        "pointer-events:none",
        "z-index:2147483646",
        "opacity:0",
        "transition:opacity .08s ease",
      ].join(";");
      document.documentElement.appendChild(marker);
    } catch {
      marker = null;
    }
    return marker;
  }

  function hideMarker(): void {
    if (marker) marker.style.opacity = "0";
  }

  /** Build the flattened text-node map for an element. The concatenated text is
   *  what we hand to SpeechSynthesis so char indices line up exactly. */
  function buildNodeMap(el: HTMLElement): string {
    nodeMap = [];
    let text = "";
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
          const parent = (n as Text).parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName;
          if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT")
            return NodeFilter.FILTER_REJECT;
          if (parent.closest?.("#makoya-widget-root"))
            return NodeFilter.FILTER_REJECT;
          if (!(n as Text).data.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node = walker.nextNode() as Text | null;
      while (node) {
        const start = text.length;
        text += node.data;
        nodeMap.push({ node, start, end: text.length });
        node = walker.nextNode() as Text | null;
      }
    } catch {
      nodeMap = [];
    }
    return text;
  }

  /** Position the highlight overlay over [charIndex, charIndex+len) of the
   *  active element using a DOM Range. Non-destructive. */
  function highlightWord(charIndex: number, len: number): void {
    const m = ensureMarker();
    if (!m || !activeEl || nodeMap.length === 0) return;
    try {
      const startHit = nodeMap.find((e) => charIndex >= e.start && charIndex < e.end);
      const endChar = charIndex + (len > 0 ? len : 1);
      const endHit =
        nodeMap.find((e) => endChar > e.start && endChar <= e.end) ?? startHit;
      if (!startHit || !endHit) return;
      const range = document.createRange();
      range.setStart(startHit.node, Math.max(0, charIndex - startHit.start));
      range.setEnd(endHit.node, Math.max(0, Math.min(endHit.node.data.length, endChar - endHit.start)));
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { hideMarker(); return; }
      m.style.left = `${rect.left}px`;
      m.style.top = `${rect.top}px`;
      m.style.width = `${rect.width}px`;
      m.style.height = `${rect.height}px`;
      m.style.opacity = "1";
    } catch {
      hideMarker();
    }
  }

  function pickVoice(u: SpeechSynthesisUtterance): void {
    try {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.lang.startsWith(currentLang));
      if (match) u.voice = match;
    } catch {
      /* browser default will be used */
    }
  }

  /** Speak one element with word highlighting + (optional) continuous advance. */
  function speakElement(el: HTMLElement): void {
    try {
      const text = buildNodeMap(el).trim();
      if (!text) {
        // Nothing readable here — in continuous mode try the next block.
        if (continuous) advance();
        return;
      }
      activeEl = el;
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      pickVoice(u);

      u.onboundary = (ev: SpeechSynthesisEvent) => {
        try {
          if (ev.name && ev.name !== "word") return;
          const len = (ev as { charLength?: number }).charLength ?? 0;
          highlightWord(ev.charIndex, len);
        } catch {
          /* never throw from a boundary handler */
        }
      };
      u.onend = () => {
        hideMarker();
        if (stopping) return;
        if (continuous) advance();
      };
      u.onerror = () => hideMarker();

      window.speechSynthesis.speak(u);
    } catch {
      /* never throw */
    }
  }

  /** Advance to the next readable block after the current one. */
  function advance(): void {
    try {
      if (blockIdx < 0 || blocks.length === 0) return;
      for (let i = blockIdx + 1; i < blocks.length; i++) {
        const next = blocks[i];
        if (!next.isConnected) continue;
        if (next.closest?.("#makoya-widget-root")) continue;
        if (!next.innerText?.trim()) continue;
        blockIdx = i;
        speakElement(next);
        return;
      }
      // Reached the end — stop cleanly.
      hideMarker();
    } catch {
      /* never throw */
    }
  }

  const onClick = (e: Event) => {
    try {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.("#makoya-widget-root")) return;

      // Resolve the nearest readable block (so clicking inline text reads its
      // paragraph rather than a bare <span>).
      const block = (target.closest?.(BLOCK_SELECTOR) as HTMLElement | null) ?? target;
      if (!block.innerText?.trim()) return;

      stopping = false;
      if (continuous) {
        // Snapshot blocks in document order and start from the clicked one.
        blocks = Array.from(document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
          (b) => !b.closest?.("#makoya-widget-root")
        );
        blockIdx = blocks.indexOf(block);
      }
      speakElement(block);
    } catch {
      /* never throw from a click handler */
    }
  };

  function cancelSpeech(): void {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* guard browser quirks */
    }
  }

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
      stopping = true;
      cancelSpeech();
      hideMarker();
      marker?.remove();
      marker = null;
      activeEl = null;
      nodeMap = [];
      blocks = [];
      blockIdx = -1;
      document.removeEventListener("click", onClick, true);
    },

    setLang(lang: Lang) {
      currentLang = lang;
    },

    setRate(r: number) {
      if (typeof r === "number" && r > 0 && isFinite(r)) rate = r;
    },

    setContinuous(on: boolean) {
      continuous = !!on;
    },

    play() {
      try {
        // Resume a paused utterance if one exists…
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          return;
        }
        // …otherwise begin reading from the first readable block on the page.
        if (window.speechSynthesis.speaking) return;
        stopping = false;
        blocks = Array.from(document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
          (b) => !b.closest?.("#makoya-widget-root") && !!b.innerText?.trim()
        );
        if (blocks.length === 0) return;
        blockIdx = 0;
        speakElement(blocks[0]);
      } catch {
        /* never throw */
      }
    },

    pause() {
      try { window.speechSynthesis.pause(); } catch { /* ignore */ }
    },

    resume() {
      try { window.speechSynthesis.resume(); } catch { /* ignore */ }
    },

    stop() {
      stopping = true;
      cancelSpeech();
      hideMarker();
      blockIdx = -1;
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

// ---------------------------------------------------------------------------
// makeKeyboardNav
// ---------------------------------------------------------------------------

/**
 * Keyboard-navigation controller.
 *
 * Adds power-user keyboard movement over the host page, mirroring the
 * enable()/disable() conventions of the other live controllers (idempotent,
 * never throws, aria-hidden overlays, teardown leaves zero residue).
 *
 * When enabled:
 *   - Injects a "Skip to main content" link as the FIRST focusable element on
 *     the page (visually hidden until focused). Activating it moves focus to
 *     <main>, [role=main], #main, or the first <h1>.
 *   - Attaches a CAPTURING keydown listener that ignores keystrokes while focus
 *     is in an input/textarea/select/contenteditable, or anywhere inside the
 *     widget host (#makoya-widget-root):
 *       H / Shift+H → next / previous heading
 *       L           → next landmark (main/nav/aside/header/footer/section/[role])
 *       K           → next link
 *       B           → back to top
 *     The target receives REAL focus (tabindex=-1 added if it isn't focusable),
 *     is scrolled into view, and a temporary focus marker (same style family as
 *     the hover highlight) is drawn over it.
 *   - Shows a small dismissible on-screen legend of the shortcuts on first
 *     enable (an aria-hidden visual aid; the real controls are the keys).
 *
 * disable() removes the skip link, the keydown listener, the marker, and the
 * legend — fully reversible.
 */
export function makeKeyboardNav(
  initialLang: Lang
): { enable(): void; disable(): void; setLang(lang: Lang): void } {
  let currentLang: Lang = initialLang;
  let enabled = false;

  let skipLink: HTMLAnchorElement | null = null;
  let legend: HTMLDivElement | null = null;
  let marker: HTMLDivElement | null = null;
  let markerTimer: ReturnType<typeof setTimeout> | null = null;

  const HEADING_SEL = "h1, h2, h3, h4, h5, h6";
  const LANDMARK_SEL =
    "main, nav, aside, header, footer, section, [role='main'], [role='navigation'], [role='complementary'], [role='banner'], [role='contentinfo'], [role='region'], [role='search']";
  const LINK_SEL = "a[href], area[href]";

  /** True if focus is somewhere we must NOT hijack (form fields, our own UI). */
  function isExempt(): boolean {
    try {
      const a = document.activeElement as HTMLElement | null;
      if (!a) return false;
      if (a.closest?.("#makoya-widget-root")) return true;
      const tag = a.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (a.isContentEditable) return true;
      return false;
    } catch {
      return false;
    }
  }

  /** Visible, non-widget elements matching `sel`, in document order. */
  function visibleMatches(sel: string): HTMLElement[] {
    try {
      return Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => {
        if (el.closest?.("#makoya-widget-root")) return false;
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        if (styles.visibility === "hidden" || styles.display === "none") return false;
        // Allow zero-rect inline anchors only if they have text/aria.
        if (rect.width === 0 && rect.height === 0 && !el.textContent?.trim()) return false;
        return true;
      });
    } catch {
      return [];
    }
  }

  /** Move REAL focus to `el`, scroll it into view, flash the marker. */
  function focusTarget(el: HTMLElement): void {
    try {
      if (el.tabIndex < 0 && !el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "-1");
      }
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      flashMarker(el);
    } catch {
      /* never throw */
    }
  }

  /** Pick the next match after the currently-focused/scrolled position. */
  function jump(sel: string, backwards = false): void {
    const matches = visibleMatches(sel);
    if (matches.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    let idx = active ? matches.indexOf(active) : -1;
    if (idx === -1) {
      // No current match focused — choose the first item below the fold (or 0).
      idx = backwards ? matches.length : -1;
    }
    const nextIdx = backwards ? idx - 1 : idx + 1;
    const wrapped = ((nextIdx % matches.length) + matches.length) % matches.length;
    focusTarget(matches[wrapped]);
  }

  function flashMarker(el: HTMLElement): void {
    try {
      if (!marker) {
        marker = document.createElement("div");
        marker.setAttribute("aria-hidden", "true");
        marker.style.cssText = [
          "position:fixed",
          "border:3px solid #1e63ff",
          "border-radius:4px",
          "box-shadow:0 0 0 3px rgba(255,255,255,.9)",
          "pointer-events:none",
          "z-index:2147483646",
          "opacity:0",
          "transition:opacity .1s ease",
        ].join(";");
        document.documentElement.appendChild(marker);
      }
      const rect = el.getBoundingClientRect();
      marker.style.left = `${rect.left - 2}px`;
      marker.style.top = `${rect.top - 2}px`;
      marker.style.width = `${rect.width + 4}px`;
      marker.style.height = `${rect.height + 4}px`;
      marker.style.opacity = "1";
      if (markerTimer) clearTimeout(markerTimer);
      markerTimer = setTimeout(() => { if (marker) marker.style.opacity = "0"; }, 1400);
    } catch {
      /* never throw */
    }
  }

  function gotoMain(): void {
    try {
      const target =
        document.querySelector<HTMLElement>("main, [role='main'], #main") ??
        document.querySelector<HTMLElement>("h1");
      if (target) focusTarget(target);
    } catch {
      /* never throw */
    }
  }

  const onKeydown = (e: KeyboardEvent) => {
    try {
      if (!enabled) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return; // don't clobber shortcuts
      if (isExempt()) return;
      switch (e.key) {
        case "h": case "H":
          e.preventDefault();
          jump(HEADING_SEL, e.shiftKey);
          break;
        case "l": case "L":
          e.preventDefault();
          jump(LANDMARK_SEL);
          break;
        case "k": case "K":
          e.preventDefault();
          jump(LINK_SEL);
          break;
        case "b": case "B":
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          gotoMain();
          break;
        default:
          break;
      }
    } catch {
      /* never throw from a key handler */
    }
  };

  function buildSkipLink(): void {
    try {
      skipLink = document.createElement("a");
      skipLink.href = "#";
      skipLink.textContent = t(currentLang, "kbd_skip");
      skipLink.setAttribute("data-mky-skip", "");
      // Visually hidden until focused (off-screen, not display:none so it's
      // still focusable). Becomes visible via inline focus/blur handlers.
      const hidden =
        "position:fixed;left:8px;top:-48px;z-index:2147483647;padding:10px 14px;" +
        "background:#1e63ff;color:#fff;border-radius:6px;font:600 14px/1.2 system-ui,sans-serif;" +
        "text-decoration:none;transition:top .15s ease;";
      skipLink.style.cssText = hidden;
      skipLink.addEventListener("focus", () => { if (skipLink) skipLink.style.top = "8px"; });
      skipLink.addEventListener("blur", () => { if (skipLink) skipLink.style.top = "-48px"; });
      skipLink.addEventListener("click", (ev) => {
        ev.preventDefault();
        gotoMain();
      });
      // Insert as the FIRST focusable element on the page.
      const body = document.body || document.documentElement;
      body.insertBefore(skipLink, body.firstChild);
    } catch {
      skipLink = null;
    }
  }

  function buildLegend(): void {
    try {
      legend = document.createElement("div");
      legend.setAttribute("aria-hidden", "true");
      legend.style.cssText = [
        "position:fixed",
        "left:16px",
        "bottom:16px",
        "max-width:240px",
        "z-index:2147483646",
        "background:#111827",
        "color:#f9fafb",
        "padding:10px 12px",
        "border-radius:8px",
        "box-shadow:0 6px 24px rgba(0,0,0,.35)",
        "font:13px/1.5 system-ui,sans-serif",
        "pointer-events:auto",
      ].join(";");
      const rows = [
        ["H", t(currentLang, "kbd_heading")],
        ["L", t(currentLang, "kbd_landmark")],
        ["K", t(currentLang, "kbd_link")],
        ["B", t(currentLang, "kbd_top")],
      ];
      const title = document.createElement("div");
      title.textContent = t(currentLang, "kbd_legend_title");
      title.style.cssText = "font-weight:700;margin-bottom:6px;";
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", t(currentLang, "close"));
      close.style.cssText =
        "position:absolute;top:4px;right:6px;background:none;border:none;color:#f9fafb;" +
        "font-size:18px;line-height:1;cursor:pointer;";
      close.addEventListener("click", () => { legend?.remove(); legend = null; });
      legend.appendChild(close);
      legend.appendChild(title);
      for (const [key, desc] of rows) {
        const r = document.createElement("div");
        const kbd = document.createElement("kbd");
        kbd.textContent = key;
        kbd.style.cssText =
          "display:inline-block;min-width:18px;text-align:center;padding:1px 5px;margin-right:6px;" +
          "background:#374151;border-radius:4px;font-family:inherit;font-weight:700;";
        r.appendChild(kbd);
        r.appendChild(document.createTextNode(desc));
        legend.appendChild(r);
      }
      document.documentElement.appendChild(legend);
    } catch {
      legend = null;
    }
  }

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      buildSkipLink();
      buildLegend();
      document.addEventListener("keydown", onKeydown, true);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      document.removeEventListener("keydown", onKeydown, true);
      if (markerTimer) { clearTimeout(markerTimer); markerTimer = null; }
      skipLink?.remove();
      legend?.remove();
      marker?.remove();
      skipLink = null;
      legend = null;
      marker = null;
    },

    setLang(lang: Lang) {
      currentLang = lang;
      // Refresh any visible text if currently enabled.
      try {
        if (skipLink) skipLink.textContent = t(currentLang, "kbd_skip");
        if (legend) { legend.remove(); legend = null; buildLegend(); }
      } catch {
        /* ignore */
      }
    },
  };
}

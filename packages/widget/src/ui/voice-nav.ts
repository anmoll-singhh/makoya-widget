/**
 * ui/voice-nav.ts
 *
 * Voice Navigation via the Web Speech API (SpeechRecognition / webkit prefix).
 *
 * SAFETY / SUPPORT:
 *   - Strictly feature-detected: if SpeechRecognition is absent, every method is
 *     a safe no-op (the caller never has to branch).
 *   - Mic-permission-gated by the browser; a denial just means no results fire.
 *   - NEVER throws — every recognition callback and DOM action is guarded.
 *   - Activates only elements already in the accessibility tree (not aria-hidden,
 *     not disabled). Uses focus()-then-click() so AT announces the target.
 *   - On an ambiguous "click <text>" (multiple matches) it does nothing rather
 *     than guess.
 *
 * Commands: "scroll down" / "scroll up", "go to top" / "go to bottom",
 * "click <link text>", "open menu" (best-effort: first nav/menu landmark).
 */

import type { Lang } from "./i18n";

// Minimal typings for the non-standard SpeechRecognition API.
interface SREvent { results: ArrayLike<ArrayLike<{ transcript: string }>>; }
interface SR {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function getRecognitionCtor(): (new () => SR) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isActivatable(el: Element): boolean {
  const e = el as HTMLElement;
  if (e.closest("#makoya-widget-root")) return false;
  if (e.getAttribute("aria-hidden") === "true") return false;
  if ((e as HTMLButtonElement).disabled) return false;
  const rect = e.getBoundingClientRect();
  return rect.width > 0 || rect.height > 0;
}

function activate(el: HTMLElement): void {
  try {
    el.focus({ preventScroll: false });
    el.click();
  } catch {
    /* never throw */
  }
}

export function makeVoiceNav(opts: { getLang: () => Lang }): { enable(): void; disable(): void } {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return { enable() {}, disable() {} }; // unsupported → safe no-ops
  }

  let rec: SR | null = null;
  let enabled = false;

  function runCommand(raw: string): void {
    const cmd = raw.toLowerCase().trim();
    try {
      const vh = window.innerHeight || 600;
      if (cmd.includes("scroll down")) return void window.scrollBy({ top: vh * 0.8, behavior: "smooth" });
      if (cmd.includes("scroll up")) return void window.scrollBy({ top: -vh * 0.8, behavior: "smooth" });
      if (cmd.includes("top")) return void window.scrollTo({ top: 0, behavior: "smooth" });
      if (cmd.includes("bottom")) return void window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      if (cmd.includes("open menu")) {
        const menu = document.querySelector<HTMLElement>("nav a, [role=menu] a, [role=navigation] a, header a");
        if (menu && isActivatable(menu)) activate(menu);
        return;
      }
      const m = cmd.match(/(?:click|open|press)\s+(.+)/);
      if (m) {
        const target = m[1].trim();
        const candidates = Array.from(
          document.querySelectorAll<HTMLElement>("a, button, [role=button]")
        ).filter(isActivatable);
        const text = (el: HTMLElement) => (el.innerText || el.textContent || "").toLowerCase().replace(/\s+/g, " ").trim();
        const exact = candidates.filter((el) => text(el) === target);
        const pick = exact.length ? exact : candidates.filter((el) => text(el).includes(target));
        if (pick.length === 1) activate(pick[0]); // single match only — never guess
      }
    } catch {
      /* never throw from a command */
    }
  }

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      try {
        rec = new Ctor();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = opts.getLang();
        rec.onresult = (e: SREvent) => {
          try {
            const last = e.results[e.results.length - 1];
            const transcript = last?.[0]?.transcript ?? "";
            if (transcript) runCommand(transcript);
          } catch {
            /* ignore one bad result */
          }
        };
        // Recognition auto-stops after a pause; restart while still enabled.
        rec.onend = () => {
          if (enabled) {
            try { rec?.start(); } catch { /* ignore restart race */ }
          }
        };
        rec.onerror = () => { /* permission denied / no-speech — stay silent */ };
        rec.start();
      } catch {
        // Mic blocked or start() threw — degrade silently.
        enabled = false;
        rec = null;
      }
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      try { rec?.stop(); } catch { /* ignore */ }
      rec = null;
    },
  };
}

/**
 * ui/dictionary.ts
 *
 * Online Dictionary — when the visitor selects a single word on the page, look
 * it up via the free, CORS-enabled dictionaryapi.dev and surface the definition.
 * Only the selected word leaves the page; everything is fail-silent.
 *
 * Split for testability:
 *   - `lookupWord(word, lang)` is the pure-ish network call (returns a typed
 *     result, never throws, never rejects).
 *   - `makeDictionary(onResult)` wires document text-selection → lookupWord →
 *     `onResult`, which the panel renders into an aria-live region so the
 *     result is announced to assistive tech.
 */

import type { Lang } from "./i18n";

export interface DictResult {
  ok: boolean;
  word: string;
  partOfSpeech?: string;
  definition?: string;
}

export type DictState =
  | { status: "loading"; word: string }
  | { status: "ok"; word: string; partOfSpeech?: string; definition: string }
  | { status: "none"; word: string }
  | { status: "error"; word: string };

const ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries";

/** Look up a single word. Never throws / never rejects — returns ok:false. */
export async function lookupWord(word: string, lang: Lang): Promise<DictResult> {
  const clean = word.trim().toLowerCase();
  if (!clean || /\s/.test(clean) || clean.length > 40) return { ok: false, word };
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(lang)}/${encodeURIComponent(clean)}`);
    if (!res.ok) return { ok: false, word: clean };
    const data = (await res.json()) as Array<{
      meanings?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>;
    }>;
    const meaning = data?.[0]?.meanings?.[0];
    const definition = meaning?.definitions?.[0]?.definition;
    if (!definition) return { ok: false, word: clean };
    return { ok: true, word: clean, partOfSpeech: meaning?.partOfSpeech, definition };
  } catch {
    return { ok: false, word: clean };
  }
}

/** True if a selection string is a single, plausibly-lookup-able word. */
function isWord(s: string): boolean {
  return /^[A-Za-zÀ-ÿ'’-]{1,40}$/.test(s);
}

export function makeDictionary(opts: {
  getLang: () => Lang;
  onResult: (state: DictState) => void;
}): { enable(): void; disable(): void } {
  let enabled = false;
  let seq = 0; // guards against out-of-order async results

  const onMouseUp = () => {
    try {
      const sel = window.getSelection?.();
      if (!sel) return;
      // Ignore selections inside our own UI.
      const anchor = sel.anchorNode as Node | null;
      const anchorEl = (anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement)) as HTMLElement | null;
      if (anchorEl?.closest?.("#makoya-widget-root")) return;

      const word = (sel.toString() || "").trim();
      if (!isWord(word)) return;

      const mySeq = ++seq;
      opts.onResult({ status: "loading", word });
      void lookupWord(word, opts.getLang()).then((r) => {
        if (mySeq !== seq || !enabled) return; // superseded or turned off
        if (r.ok && r.definition) {
          opts.onResult({ status: "ok", word: r.word, partOfSpeech: r.partOfSpeech, definition: r.definition });
        } else {
          opts.onResult({ status: "none", word: r.word });
        }
      });
    } catch {
      /* never throw from a selection handler */
    }
  };

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      document.addEventListener("mouseup", onMouseUp);
    },
    disable() {
      if (!enabled) return;
      enabled = false;
      document.removeEventListener("mouseup", onMouseUp);
    },
  };
}

/**
 * ui/live-readmode.ts
 *
 * Read Mode — extracts the page's main article text (read-only) and renders it
 * in a distraction-free, full-screen reading pane that lives in OUR OWN Shadow
 * DOM. The host page DOM is never modified.
 *
 * ACCESSIBILITY CONTRACT (per the a11y-architect review — this is a modal):
 *   - pane root carries role="dialog" + aria-modal="true",
 *   - on open, focus moves into the pane (the close button),
 *   - Tab / Shift+Tab are trapped within the pane,
 *   - Esc AND the close button close it and RETURN focus to the element that
 *     was focused when it opened (the Read Mode toggle in the panel),
 *   - if extraction finds too little, an accessible message is shown instead of
 *     an empty pane.
 *
 * SAFETY: own Shadow DOM (host CSS can't leak in, our CSS can't leak out),
 * appended to document.documentElement; never throws; fully reversible.
 *
 * `onClose` is invoked whenever the pane closes itself (Esc / button) so the
 * caller can sync the `readMode` pref back to false.
 */

import type { Lang } from "./i18n";
import { t } from "./i18n";

const MAX_NODES = 400; // extraction budget — never walk an unbounded DOM
const MIN_CHARS = 240; // below this we show the "couldn't build a view" message

interface Extracted {
  title: string;
  blocks: { tag: "h" | "p"; text: string }[];
  chars: number;
}

/** Pick the densest text container and pull its headings + paragraphs (bounded). */
function extractArticle(): Extracted {
  const title = (document.title || "").trim();
  const root =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector("[role=main]") ||
    document.body;

  const blocks: Extracted["blocks"] = [];
  let chars = 0;
  let seen = 0;
  try {
    const nodes = root.querySelectorAll("h1, h2, h3, h4, p, li");
    for (const node of Array.from(nodes)) {
      if (seen >= MAX_NODES) break;
      seen += 1;
      const el = node as HTMLElement;
      // Skip anything inside our own widget.
      if (el.closest?.("#makoya-widget-root")) continue;
      const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const tag: "h" | "p" = /^H[1-4]$/.test(el.tagName) ? "h" : "p";
      blocks.push({ tag, text });
      chars += text.length;
    }
  } catch {
    /* fall through to whatever we collected */
  }
  return { title, blocks, chars };
}

export function makeReadMode(opts: {
  onClose: () => void;
  /** A STABLE panel element to return focus to on close. Needed because the
   *  pane's trigger lives in a Shadow DOM, so document.activeElement at open
   *  time is the (non-focusable) shadow host — focusing it would be a no-op and
   *  focus would drift to <body>. */
  getReturnFocus?: () => HTMLElement | null;
}): {
  open(lang: Lang): void;
  close(): void;
} {
  let host: HTMLDivElement | null = null;
  let prevFocus: HTMLElement | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;

  function teardown(invokeCallback: boolean): void {
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
    }
    host?.remove();
    host = null;
    // Return focus to a stable panel element (the close button) — prevFocus is
    // the non-focusable shadow host, so it can't receive focus.
    try {
      const ret = opts.getReturnFocus?.() ?? prevFocus;
      (ret && document.contains(ret) ? ret : document.body)?.focus?.();
    } catch {
      /* ignore */
    }
    prevFocus = null;
    if (invokeCallback) {
      try { opts.onClose(); } catch { /* never throw */ }
    }
  }

  return {
    open(lang: Lang) {
      if (host) return; // already open
      try {
        prevFocus = (document.activeElement as HTMLElement | null) ?? null;

        host = document.createElement("div");
        host.style.cssText = "position:fixed;inset:0;z-index:2147483646;";
        const shadow = host.attachShadow({ mode: "open" });

        const { title, blocks, chars } = extractArticle();

        const style = document.createElement("style");
        style.textContent = `
          .wrap{position:fixed;inset:0;background:#fbfaf7;color:#1a1a1a;overflow:auto;
            font-family:Georgia,'Times New Roman',serif;}
          .bar{position:sticky;top:0;display:flex;justify-content:flex-end;padding:12px;
            background:#fbfaf7;border-bottom:1px solid #e7e2d8;}
          .close{font:inherit;font-family:system-ui,sans-serif;font-size:15px;cursor:pointer;
            border:2px solid #1a1a1a;background:#fff;color:#1a1a1a;border-radius:8px;padding:8px 16px;}
          .close:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
          .doc{max-width:720px;margin:0 auto;padding:24px 24px 96px;font-size:21px;line-height:1.7;}
          .doc h1{font-size:32px;line-height:1.25;margin:0 0 24px;}
          .doc h2,.doc h3,.doc h4{margin:32px 0 8px;line-height:1.3;}
          .doc p{margin:0 0 20px;}
          .empty{max-width:560px;margin:80px auto;text-align:center;font-size:20px;color:#555;}
        `;
        shadow.appendChild(style);

        const wrap = document.createElement("div");
        wrap.className = "wrap";
        wrap.setAttribute("role", "dialog");
        wrap.setAttribute("aria-modal", "true");
        wrap.setAttribute("aria-label", t(lang, "f_readMode"));

        const bar = document.createElement("div");
        bar.className = "bar";
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "close";
        closeBtn.textContent = t(lang, "close");
        closeBtn.addEventListener("click", () => teardown(true));
        bar.appendChild(closeBtn);

        const doc = document.createElement("div");
        doc.className = "doc";

        if (chars < MIN_CHARS) {
          const msg = document.createElement("p");
          msg.className = "empty";
          msg.textContent = t(lang, "readModeEmpty");
          doc.appendChild(msg);
        } else {
          if (title) {
            const h = document.createElement("h1");
            h.textContent = title;
            doc.appendChild(h);
          }
          for (const b of blocks) {
            const node = document.createElement(b.tag === "h" ? "h2" : "p");
            node.textContent = b.text;
            doc.appendChild(node);
          }
        }

        wrap.append(bar, doc);
        shadow.appendChild(wrap);
        document.documentElement.appendChild(host);

        // Focus the close button (moves AT context into the pane).
        requestAnimationFrame(() => closeBtn.focus());

        // Esc closes; Tab is trapped to the only focusable element (close btn),
        // so focus can never escape into the covered host page.
        keyHandler = (e: KeyboardEvent) => {
          if (!host) return;
          if (e.key === "Escape") {
            e.preventDefault();
            teardown(true);
          } else if (e.key === "Tab") {
            // Single focusable → keep focus on it.
            e.preventDefault();
            closeBtn.focus();
          }
        };
        document.addEventListener("keydown", keyHandler, true);
      } catch {
        // If anything went wrong, ensure we don't leave a half-open pane.
        teardown(false);
      }
    },

    close() {
      // Programmatic close (e.g. pref toggled off elsewhere) — no callback to
      // avoid a feedback loop with the caller that toggled the pref.
      if (!host) return;
      teardown(false);
    },
  };
}

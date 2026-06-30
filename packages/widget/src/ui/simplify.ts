/**
 * ui/simplify.ts
 *
 * AI Text Simplification — when the visitor selects a sentence/paragraph and the
 * site has opted in (server route is flag-gated OFF by default), a small
 * "Simplify" button appears near the selection. Clicking it sends ONLY the
 * selected text to our server route (Claude Haiku) and shows a plain-language
 * version in a popover. The host DOM is never modified.
 *
 * Cost discipline: we do NOT auto-call the model on every selection — the user
 * must press the button, so a paying site never spends a token per stray select.
 *
 * Fail-silent: if the route is disabled/unavailable or the network fails,
 * `postSimplify` returns null and we show a brief "couldn't simplify" message.
 * Own Shadow DOM (isolated, accessible), appended to documentElement; never
 * throws; fully reversible.
 */

import type { Lang } from "./i18n";
import { postSimplify } from "./widget-net";

const MIN_CHARS = 40; // only offer simplify for sentence/paragraph-length text
const MAX_CHARS = 2000; // route caps at 2000; trim client-side too

export interface SimplifyStrings {
  action: string;
  loading: string;
  failed: string;
  close: string;
}

export function makeSimplify(opts: {
  getLang: () => Lang;
  getSiteId: () => string;
  getStrings: () => SimplifyStrings;
}): { enable(): void; disable(): void } {
  let enabled = false;
  let host: HTMLDivElement | null = null;

  function destroy(): void {
    host?.remove();
    host = null;
  }

  function anchorRect(): DOMRect | null {
    try {
      const sel = window.getSelection?.();
      if (!sel || sel.rangeCount === 0) return null;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      return r && (r.width || r.height) ? r : null;
    } catch {
      return null;
    }
  }

  function show(text: string): void {
    destroy();
    const s = opts.getStrings();
    host = document.createElement("div");
    const rect = anchorRect();
    const top = rect ? Math.min(window.innerHeight - 60, rect.bottom + 8) : window.innerHeight - 80;
    const left = rect ? Math.max(8, Math.min(window.innerWidth - 340, rect.left)) : 16;
    host.style.cssText = `position:fixed;top:${top}px;left:${left}px;z-index:2147483646;`;
    const sh = host.attachShadow({ mode: "open" });
    const st = document.createElement("style");
    st.textContent =
      ".box{position:relative;max-width:340px;background:#fff;color:#1a1a1a;border:2px solid #1e63ff;" +
      "border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.25);" +
      "font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;}" +
      ".act{font:inherit;font-weight:600;cursor:pointer;border:0;background:#1e63ff;color:#fff;" +
      "border-radius:8px;padding:8px 14px;}" +
      ".act:focus-visible,.x:focus-visible{outline:3px solid #1a1a1a;outline-offset:2px;}" +
      ".x{position:absolute;top:4px;right:6px;border:0;background:transparent;font-size:18px;cursor:pointer;color:#666;}" +
      ".out{margin-top:4px;}";
    const box = document.createElement("div");
    box.className = "box";
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    const x = document.createElement("button");
    x.className = "x"; x.type = "button"; x.textContent = "×";
    x.setAttribute("aria-label", s.close);
    x.addEventListener("click", destroy);
    const body = document.createElement("div");
    body.textContent = text; // either the "Simplify" prompt slot or a result/message
    box.append(x, body);
    sh.append(st, box);
    document.documentElement.appendChild(host);
    // expose the body for in-place updates
    (host as unknown as { _body: HTMLElement })._body = body;
  }

  function setBody(node: Node | string): void {
    if (!host) return;
    const body = (host as unknown as { _body: HTMLElement })._body;
    if (!body) return;
    if (typeof node === "string") body.textContent = node;
    else { body.textContent = ""; body.appendChild(node); }
  }

  const onMouseUp = () => {
    try {
      const sel = window.getSelection?.();
      if (!sel) return;
      const anchorEl = (sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)) as HTMLElement | null;
      if (anchorEl?.closest?.("#makoya-widget-root")) return;
      const raw = (sel.toString() || "").trim();
      if (raw.length < MIN_CHARS) { destroy(); return; }
      const text = raw.slice(0, MAX_CHARS);
      const s = opts.getStrings();

      // Show the action popover with a "Simplify" button (no spend yet).
      show("");
      const btn = document.createElement("button");
      btn.className = "act";
      btn.type = "button";
      btn.textContent = s.action;
      btn.addEventListener("click", () => {
        setBody(s.loading);
        void postSimplify({ siteId: opts.getSiteId(), text, lang: opts.getLang() }).then((out) => {
          if (!host) return;
          setBody(out ?? s.failed);
        });
      });
      setBody(btn);
      // Move focus to the action so keyboard users can trigger it.
      requestAnimationFrame(() => btn.focus());
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
      destroy();
    },
  };
}

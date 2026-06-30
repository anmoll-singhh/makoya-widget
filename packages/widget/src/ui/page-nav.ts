/**
 * ui/page-nav.ts
 *
 * Read-only helpers for the Useful Links and Page Structure jump menus. They
 * SCAN the host page (never modify it) and return plain data the panel renders
 * as an accessible <ul><li><button> menu. Activating an item scrolls to the
 * target and focuses it so assistive tech announces the destination.
 *
 * All functions are defensive (never throw) and bounded (a hostile page can't
 * make them walk an unbounded list).
 */

const MAX_ITEMS = 100;

export interface NavItem {
  label: string;
  el: HTMLElement;
  /** Heading level 1–6 for structure items; undefined for links. */
  level?: number;
}

/** Is the element visible enough to be worth listing? (cheap heuristic) */
function isVisible(el: HTMLElement): boolean {
  try {
    if (el.closest("#makoya-widget-root")) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  } catch {
    return false;
  }
}

/** Collect the page's links (deduped by visible text + href, capped). */
export function collectLinks(): NavItem[] {
  const out: NavItem[] = [];
  const seen = new Set<string>();
  try {
    const anchors = document.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (const a of Array.from(anchors)) {
      if (out.length >= MAX_ITEMS) break;
      if (!isVisible(a)) continue;
      const label = (a.innerText || a.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue; // skip icon-only / empty links
      const key = `${label}|${a.getAttribute("href")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: label.length > 80 ? `${label.slice(0, 80)}…` : label, el: a });
    }
  } catch {
    /* return whatever we have */
  }
  return out;
}

/** Collect the page's heading outline (h1–h6), in document order, capped. */
export function collectHeadings(): NavItem[] {
  const out: NavItem[] = [];
  try {
    const headings = document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
    for (const h of Array.from(headings)) {
      if (out.length >= MAX_ITEMS) break;
      if (!isVisible(h)) continue;
      const label = (h.innerText || h.textContent || "").replace(/\s+/g, " ").trim();
      if (!label) continue;
      out.push({
        label: label.length > 80 ? `${label.slice(0, 80)}…` : label,
        el: h,
        level: Number(h.tagName.charAt(1)) || 1,
      });
    }
  } catch {
    /* return whatever we have */
  }
  return out;
}

/**
 * An accessible overlay jump-menu (its OWN Shadow DOM) listing the items from a
 * `collect` function as <button>s. Used by Useful Links + Page Structure. On
 * open, focus moves to the close button; Tab is trapped within the menu; Esc or
 * the close button close it and invoke `onClose` (so the caller can flip the
 * pref off) and restore focus to the trigger. Activating an item jumps to it.
 */
export function makeJumpMenu(opts: {
  collect: () => NavItem[];
  /** Getters so labels stay correct if the panel language changes. */
  getTitle: () => string;
  getCloseLabel: () => string;
  getEmptyLabel: () => string;
  onClose: () => void;
  /** Stable panel element to return focus to on Esc/button close (the trigger
   *  lives in a Shadow DOM so document.activeElement is the non-focusable host). */
  getReturnFocus?: () => HTMLElement | null;
}): { open(): void; close(): void } {
  let host: HTMLDivElement | null = null;
  let prevFocus: HTMLElement | null = null;
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;

  function focusables(shadow: ShadowRoot): HTMLElement[] {
    return Array.from(shadow.querySelectorAll<HTMLElement>("button"));
  }

  // restoreFocus=false is used when activating a nav item: we are intentionally
  // moving focus to the jumped-to target, so we must NOT pull it back to the
  // trigger. (Re-entrancy via onClose→apply→close is guarded by close()'s own
  // `if (!host) return`, so this never double-fires.)
  function teardown(cb: boolean, restoreFocus = true): void {
    if (keyHandler) { document.removeEventListener("keydown", keyHandler, true); keyHandler = null; }
    host?.remove();
    host = null;
    if (restoreFocus) {
      try {
        // Focus the getReturnFocus() element directly — it lives in a Shadow DOM
        // and document.contains() can't see into shadow roots (only the prevFocus
        // fallback uses the contains check).
        const ret = opts.getReturnFocus?.();
        if (ret) ret.focus?.();
        else (prevFocus && document.contains(prevFocus) ? prevFocus : document.body)?.focus?.();
      } catch { /* */ }
    }
    prevFocus = null;
    if (cb) { try { opts.onClose(); } catch { /* never throw */ } }
  }

  return {
    open() {
      if (host) return;
      try {
        prevFocus = (document.activeElement as HTMLElement | null) ?? null;
        const items = opts.collect();
        const title = opts.getTitle();
        const closeLabel = opts.getCloseLabel();
        const emptyLabel = opts.getEmptyLabel();

        host = document.createElement("div");
        // Max z-index so the menu (modal) sits above the settings panel.
        host.style.cssText = "position:fixed;inset:0;z-index:2147483647;";
        const shadow = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = `
          .scrim{position:fixed;inset:0;background:rgba(0,0,0,.35);}
          .panel{position:fixed;top:0;right:0;height:100%;width:min(360px,90vw);background:#fff;color:#1a1a1a;
            box-shadow:-8px 0 30px rgba(0,0,0,.25);display:flex;flex-direction:column;font-family:system-ui,sans-serif;}
          .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;}
          .hd h2{margin:0;font-size:17px;}
          .x{border:2px solid #1a1a1a;background:#fff;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit;}
          .x:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
          ul{list-style:none;margin:0;padding:8px;overflow:auto;flex:1;}
          li button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:10px 12px;
            border-radius:8px;cursor:pointer;font:inherit;font-size:15px;color:#1a1a1a;}
          li button:hover{background:#f1f3f6;}
          li button:focus-visible{outline:3px solid #1e63ff;outline-offset:-2px;}
          .empty{padding:24px 16px;color:#666;}
        `;
        shadow.appendChild(style);

        const scrim = document.createElement("div");
        scrim.className = "scrim";
        scrim.addEventListener("click", () => teardown(true));

        const panel = document.createElement("div");
        panel.className = "panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        panel.setAttribute("aria-label", title);

        const hd = document.createElement("div");
        hd.className = "hd";
        const h = document.createElement("h2");
        h.textContent = title;
        const x = document.createElement("button");
        x.className = "x";
        x.type = "button";
        x.textContent = closeLabel;
        x.addEventListener("click", () => teardown(true));
        hd.append(h, x);

        const list = document.createElement("ul");
        if (items.length === 0) {
          const empty = document.createElement("li");
          empty.className = "empty";
          empty.textContent = emptyLabel;
          list.appendChild(empty);
        } else {
          for (const it of items) {
            const li = document.createElement("li");
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = it.level ? `${"— ".repeat(Math.max(0, it.level - 1))}${it.label}` : it.label;
            // Close the menu WITHOUT restoring focus to the trigger, THEN jump —
            // so focus lands on the target (BUG-1: the old order let teardown's
            // focus-restore override the jump).
            b.addEventListener("click", () => { teardown(true, false); jumpTo(it.el); });
            li.appendChild(b);
            list.appendChild(li);
          }
        }

        panel.append(hd, list);
        shadow.append(scrim, panel);
        document.documentElement.appendChild(host);

        requestAnimationFrame(() => x.focus());

        keyHandler = (e: KeyboardEvent) => {
          if (!host) return;
          if (e.key === "Escape") { e.preventDefault(); teardown(true); return; }
          if (e.key === "Tab") {
            const f = focusables(shadow);
            if (f.length === 0) return;
            const first = f[0], last = f[f.length - 1];
            const active = shadow.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
          }
        };
        document.addEventListener("keydown", keyHandler, true);
      } catch {
        teardown(false);
      }
    },
    close() {
      if (!host) return;
      teardown(false);
    },
  };
}

/** Scroll the target into view and move focus to it (announces to AT).
 *  If the target isn't natively focusable we add a TEMPORARY tabindex and strip
 *  it again on blur, so the host DOM is left exactly as we found it (honouring
 *  the "never rewrite host DOM" invariant — the attribute never persists). */
export function jumpTo(el: HTMLElement): void {
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
      el.addEventListener(
        "blur",
        () => {
          try { el.removeAttribute("tabindex"); } catch { /* ignore */ }
        },
        { once: true }
      );
    }
    el.focus({ preventScroll: true });
  } catch {
    /* never throw */
  }
}

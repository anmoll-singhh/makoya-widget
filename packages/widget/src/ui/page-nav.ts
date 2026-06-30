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

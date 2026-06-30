/**
 * ui/keyboard-nav.ts
 *
 * Keyboard navigation shortcuts (accessiBe's Keyboard profile). MODIFIER-GATED
 * (Alt + letter) on purpose: bare single-letter shortcuts would clobber the
 * single-key quick-nav that NVDA/JAWS/VoiceOver use, so we require Alt:
 *
 *   Alt+M → main content      Alt+H → next heading
 *   Alt+F → next form field   Alt+B → next button
 *   Alt+G → next graphic/image
 *
 * Each press cycles to the NEXT matching element (wrapping), scrolls it into
 * view, and focuses it (announcing it to AT). Read-only: it only moves focus —
 * it never edits the host DOM (a transient tabindex on non-focusable targets is
 * removed on blur, same as page-nav.jumpTo).
 *
 * Never throws; fully reversible.
 */

const SELECTORS: Record<string, string> = {
  m: "main, [role=main]",
  h: "h1, h2, h3, h4, h5, h6",
  f: "input:not([type=hidden]), select, textarea",
  b: "button, [role=button], input[type=submit], input[type=button]",
  g: "img, svg, [role=img], picture",
};

function visible(el: Element): boolean {
  const e = el as HTMLElement;
  if (e.closest("#makoya-widget-root")) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 || r.height > 0;
}

function focusEl(el: HTMLElement): void {
  try {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (!el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
      el.addEventListener("blur", () => { try { el.removeAttribute("tabindex"); } catch { /* */ } }, { once: true });
    }
    el.focus({ preventScroll: true });
  } catch {
    /* never throw */
  }
}

export function makeKeyboardNav(): { enable(): void; disable(): void } {
  let enabled = false;
  const idx: Record<string, number> = {};

  const onKey = (e: KeyboardEvent) => {
    try {
      // Require Alt and NOT ctrl/meta so we don't fight OS / SR chords.
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      const sel = SELECTORS[key];
      if (!sel) return;
      const all = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter(visible);
      if (all.length === 0) return;
      e.preventDefault();
      const next = (idx[key] ?? -1) + 1;
      idx[key] = next >= all.length ? 0 : next;
      focusEl(all[idx[key]]);
    } catch {
      /* never throw from a key handler */
    }
  };

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      // NOT capture phase — let AT and the page see the key first; we only act
      // on Alt-chords the page almost never binds.
      document.addEventListener("keydown", onKey);
    },
    disable() {
      if (!enabled) return;
      enabled = false;
      document.removeEventListener("keydown", onKey);
      for (const k of Object.keys(idx)) delete idx[k];
    },
  };
}

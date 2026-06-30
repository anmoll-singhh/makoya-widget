/**
 * ui/live-magnifier.ts
 *
 * Text Magnifier — a pointer-driven lens that shows the text under the cursor at
 * a larger size, for low-vision users. Read-only: it reads the text content of
 * the element under the pointer and renders it in OUR overlay; it never edits,
 * screenshots, or restructures the host DOM.
 *
 * Follows the ui/live.ts controller contract:
 *   - appends ONE fixed div to document.documentElement,
 *   - the div is aria-hidden + pointer-events:none (so elementFromPoint sees
 *     through it to the real page),
 *   - fully reversible: disable() removes the element + listener, zero residue,
 *   - never throws (guards every DOM read).
 *
 * Pointer/mouse feature by nature — documented as such; it does nothing useful
 * on touch and that is acceptable (it simply never shows).
 */

const MAX_LEN = 240; // cap the text we read so a huge node can't bloat the lens
const OFFSET = 24; // px gap between cursor and lens

export function makeMagnifier(): { enable(): void; disable(): void } {
  let lens: HTMLDivElement | null = null;
  let enabled = false;

  const onMove = (e: MouseEvent) => {
    try {
      if (!lens) return;
      // Hide while over our own UI so we don't magnify the widget panel.
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el || el.closest?.("#makoya-widget-root")) {
        lens.style.opacity = "0";
        return;
      }
      const text = (el.innerText || el.textContent || "").trim();
      if (!text) {
        lens.style.opacity = "0";
        return;
      }
      lens.textContent = text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}…` : text;
      // Position near the cursor, clamped to the viewport.
      const w = 320;
      let left = e.clientX + OFFSET;
      let top = e.clientY + OFFSET;
      if (left + w > window.innerWidth) left = e.clientX - w - OFFSET;
      if (top + 160 > window.innerHeight) top = e.clientY - 160 - OFFSET;
      lens.style.left = `${Math.max(8, left)}px`;
      lens.style.top = `${Math.max(8, top)}px`;
      lens.style.opacity = "1";
    } catch {
      /* never throw from a mousemove handler */
    }
  };

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      lens = document.createElement("div");
      lens.setAttribute("aria-hidden", "true");
      lens.style.cssText = [
        "position:fixed",
        "left:0",
        "top:0",
        "max-width:320px",
        "padding:12px 16px",
        "background:#ffffff",
        "color:#111111",
        "font-size:26px",
        "line-height:1.4",
        "font-family:Verdana, Arial, sans-serif",
        "border:2px solid #1e63ff",
        "border-radius:10px",
        "box-shadow:0 8px 30px rgba(0,0,0,.25)",
        "pointer-events:none",
        "z-index:2147483646",
        "opacity:0",
        "overflow:hidden",
        "max-height:160px",
      ].join(";");
      document.documentElement.appendChild(lens);
      window.addEventListener("mousemove", onMove);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      window.removeEventListener("mousemove", onMove);
      lens?.remove();
      lens = null;
    },
  };
}

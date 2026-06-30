/**
 * ui/virtual-keyboard.ts
 *
 * On-screen keyboard that types into the focused host <input>/<textarea>. Built
 * for users who cannot use a physical keyboard. Pointer/desktop-primary (it does
 * NOT suppress a mobile OS keyboard).
 *
 * KEY DETAILS (per the a11y-architect + architect reviews):
 *   - Every key button calls `mousedown.preventDefault()` so clicking a key does
 *     NOT move focus away from the host input — focus stays put and the synthetic
 *     input lands in the right field.
 *   - Text is injected with the NATIVE value setter
 *     (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set)
 *     plus a bubbling InputEvent('input', {inputType:'insertText'}), so React/Vue
 *     CONTROLLED inputs update too. The deprecated execCommand is NOT used.
 *   - This is synthetic input dispatch into an EXISTING field — not structural
 *     host-DOM rewriting; the invariant holds.
 *   - The keyboard UI itself lives in our own Shadow DOM (isolated, accessible
 *     real <button>s); appended to document.documentElement; fully reversible.
 *   - Never throws.
 */

type Editable = HTMLInputElement | HTMLTextAreaElement;

function isEditable(el: Element | null): el is Editable {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    // Skip non-text inputs (checkbox/radio/button/file/range…).
    return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"].includes(type);
  }
  return false;
}

/** Set value via the native setter so framework-controlled inputs react. */
function setNativeValue(el: Editable, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else (el as HTMLInputElement).value = value;
}

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

export function makeVirtualKeyboard(): { enable(): void; disable(): void } {
  let host: HTMLDivElement | null = null;
  let enabled = false;
  let lastEditable: Editable | null = null;

  // Remember the most recently focused editable host field. mousedown.preventDefault
  // on the keys keeps focus there, but tracking it is a belt-and-braces fallback.
  const onFocusIn = (e: Event) => {
    const target = e.target as Element | null;
    if (target && !target.closest?.("#makoya-vk-root") && isEditable(target)) {
      lastEditable = target as Editable;
    }
  };

  function targetField(): Editable | null {
    const active = document.activeElement;
    if (isEditable(active)) return active as Editable;
    if (lastEditable && document.contains(lastEditable)) return lastEditable;
    return null;
  }

  function type(insert: string, kind: "char" | "backspace" | "clear"): void {
    try {
      const el = targetField();
      if (!el) return;
      const cur = el.value ?? "";
      let next = cur;
      let inputType = "insertText";
      if (kind === "char") next = cur + insert;
      else if (kind === "backspace") { next = cur.slice(0, -1); inputType = "deleteContentBackward"; }
      else if (kind === "clear") { next = ""; inputType = "deleteContent"; }
      setNativeValue(el, next);
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType, data: kind === "char" ? insert : null }));
    } catch {
      /* never throw */
    }
  }

  function makeKey(label: string, aria: string, onPress: () => void, wide = false): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = wide ? "vk-key vk-wide" : "vk-key";
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    // CRITICAL: prevent focus transfer so the host input stays focused.
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", onPress);
    return b;
  }

  return {
    enable() {
      if (enabled) return;
      enabled = true;
      document.addEventListener("focusin", onFocusIn, true);

      host = document.createElement("div");
      host.id = "makoya-vk-root";
      host.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483645;";
      const shadow = host.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = `
        .vk{background:#1f2430;padding:10px;display:flex;flex-direction:column;gap:8px;
          box-shadow:0 -6px 24px rgba(0,0,0,.3);font-family:system-ui,sans-serif;}
        .vk-row{display:flex;gap:6px;justify-content:center;}
        .vk-key{min-width:40px;height:44px;border:0;border-radius:8px;background:#3a4150;color:#fff;
          font-size:17px;cursor:pointer;flex:1;max-width:64px;}
        .vk-key:hover{background:#4a5365;}
        .vk-key:focus-visible{outline:3px solid #1e63ff;outline-offset:2px;}
        .vk-wide{max-width:none;flex:2;}
        .vk-space{flex:6;}
      `;
      shadow.appendChild(style);

      const vk = document.createElement("div");
      vk.className = "vk";
      vk.setAttribute("role", "group");
      vk.setAttribute("aria-label", "On-screen keyboard");

      for (const row of ROWS) {
        const r = document.createElement("div");
        r.className = "vk-row";
        for (const ch of row) r.appendChild(makeKey(ch, ch, () => type(ch, "char")));
        vk.appendChild(r);
      }
      // Action row: space, backspace, clear.
      const actions = document.createElement("div");
      actions.className = "vk-row";
      const space = makeKey("Space", "Space", () => type(" ", "char"), true);
      space.classList.add("vk-space");
      actions.append(
        makeKey("⌫", "Backspace", () => type("", "backspace"), true),
        space,
        makeKey("Clear", "Clear field", () => type("", "clear"), true),
      );
      vk.appendChild(actions);

      shadow.appendChild(vk);
      document.documentElement.appendChild(host);
    },

    disable() {
      if (!enabled) return;
      enabled = false;
      document.removeEventListener("focusin", onFocusIn, true);
      host?.remove();
      host = null;
      lastEditable = null;
    },
  };
}

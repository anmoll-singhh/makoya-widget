/**
 * lib/scanner/custom-checks.ts
 *
 * The supplementary, in-page DOM checks that axe-core does not cover.
 *
 * Why a separate, self-contained module (mirrors `content-hash.ts`):
 * ─────────────────────────────────────────────────────────────────
 * `scanCustomChecks` is intentionally SELF-CONTAINED — it references only DOM
 * APIs available in both a real browser and jsdom, with every constant/helper
 * inlined. That lets Playwright serialize it into a single `page.evaluate`
 * round-trip (`index.ts` → `runCustomChecks`) AND lets the same code path run
 * under jsdom in unit tests (`custom-checks.test.ts`). One code path, fully
 * tested, no heavy imports dragged into the test environment.
 *
 * DO NOT reference any module-scope identifier (import, const, helper) from
 * inside `scanCustomChecks` — Playwright serializes the function source, so any
 * closure reference would be `undefined` in the browser. Everything the scan
 * needs is declared inside the function body.
 *
 * Determinism: no Date / Math.random / network. `querySelectorAll` yields DOM
 * order; `getComputedStyle` is a pure read. Node lists are display-capped while
 * `totalInstances` carries the TRUE match count (drives the score).
 */

/** A single offending element, as captured inside the page. */
export type CustomCheckNode = {
  selector: string;
  html: string;
  failureSummary: string;
};

/** One custom check's result — same shape the engine maps to RawAxeViolation. */
export type CustomCheckResult = {
  id: string;
  description: string;
  help: string;
  impact: string;
  /** TRUE number of matched elements (before display capping). */
  totalInstances: number;
  nodes: CustomCheckNode[];
};

/**
 * Runs ALL custom DOM checks in a single pass inside the live page.
 *
 * axe-core misses (numbered to match `CUSTOM_CHECK_IDS` in index.ts):
 *  1. generic-link-text            — "click here", "read more", etc.
 *  2. new-window-no-warning        — target="_blank" without notice
 *  3. document-link-no-type        — .pdf/.doc links without file-type text
 *  4. media-autoplay               — <video>/<audio autoplay>
 *  5. focus-ring-hidden            — inline outline:none on focusable elements
 *  6. icon-button-no-label         — icon-only buttons with no accessible name
 *  7. placeholder-as-label         — placeholder used INSTEAD of a label
 *  8. table-missing-headers        — data table with no <th>/scope/headers
 *  9. heading-order-skip           — heading level jumps (h2 → h4)
 * 10. positive-tabindex            — tabindex > 0 (breaks natural tab order)
 * 11. text-over-image-no-contrast  — text on a background image axe can't judge
 *
 * Returns plain serializable objects; the caller filters empties, normalises
 * the impact, attaches WCAG tags, and truncates HTML.
 */
export function scanCustomChecks(): CustomCheckResult[] {
  const out: CustomCheckResult[] = [];

  // ── helpers (all inlined — must NOT reference module scope) ──────────────
  // CSS.escape exists in browsers but not always under jsdom (tests) — fall
  // back to a conservative manual escape so `sel` never throws.
  const esc = (s: string): string =>
    typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function"
      ? CSS.escape(s)
      : s.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
  function sel(el: Element): string {
    if (el.id) return `#${esc(el.id)}`;
    const parts: string[] = [];
    let cur: Element | null = el;
    while (cur && cur.tagName && parts.length < 4) {
      let s = cur.tagName.toLowerCase();
      if (cur.id) {
        s = `#${esc(cur.id)}`;
        parts.unshift(s);
        break;
      }
      const sibs = Array.from(cur.parentElement?.children ?? []).filter(
        (c) => c.tagName === cur!.tagName
      );
      if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
      parts.unshift(s);
      cur = cur.parentElement;
    }
    return parts.join(" > ");
  }
  function html(el: Element): string {
    const h = el.outerHTML ?? "";
    return h.length > 300 ? h.slice(0, 300) + "…" : h;
  }
  function txt(el: Element): string {
    return (el.textContent ?? "").trim().toLowerCase();
  }
  function attr(el: Element, name: string): string {
    return (el.getAttribute(name) ?? "").toLowerCase();
  }

  // ── 1. Generic / ambiguous link text ───────────────────────────────────
  const GENERIC = [
    "click here",
    "here",
    "read more",
    "more",
    "learn more",
    "click",
    "this link",
    "continue",
    "details",
    "info",
    "link",
  ];
  const genericLinks = Array.from(document.querySelectorAll("a[href]")).filter((el) => {
    const t = txt(el);
    const al = attr(el, "aria-label");
    const check = al || t;
    return GENERIC.some((g) => check === g);
  });
  if (genericLinks.length) {
    out.push({
      id: "generic-link-text",
      description: "Links use non-descriptive text that loses meaning out of context",
      help: 'Replace generic text like "click here" or "read more" with a description of the destination',
      impact: "serious",
      totalInstances: genericLinks.length,
      nodes: genericLinks.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `Link text "${txt(el) || attr(el, "aria-label")}" is non-descriptive`,
      })),
    });
  }

  // ── 2. New-window links without warning ────────────────────────────────
  const newWin = Array.from(document.querySelectorAll("a[target='_blank']")).filter((el) => {
    const combined = txt(el) + attr(el, "aria-label") + attr(el, "title");
    return !/(new (window|tab)|opens in)/i.test(combined);
  });
  if (newWin.length) {
    out.push({
      id: "new-window-no-warning",
      description: "Links that open in a new window or tab do not warn the user",
      help: 'Add "(opens in new window)" to link text or aria-label for target="_blank" links',
      impact: "minor",
      totalInstances: newWin.length,
      nodes: newWin.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: "Link opens in new window/tab without notifying the user",
      })),
    });
  }

  // ── 3. Document links without file-type indicator ──────────────────────
  const DOC_PATTERN = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|zip)(\?|$)/i;
  const docLinks = Array.from(document.querySelectorAll("a[href]")).filter((el) => {
    const href = attr(el, "href");
    if (!DOC_PATTERN.test(href)) return false;
    const combined = txt(el) + attr(el, "aria-label");
    return !/(pdf|word|excel|spreadsheet|document|doc|xls|ppt|csv|download)/i.test(combined);
  });
  if (docLinks.length) {
    out.push({
      id: "document-link-no-type",
      description: "Links to downloadable documents do not identify the file format",
      help: 'Include the file type in the link text, e.g. "Annual Report (PDF)"',
      impact: "moderate",
      totalInstances: docLinks.length,
      nodes: docLinks.slice(0, 5).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `Document link to "${attr(el, "href").split("/").pop()}" has no file-type indicator`,
      })),
    });
  }

  // ── 4. Autoplay media (WCAG 1.4.2) ────────────────────────────────────
  const autoplay = Array.from(document.querySelectorAll("video[autoplay], audio[autoplay]")).filter(
    (el) => !el.hasAttribute("muted") || el.tagName === "AUDIO"
  );
  if (autoplay.length) {
    out.push({
      id: "media-autoplay",
      description: "Media elements start playing without user interaction",
      help: "Remove autoplay, or ensure the media has no audio and provide a pause mechanism",
      impact: "serious",
      totalInstances: autoplay.length,
      nodes: autoplay.slice(0, 4).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `${el.tagName.toLowerCase()} autoplays — users cannot control audio playback`,
      })),
    });
  }

  // ── 5. Focus ring hidden via inline style ──────────────────────────────
  const FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";
  const noFocus = Array.from(document.querySelectorAll(FOCUSABLE)).filter((el) => {
    const s = el.getAttribute("style") ?? "";
    return /outline\s*:\s*0|outline\s*:\s*none/i.test(s);
  });
  if (noFocus.length) {
    out.push({
      id: "focus-ring-hidden",
      description: "Focusable elements have their focus indicator removed via inline style",
      help: "Never set outline:none on focusable elements without providing a custom focus style",
      impact: "serious",
      totalInstances: noFocus.length,
      nodes: noFocus.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: "Inline style removes focus ring (outline:none / outline:0)",
      })),
    });
  }

  // ── 6. Icon-only buttons without accessible label ──────────────────────
  const iconBtns = Array.from(document.querySelectorAll("button, [role='button']")).filter((el) => {
    const t = (el.textContent ?? "").replace(/\s+/g, "");
    const al = attr(el, "aria-label");
    const alby = attr(el, "aria-labelledby");
    const title = attr(el, "title");
    if (al || alby || title) return false;
    const hasSvg = el.querySelector("svg");
    const hasImg = el.querySelector("img");
    const hasText = t.length > 0;
    return (hasSvg || hasImg) && !hasText;
  });
  if (iconBtns.length) {
    out.push({
      id: "icon-button-no-label",
      description: "Icon-only buttons have no accessible name for screen readers",
      help: "Add aria-label or aria-labelledby to every button that contains only an icon",
      impact: "critical",
      totalInstances: iconBtns.length,
      nodes: iconBtns.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: "Button contains only SVG/img with no accessible label",
      })),
    });
  }

  // ── 7. Placeholder used as the only label (WCAG 1.3.1 / 4.1.2) ──────────
  // A placeholder is NOT a label: it vanishes on input, has poor contrast, and
  // is not reliably announced. Flag text inputs whose ONLY "label" is the
  // placeholder. False-positive guards: skip non-text input types (they ignore
  // placeholder); honour aria-label/-labelledby/title, a wrapping <label>, and
  // an explicit `label[for=id]` association.
  const SKIP_INPUT_TYPES = new Set([
    "hidden",
    "submit",
    "reset",
    "button",
    "checkbox",
    "radio",
    "range",
    "color",
    "file",
    "image",
  ]);
  function inputHasLabel(el: Element): boolean {
    if ((el.getAttribute("aria-label") ?? "").trim()) return true;
    if ((el.getAttribute("aria-labelledby") ?? "").trim()) return true;
    if ((el.getAttribute("title") ?? "").trim()) return true;
    const id = el.getAttribute("id");
    if (id) {
      try {
        if (document.querySelector(`label[for="${esc(id)}"]`)) return true;
      } catch {
        /* malformed id — fall through */
      }
    }
    if (el.closest("label")) return true;
    return false;
  }
  const placeholderOnly = Array.from(
    document.querySelectorAll("input[placeholder], textarea[placeholder]")
  ).filter((el) => {
    const ph = (el.getAttribute("placeholder") ?? "").trim();
    if (!ph) return false;
    if (el.tagName === "INPUT") {
      const type = (el.getAttribute("type") ?? "text").toLowerCase();
      if (SKIP_INPUT_TYPES.has(type)) return false;
    }
    return !inputHasLabel(el);
  });
  if (placeholderOnly.length) {
    out.push({
      id: "placeholder-as-label",
      description: "Form fields use placeholder text instead of a real, persistent label",
      help: "Add a visible <label> (or aria-label) — a placeholder disappears on input and is not a substitute",
      impact: "serious",
      totalInstances: placeholderOnly.length,
      nodes: placeholderOnly.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `Field relies on placeholder "${(el.getAttribute("placeholder") ?? "").slice(0, 40)}" with no associated label`,
      })),
    });
  }

  // ── 8. Data table with no header semantics (WCAG 1.3.1) ─────────────────
  // A data table needs <th> (or scope/headers) so screen readers can associate
  // each cell with its row/column. False-positive guards: skip
  // role=presentation/none (declared layout tables) and tables with no <td>
  // (empty/structural shells), then require the absence of <th>, [scope] and
  // [headers].
  const dataTables = Array.from(document.querySelectorAll("table")).filter((t) => {
    const role = (t.getAttribute("role") ?? "").toLowerCase();
    if (role === "presentation" || role === "none") return false;
    if (!t.querySelector("td")) return false;
    if (t.querySelector("th")) return false;
    if (t.querySelector("[scope]")) return false;
    if (t.querySelector("[headers]")) return false;
    return true;
  });
  if (dataTables.length) {
    out.push({
      id: "table-missing-headers",
      description: "Data tables have no header cells, so rows and columns cannot be associated",
      help: 'Mark header cells with <th> and add scope="col"/"row" (or use headers/id) on data tables',
      impact: "serious",
      totalInstances: dataTables.length,
      nodes: dataTables.slice(0, 5).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary:
          "Data table has no <th>, [scope] or [headers] — cell relationships are lost",
      })),
    });
  }

  // ── 9. Heading levels that skip (WCAG 1.3.1 / best practice) ────────────
  // Jumping from h2 to h4 hides the document outline from screen-reader users.
  // We only flag DOWNWARD skips (level grows by 2+); returning UP the outline
  // (h4 → h2) is legitimate, and the first heading is never flagged.
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  const headingSkips: { el: Element; from: number; to: number }[] = [];
  let prevLevel = 0;
  for (const h of headings) {
    const level = Number(h.tagName.charAt(1));
    if (prevLevel !== 0 && level > prevLevel + 1) {
      headingSkips.push({ el: h, from: prevLevel, to: level });
    }
    prevLevel = level;
  }
  if (headingSkips.length) {
    out.push({
      id: "heading-order-skip",
      description: "Heading levels skip a rank, breaking the document outline",
      help: "Do not jump heading levels (e.g. h2 → h4); increase by one rank at a time",
      impact: "moderate",
      totalInstances: headingSkips.length,
      nodes: headingSkips.slice(0, 6).map(({ el, from, to }) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `Heading level jumps from h${from} to h${to}`,
      })),
    });
  }

  // ── 10. Positive tabindex (WCAG 2.4.3) ──────────────────────────────────
  // tabindex > 0 forces an unnatural tab order that desynchronises focus from
  // the visual/DOM order and is almost always a mistake. tabindex 0 and -1 are
  // legitimate and ignored.
  const positiveTab = Array.from(document.querySelectorAll("[tabindex]")).filter((el) => {
    const ti = parseInt(el.getAttribute("tabindex") ?? "", 10);
    return Number.isFinite(ti) && ti > 0;
  });
  if (positiveTab.length) {
    out.push({
      id: "positive-tabindex",
      description: "Elements use a positive tabindex, overriding the natural tab order",
      help: 'Use tabindex="0" (or rely on DOM order) instead of positive values that break focus sequence',
      impact: "moderate",
      totalInstances: positiveTab.length,
      nodes: positiveTab.slice(0, 6).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary: `tabindex="${el.getAttribute("tabindex")}" forces an unnatural tab order`,
      })),
    });
  }

  // ── 11. Text over a background image axe can't contrast-check (WCAG 1.4.3) ─
  // axe measures contrast against a solid background colour. When text sits
  // directly on a background IMAGE with a transparent / low-alpha background
  // colour, axe cannot judge contrast — so we flag it as a risk for human
  // review. False-positive guards: require DIRECT (own) text, a real `url(...)`
  // image (gradients excluded), and a transparent/low-alpha background colour;
  // skip script/style/template containers.
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  function directText(el: Element): string {
    let t = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3 /* TEXT_NODE */) t += n.textContent ?? "";
    });
    return t.trim();
  }
  function isLowAlphaBg(color: string): boolean {
    const c = (color || "").trim().toLowerCase();
    if (!c || c === "transparent") return true;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1]
        .split(/[,/]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length >= 4) {
        const a = parseFloat(parts[3]);
        return Number.isFinite(a) && a < 0.5;
      }
      return false; // rgb() — opaque
    }
    return false; // named / hex colour — opaque
  }
  const textOverImage = Array.from(document.querySelectorAll("body *")).filter((el) => {
    if (SKIP_TAGS.has(el.tagName)) return false;
    if (!directText(el)) return false;
    let cs: CSSStyleDeclaration;
    try {
      cs = getComputedStyle(el as HTMLElement);
    } catch {
      return false;
    }
    const bg = cs.backgroundImage ?? "";
    if (!bg || bg === "none" || bg.indexOf("url(") === -1) return false;
    return isLowAlphaBg(cs.backgroundColor ?? "");
  });
  if (textOverImage.length) {
    out.push({
      id: "text-over-image-no-contrast",
      description: "Text sits on a background image, so its contrast cannot be reliably verified",
      help: "Add a solid/overlay background behind text on images, or verify contrast against the image manually",
      impact: "moderate",
      totalInstances: textOverImage.length,
      nodes: textOverImage.slice(0, 5).map((el) => ({
        selector: sel(el),
        html: html(el),
        failureSummary:
          "Text rendered over a background image with a transparent background colour — contrast unverifiable",
      })),
    });
  }

  return out;
}

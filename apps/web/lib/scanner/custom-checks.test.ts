// @vitest-environment jsdom
/**
 * lib/scanner/custom-checks.test.ts
 *
 * Unit tests for the self-contained in-page custom checks. Because
 * `scanCustomChecks` only touches DOM APIs available in jsdom, we can drive it
 * directly against a constructed document — the exact same code path Playwright
 * serializes into the live page (mirrors content-hash.test.ts).
 *
 * Focus: the v2 additions (checks 7–11) plus a couple of regression guards for
 * the migrated v1 checks and the shared shape/cap conventions.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { scanCustomChecks, type CustomCheckResult } from "./custom-checks";

function run(html: string): Map<string, CustomCheckResult> {
  document.body.innerHTML = html;
  const results = scanCustomChecks();
  return new Map(results.map((r) => [r.id, r]));
}

describe("scanCustomChecks — shared shape", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("returns no results for a clean document", () => {
    const r = run(`<main><h1>Title</h1><p>Hello world</p></main>`);
    expect(r.size).toBe(0);
  });

  it("each emitted result carries id/description/help/impact/totalInstances/nodes", () => {
    const r = run(`<input placeholder="Email">`);
    const v = r.get("placeholder-as-label")!;
    expect(v).toBeDefined();
    expect(typeof v.description).toBe("string");
    expect(typeof v.help).toBe("string");
    expect(v.impact).toBe("serious");
    expect(v.totalInstances).toBe(1);
    expect(v.nodes[0]).toMatchObject({
      selector: expect.any(String),
      html: expect.any(String),
      failureSummary: expect.any(String),
    });
  });
});

describe("placeholder-as-label", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("flags an input whose only label is a placeholder", () => {
    const r = run(`<input type="text" placeholder="Your name">`);
    expect(r.get("placeholder-as-label")!.totalInstances).toBe(1);
  });

  it("does NOT flag when an aria-label is present", () => {
    const r = run(`<input placeholder="Your name" aria-label="Your name">`);
    expect(r.has("placeholder-as-label")).toBe(false);
  });

  it("does NOT flag when a wrapping <label> is present", () => {
    const r = run(`<label>Name <input placeholder="Your name"></label>`);
    expect(r.has("placeholder-as-label")).toBe(false);
  });

  it("does NOT flag when an explicit label[for] association exists", () => {
    const r = run(`<label for="n">Name</label><input id="n" placeholder="Your name">`);
    expect(r.has("placeholder-as-label")).toBe(false);
  });

  it("skips non-text input types (e.g. checkbox/submit) that ignore placeholders", () => {
    const r = run(`<input type="submit" placeholder="Go"><input type="checkbox" placeholder="x">`);
    expect(r.has("placeholder-as-label")).toBe(false);
  });

  it("also covers <textarea>", () => {
    const r = run(`<textarea placeholder="Message"></textarea>`);
    expect(r.get("placeholder-as-label")!.totalInstances).toBe(1);
  });
});

describe("table-missing-headers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("flags a data table with no <th>/scope/headers", () => {
    const r = run(`<table><tr><td>1</td><td>2</td></tr></table>`);
    expect(r.get("table-missing-headers")!.totalInstances).toBe(1);
  });

  it("does NOT flag a table that has <th>", () => {
    const r = run(`<table><tr><th>H</th></tr><tr><td>1</td></tr></table>`);
    expect(r.has("table-missing-headers")).toBe(false);
  });

  it("does NOT flag when [scope] is used", () => {
    const r = run(`<table><tr><td scope="col">H</td></tr><tr><td>1</td></tr></table>`);
    expect(r.has("table-missing-headers")).toBe(false);
  });

  it("does NOT flag role=presentation layout tables", () => {
    const r = run(`<table role="presentation"><tr><td>x</td></tr></table>`);
    expect(r.has("table-missing-headers")).toBe(false);
  });

  it("does NOT flag an empty table with no <td>", () => {
    const r = run(`<table></table>`);
    expect(r.has("table-missing-headers")).toBe(false);
  });
});

describe("heading-order-skip", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("flags a downward skip (h2 → h4)", () => {
    const r = run(`<h1>A</h1><h2>B</h2><h4>C</h4>`);
    const v = r.get("heading-order-skip")!;
    expect(v.totalInstances).toBe(1);
    expect(v.nodes[0].failureSummary).toMatch(/h2 to h4/);
  });

  it("does NOT flag a well-ordered outline", () => {
    const r = run(`<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>`);
    expect(r.has("heading-order-skip")).toBe(false);
  });

  it("does NOT flag returning UP the outline (h4 → h2)", () => {
    const r = run(`<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h2>E</h2>`);
    expect(r.has("heading-order-skip")).toBe(false);
  });

  it("does not flag the first heading regardless of level", () => {
    const r = run(`<h3>Only heading</h3>`);
    expect(r.has("heading-order-skip")).toBe(false);
  });
});

describe("positive-tabindex", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("flags tabindex > 0", () => {
    const r = run(`<div tabindex="3">x</div><a href="#" tabindex="1">y</a>`);
    expect(r.get("positive-tabindex")!.totalInstances).toBe(2);
  });

  it("does NOT flag tabindex 0 or -1", () => {
    const r = run(`<div tabindex="0">x</div><div tabindex="-1">y</div>`);
    expect(r.has("positive-tabindex")).toBe(false);
  });
});

describe("text-over-image-no-contrast", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("flags direct text over a url() background with a transparent background colour", () => {
    const r = run(
      `<div style="background-image:url(hero.jpg);background-color:transparent">Welcome</div>`
    );
    expect(r.get("text-over-image-no-contrast")!.totalInstances).toBe(1);
  });

  it("does NOT flag when there is no background image", () => {
    const r = run(`<div style="background-color:transparent">Welcome</div>`);
    expect(r.has("text-over-image-no-contrast")).toBe(false);
  });

  it("does NOT flag a gradient (no url()) background", () => {
    const r = run(
      `<div style="background-image:linear-gradient(#fff,#000);background-color:transparent">Welcome</div>`
    );
    expect(r.has("text-over-image-no-contrast")).toBe(false);
  });

  it("does NOT flag when the element has no direct text", () => {
    const r = run(
      `<div style="background-image:url(hero.jpg);background-color:transparent"><span>Welcome</span></div>`
    );
    // the outer div has no DIRECT text, the inner span has no background image
    expect(r.has("text-over-image-no-contrast")).toBe(false);
  });
});

describe("v1 regression guards (post-extraction)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("still flags generic link text", () => {
    const r = run(`<a href="/x">click here</a>`);
    expect(r.get("generic-link-text")!.totalInstances).toBe(1);
  });

  it("still flags icon-only buttons with no label", () => {
    const r = run(`<button><svg></svg></button>`);
    expect(r.get("icon-button-no-label")!.totalInstances).toBe(1);
  });

  it("caps displayed nodes while reporting the true total", () => {
    const many = Array.from({ length: 9 }, (_, i) => `<a href="/p">read more</a>`).join("");
    const r = run(many);
    const v = r.get("generic-link-text")!;
    expect(v.totalInstances).toBe(9); // true count
    expect(v.nodes.length).toBe(6); // display cap
  });
});

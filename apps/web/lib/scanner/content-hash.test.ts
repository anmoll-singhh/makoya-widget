// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { buildA11ySkeleton, computeContentHash } from "./content-hash";

function skeletonOf(html: string): string {
  document.body.innerHTML = html;
  return buildA11ySkeleton(document.body);
}

describe("buildA11ySkeleton", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("is stable: identical markup yields an identical skeleton", () => {
    const html = `<nav><a href="/x">Home</a><button aria-label="Menu"></button></nav>`;
    expect(skeletonOf(html)).toBe(skeletonOf(html));
  });

  it("ignores volatile attributes (id, class, style, data-*, nonce, random ids)", () => {
    const a = `<div id="r-1" class="css-a1b2"><button aria-label="Close">x</button></div>`;
    const b = `<div id="r-9999" class="css-z9y8" style="color:red" data-x="t" nonce="abc"><button aria-label="Close">x</button></div>`;
    expect(skeletonOf(a)).toBe(skeletonOf(b));
  });

  it("ignores visible text changes (timestamps, counts) that don't affect a11y", () => {
    const a = `<p>Posted 5 minutes ago</p><span>Cart (3)</span>`;
    const b = `<p>Posted 2 hours ago</p><span>Cart (7)</span>`;
    expect(skeletonOf(a)).toBe(skeletonOf(b));
  });

  it("ignores href URL values (session tokens) but keeps that a link exists", () => {
    const a = `<a href="/p?sid=AAA">Go</a>`;
    const b = `<a href="/p?sid=ZZZ">Go</a>`;
    expect(skeletonOf(a)).toBe(skeletonOf(b));
  });

  it("detects a real structural change (an added control)", () => {
    const a = `<form><input type="text"></form>`;
    const b = `<form><input type="text"><button>Submit</button></form>`;
    expect(skeletonOf(a)).not.toBe(skeletonOf(b));
  });

  it("detects accessibility-relevant attribute changes (aria-label, alt, role)", () => {
    expect(skeletonOf(`<button aria-label="Open">x</button>`))
      .not.toBe(skeletonOf(`<button aria-label="Close">x</button>`));
    expect(skeletonOf(`<img alt="A cat">`)).not.toBe(skeletonOf(`<img alt="A dog">`));
    expect(skeletonOf(`<div role="button"></div>`)).not.toBe(skeletonOf(`<div role="link"></div>`));
  });

  it("does not traverse into script/style content", () => {
    const a = `<div><script>var t=${Date.now()}</script><p>Hi</p></div>`;
    const b = `<div><script>var t=0</script><p>Hi</p></div>`;
    expect(skeletonOf(a)).toBe(skeletonOf(b));
  });
});

describe("computeContentHash", () => {
  it("is a stable hex digest of the skeleton string", () => {
    const h1 = computeContentHash("a>b>c");
    const h2 = computeContentHash("a>b>c");
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(computeContentHash("a>b>c")).not.toBe(computeContentHash("a>b>d"));
  });
});

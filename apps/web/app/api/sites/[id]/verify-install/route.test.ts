/**
 * Unit tests for the detectMakoyaLoader helper in verify-install/route.ts.
 *
 * These tests exercise the pure HTML-inspection logic without any I/O.
 * The route's auth/fetch behaviour is covered by integration tests.
 */
import { describe, it, expect } from "vitest";
import { detectMakoyaLoader } from "./route";

const SITE_ID = "site-abc-123";

describe("detectMakoyaLoader", () => {
  // ── Positive cases ─────────────────────────────────────────────────────────

  it("detects installed when both loader src and matching data-site are present", () => {
    const html = `<html><body>
      <script src="https://cdn.makoya.app/widget/loader.js" data-site="${SITE_ID}" defer></script>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(true);
    expect(result.reason).toContain("installed");
    expect(result.details.loaderFound).toBe(true);
    expect(result.details.siteIdMatch).toBe(true);
  });

  it("detects installed when loader is on a relative path", () => {
    const html = `<html><body>
      <script src="/widget/loader.js" data-site="${SITE_ID}" defer></script>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(true);
    expect(result.details.loaderFound).toBe(true);
  });

  it("reports the widget-root bonus marker when the widget has rendered", () => {
    const html = `<html><body>
      <script src="/widget/loader.js" data-site="${SITE_ID}" defer></script>
      <div id="makoya-widget-root"></div>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(true);
    expect(result.details.widgetRootFound).toBe(true);
  });

  it("is case-insensitive for attribute names (SRC, DATA-SITE)", () => {
    const html = `<html><body>
      <SCRIPT SRC="/widget/loader.js" DATA-SITE="${SITE_ID}" DEFER></SCRIPT>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(true);
  });

  // ── Mismatch cases ─────────────────────────────────────────────────────────

  it("reports loader-found-but-data-site-mismatch when siteId differs", () => {
    const html = `<html><body>
      <script src="/widget/loader.js" data-site="other-site-id" defer></script>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(false);
    expect(result.details.loaderFound).toBe(true);
    expect(result.details.siteIdMatch).toBe(false);
    expect(result.reason).toMatch(/data-site mismatch/i);
  });

  // ── Negative cases ─────────────────────────────────────────────────────────

  it("returns not-installed when the loader script is absent", () => {
    const html = `<html><body><p>No widget here.</p></body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(false);
    expect(result.details.loaderFound).toBe(false);
    expect(result.reason).toMatch(/not found/i);
  });

  it("returns not-installed for completely empty HTML", () => {
    const result = detectMakoyaLoader("", SITE_ID);
    expect(result.installed).toBe(false);
    expect(result.details.loaderFound).toBe(false);
  });

  // ── Edge / security cases ──────────────────────────────────────────────────

  it("handles regex metacharacters in siteId safely (no regex injection)", () => {
    const specialId = "site.123+abc[test]";
    const html = `<html><body>
      <script src="/widget/loader.js" data-site="${specialId}" defer></script>
    </body></html>`;
    // Must match literally, not via regex expansion
    const result = detectMakoyaLoader(html, specialId);
    expect(result.installed).toBe(true);
  });

  it("does not match a partial siteId prefix", () => {
    // data-site="site-abc" should NOT match siteId "site-abc-123"
    const html = `<html><body>
      <script src="/widget/loader.js" data-site="site-abc" defer></script>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    expect(result.installed).toBe(false);
    // loaderFound is true but siteIdMatch is false
    expect(result.details.siteIdMatch).toBe(false);
  });

  it("does not flag widgetRootFound when only id prefix matches", () => {
    const html = `<html><body>
      <div id="makoya-widget-root-extra"></div>
    </body></html>`;
    const result = detectMakoyaLoader(html, SITE_ID);
    // widgetRootFound regex requires exact id="makoya-widget-root"
    expect(result.details.widgetRootFound).toBe(false);
  });
});

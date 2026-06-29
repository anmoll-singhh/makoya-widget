/**
 * app/api/config/[siteId]/route.test.ts
 *
 * Locks in the Phase 1 widget license + domain gate (spec §4, §8) while
 * preserving the endpoint's two hard contracts: NEVER 500, and availability >
 * enforcement (fail OPEN on our infra error, fail CLOSED only on a real verdict).
 *
 * Every collaborator is mocked: the service-role Supabase client (opaque
 * sentinel — the route only forwards it into the mocked data layer), the data
 * layer (`getSiteBundle` — one round-trip license+config), the KV cache layer
 * (`readSiteBundle`/`writeSiteBundle`), and the observability seam. No live
 * Supabase, no network. `WIDGET_ENFORCE` is toggled per-test and restored.
 *
 * Cache contract under test: by default readSiteBundle MISSES (returns null) so
 * the route exercises the Postgres path via getSiteBundle and then populates the
 * cache. A dedicated block proves the HIT path skips Postgres entirely.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";

const getSiteBundle = vi.fn();
const readSiteBundle = vi.fn();
const writeSiteBundle = vi.fn();
const logWidgetGate = vi.fn();

// The route only passes this sentinel straight into the (mocked) data layer.
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({ __fake: "service-role-client" }),
}));

vi.mock("@/lib/sites", () => ({
  getSiteBundle: (...args: unknown[]) => getSiteBundle(...args),
}));

vi.mock("@/lib/config-cache", () => ({
  readSiteBundle: (...args: unknown[]) => readSiteBundle(...args),
  writeSiteBundle: (...args: unknown[]) => writeSiteBundle(...args),
}));

vi.mock("@/lib/observability", () => ({
  logWidgetGate: (...args: unknown[]) => logWidgetGate(...args),
}));

import { GET } from "./route";

const SITE_ID = "site_abc";
const ALLOWED = ["shop.example", "www.shop.example"];

// A representative config row (camelCase, as the data layer returns it).
const sampleConfig = {
  siteId: SITE_ID,
  primaryColor: "#123456",
  position: "bottom-left",
  launcherIcon: "wheelchair",
  featuresEnabled: ["textSize", "contrast"],
  hideBranding: true,
  launcherSize: "lg",
  defaultProfile: "seniors",
  accessibilityStatementUrl: "https://shop.example/a11y",
  defaultLanguage: "es",
  panelTitle: "Accessibility",
};

function makeRequest(origin?: string): Request {
  const headers: Record<string, string> = {};
  if (origin) headers["origin"] = origin;
  return new Request(`https://app.test/api/config/${SITE_ID}`, { method: "GET", headers });
}

function call(origin?: string) {
  return GET(makeRequest(origin), { params: Promise.resolve({ siteId: SITE_ID }) });
}

function license(
  over: Partial<{
    licenseStatus: string;
    trialEndsAt: string | null;
    allowedDomains: string[];
  }> = {}
) {
  return {
    licenseStatus: "active",
    trialEndsAt: null,
    allowedDomains: ALLOWED,
    ...over,
  };
}

/** Convenience: set the Postgres-path bundle for a given license + config. */
function dbBundle(site: ReturnType<typeof license> | null, config: unknown = sampleConfig) {
  getSiteBundle.mockResolvedValue({ site, config: site ? config : null });
}

let originalEnforce: string | undefined;
let originalSecret: string | undefined;

beforeEach(() => {
  getSiteBundle.mockReset();
  readSiteBundle.mockReset();
  writeSiteBundle.mockReset();
  logWidgetGate.mockReset();
  // Default: cache MISS → route uses the Postgres path. Write is a no-op spy.
  readSiteBundle.mockResolvedValue(null);
  writeSiteBundle.mockResolvedValue(undefined);
  // Default Postgres bundle: an active, fully-configured site.
  dbBundle(license());
  originalEnforce = process.env.WIDGET_ENFORCE;
  originalSecret = process.env.WIDGET_SIGNING_SECRET;
  delete process.env.WIDGET_SIGNING_SECRET;
});

afterEach(() => {
  if (originalEnforce === undefined) delete process.env.WIDGET_ENFORCE;
  else process.env.WIDGET_ENFORCE = originalEnforce;
  if (originalSecret === undefined) delete process.env.WIDGET_SIGNING_SECRET;
  else process.env.WIDGET_SIGNING_SECRET = originalSecret;
});

function enforce(on: boolean) {
  if (on) process.env.WIDGET_ENFORCE = "true";
  else delete process.env.WIDGET_ENFORCE;
}

function secret(value: string | null) {
  if (value === null) delete process.env.WIDGET_SIGNING_SECRET;
  else process.env.WIDGET_SIGNING_SECRET = value;
}

/**
 * Re-mint a valid token the same way token.ts does, so the route's recomputation
 * matches. Mirrors mintSiteToken: "v1." + base64url(HMAC_SHA256(secret, siteId)).
 */
function validToken(siteId: string, sec: string): string {
  const sig = createHmac("sha256", sec)
    .update(siteId)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `v1.${sig}`;
}

/** Calls the route with a token forwarded as the `?t=` query param. */
function callWithToken(origin: string | undefined, token: string) {
  const headers: Record<string, string> = {};
  if (origin) headers["origin"] = origin;
  const req = new Request(`https://app.test/api/config/${SITE_ID}?t=${encodeURIComponent(token)}`, {
    method: "GET",
    headers,
  });
  return GET(req, { params: Promise.resolve({ siteId: SITE_ID }) });
}

describe("GET /api/config/[siteId] — enforce mode verdicts", () => {
  it("unknown siteId (no license row) → active:false", async () => {
    enforce(true);
    dbBundle(null);

    const res = await call("https://shop.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.active).toBe(false);
    expect(json.primaryColor).toBeUndefined();
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: SITE_ID,
        status: "no-site",
        enforced: true,
        reason: "no-site",
      })
    );
  });

  it("active site + matching Origin → active:true with display fields", async () => {
    enforce(true);
    dbBundle(license());

    const res = await call("https://shop.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(json.panelTitle).toBe("Accessibility");
    expect(logWidgetGate).not.toHaveBeenCalled();
  });

  it("suspended → active:false", async () => {
    enforce(true);
    dbBundle(license({ licenseStatus: "suspended" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("canceled → active:false", async () => {
    enforce(true);
    dbBundle(license({ licenseStatus: "canceled" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("trial expired (trialEndsAt in the past) → active:false", async () => {
    enforce(true);
    dbBundle(license({ licenseStatus: "trial", trialEndsAt: "2000-01-01T00:00:00Z" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("trial not expired (trialEndsAt in the future) → active:true", async () => {
    enforce(true);
    dbBundle(license({ licenseStatus: "trial", trialEndsAt: "2999-01-01T00:00:00Z" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
  });

  it("active site + foreign Origin not in allowedDomains → active:false", async () => {
    enforce(true);
    dbBundle(license());

    const json = (await (await call("https://evil.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "evil.example",
        status: "active",
        enforced: true,
        reason: "domain",
      })
    );
  });

  it("empty allowedDomains → not blocked (lenient, active:true)", async () => {
    enforce(true);
    dbBundle(license({ allowedDomains: [] }));

    const json = (await (await call("https://anything.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
  });

  it("no Origin header → not blocked (host=null is lenient)", async () => {
    enforce(true);
    dbBundle(license());

    const json = (await (await call(undefined)).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
  });
});

describe("GET /api/config/[siteId] — monitor mode (WIDGET_ENFORCE unset)", () => {
  it("always active:true even for a suspended + foreign-origin case, but the denial is still logged", async () => {
    enforce(false);
    dbBundle(license({ licenseStatus: "suspended" }));

    const res = await call("https://evil.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "suspended", enforced: false, reason: "license" })
    );
  });
});

describe("GET /api/config/[siteId] — infra error fails OPEN", () => {
  it("getSiteBundle throws → active:true (availability > enforcement), no gate log", async () => {
    enforce(true);
    getSiteBundle.mockRejectedValue(new Error("db unavailable"));

    const res = await call("https://evil.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.active).toBe(true);
    // On infra error we don't have a real verdict → no denial logged.
    expect(logWidgetGate).not.toHaveBeenCalled();
  });

  it("active+no-config falls back to DEFAULT_CONFIG safe fields with active:true", async () => {
    enforce(true);
    getSiteBundle.mockResolvedValue({ site: license(), config: null });

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#2563eb"); // DEFAULT_CONFIG primaryColor
  });
});

describe("GET /api/config/[siteId] — caching contract", () => {
  it("response carries cache-control: no-store", async () => {
    enforce(true);
    dbBundle(license());

    const res = await call("https://shop.example");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("cache MISS → reads Postgres via getSiteBundle AND populates the cache for an existing site", async () => {
    enforce(true);
    readSiteBundle.mockResolvedValue(null); // miss
    dbBundle(license());

    await call("https://shop.example");

    expect(getSiteBundle).toHaveBeenCalledTimes(1);
    expect(writeSiteBundle).toHaveBeenCalledTimes(1);
    expect(writeSiteBundle).toHaveBeenCalledWith(
      SITE_ID,
      expect.objectContaining({ site: expect.objectContaining({ licenseStatus: "active" }) })
    );
  });

  it("cache HIT → serves from cache WITHOUT touching Postgres or repopulating", async () => {
    enforce(true);
    readSiteBundle.mockResolvedValue({ site: license(), config: sampleConfig });

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(getSiteBundle).not.toHaveBeenCalled(); // Postgres never touched
    expect(writeSiteBundle).not.toHaveBeenCalled(); // already cached
  });

  it("unknown site on a MISS is NOT cached (positive-cache-only)", async () => {
    enforce(true);
    readSiteBundle.mockResolvedValue(null);
    dbBundle(null); // no such site

    await call("https://shop.example");

    expect(writeSiteBundle).not.toHaveBeenCalled();
  });
});

describe("GET /api/config/[siteId] — signed-token wall (Phase 1.5)", () => {
  const SECRET = "test-signing-secret";

  it("secret set + enforce + VALID token → active:true, no denial logged", async () => {
    enforce(true);
    secret(SECRET);
    dbBundle(license());

    const res = await callWithToken("https://shop.example", validToken(SITE_ID, SECRET));
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(logWidgetGate).not.toHaveBeenCalled();
  });

  it("secret set + enforce + MISSING token → active:true (grace) + logged reason:'token'", async () => {
    enforce(true);
    secret(SECRET);
    dbBundle(license());

    const res = await call("https://shop.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE_ID, enforced: true, reason: "token" })
    );
  });

  it("secret set + enforce + WRONG token → active:false + logged reason:'token'", async () => {
    enforce(true);
    secret(SECRET);
    dbBundle(license());

    const res = await callWithToken("https://shop.example", "v1.totally-wrong-signature");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(false);
    expect(json.primaryColor).toBeUndefined();
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE_ID, enforced: true, reason: "token" })
    );
  });

  it("MONITOR mode + secret set + WRONG token → active:true but logged reason:'token'", async () => {
    enforce(false);
    secret(SECRET);
    dbBundle(license());

    const res = await callWithToken("https://shop.example", "v1.totally-wrong-signature");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ enforced: false, reason: "token" })
    );
  });

  it("secret UNSET + enforce + any token → token check is a no-op (license+domain only)", async () => {
    enforce(true);
    secret(null);
    dbBundle(license());

    const res = await callWithToken("https://shop.example", "v1.totally-wrong-signature");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(logWidgetGate).not.toHaveBeenCalled();
  });
});

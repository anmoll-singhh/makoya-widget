/**
 * app/api/config/[siteId]/route.test.ts
 *
 * Locks in the Phase 1 widget license + domain gate (spec §4, §8) while
 * preserving the endpoint's two hard contracts: NEVER 500, and availability >
 * enforcement (fail OPEN on our infra error, fail CLOSED only on a real verdict).
 *
 * Every collaborator is mocked: the service-role Supabase client (opaque
 * sentinel — the route only forwards it into the mocked data layer), the data
 * layer (`getSiteLicense` / `getConfig`), and the observability seam. No live
 * Supabase, no network. `WIDGET_ENFORCE` is toggled per-test and restored.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getSiteLicense = vi.fn();
const getConfig = vi.fn();
const logWidgetGate = vi.fn();

// The route only passes this sentinel straight into the (mocked) data layer.
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({ __fake: "service-role-client" }),
}));

vi.mock("@/lib/sites", () => ({
  getSiteLicense: (...args: unknown[]) => getSiteLicense(...args),
  getConfig: (...args: unknown[]) => getConfig(...args),
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

function license(over: Partial<{ licenseStatus: string; trialEndsAt: string | null; allowedDomains: string[] }> = {}) {
  return {
    licenseStatus: "active",
    trialEndsAt: null,
    allowedDomains: ALLOWED,
    ...over,
  };
}

let originalEnforce: string | undefined;

beforeEach(() => {
  getSiteLicense.mockReset();
  getConfig.mockReset();
  logWidgetGate.mockReset();
  getConfig.mockResolvedValue(sampleConfig);
  originalEnforce = process.env.WIDGET_ENFORCE;
});

afterEach(() => {
  if (originalEnforce === undefined) delete process.env.WIDGET_ENFORCE;
  else process.env.WIDGET_ENFORCE = originalEnforce;
});

function enforce(on: boolean) {
  if (on) process.env.WIDGET_ENFORCE = "true";
  else delete process.env.WIDGET_ENFORCE;
}

describe("GET /api/config/[siteId] — enforce mode verdicts", () => {
  it("unknown siteId (no license row) → active:false", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(null);

    const res = await call("https://shop.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.active).toBe(false);
    expect(json.primaryColor).toBeUndefined();
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: SITE_ID, status: "no-site", enforced: true })
    );
  });

  it("active site + matching Origin → active:true with display fields", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license());

    const res = await call("https://shop.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(json.panelTitle).toBe("Accessibility");
    expect(logWidgetGate).not.toHaveBeenCalled();
  });

  it("suspended → active:false", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license({ licenseStatus: "suspended" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("canceled → active:false", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license({ licenseStatus: "canceled" }));

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("trial expired (trialEndsAt in the past) → active:false", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(
      license({ licenseStatus: "trial", trialEndsAt: "2000-01-01T00:00:00Z" })
    );

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
  });

  it("trial not expired (trialEndsAt in the future) → active:true", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(
      license({ licenseStatus: "trial", trialEndsAt: "2999-01-01T00:00:00Z" })
    );

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
  });

  it("active site + foreign Origin not in allowedDomains → active:false", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license());

    const json = (await (await call("https://evil.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(false);
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ host: "evil.example", status: "active", enforced: true })
    );
  });

  it("empty allowedDomains → not blocked (lenient, active:true)", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license({ allowedDomains: [] }));

    const json = (await (await call("https://anything.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
  });

  it("no Origin header → not blocked (host=null is lenient)", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license());

    const json = (await (await call(undefined)).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
  });
});

describe("GET /api/config/[siteId] — monitor mode (WIDGET_ENFORCE unset)", () => {
  it("always active:true even for a suspended + foreign-origin case, but the denial is still logged", async () => {
    enforce(false);
    getSiteLicense.mockResolvedValue(license({ licenseStatus: "suspended" }));

    const res = await call("https://evil.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#123456");
    expect(logWidgetGate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "suspended", enforced: false })
    );
  });
});

describe("GET /api/config/[siteId] — infra error fails OPEN", () => {
  it("getSiteLicense throws → active:true (availability > enforcement), no gate log", async () => {
    enforce(true);
    getSiteLicense.mockRejectedValue(new Error("db unavailable"));

    const res = await call("https://evil.example");
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(json.active).toBe(true);
    // On infra error we don't have a real verdict → no denial logged.
    expect(logWidgetGate).not.toHaveBeenCalled();
  });

  it("active+no-config falls back to DEFAULT_CONFIG safe fields with active:true", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license());
    getConfig.mockResolvedValue(null);

    const json = (await (await call("https://shop.example")).json()) as Record<string, unknown>;
    expect(json.active).toBe(true);
    expect(json.primaryColor).toBe("#2563eb"); // DEFAULT_CONFIG primaryColor
  });
});

describe("GET /api/config/[siteId] — caching contract", () => {
  it("response carries cache-control: no-store", async () => {
    enforce(true);
    getSiteLicense.mockResolvedValue(license());

    const res = await call("https://shop.example");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});

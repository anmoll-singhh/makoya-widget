/**
 * observability.test.ts — guards the error-reporting seam.
 *
 * The single contract that matters for `captureError()` is RESILIENCE: it is the
 * function we call from route catch blocks, so it must NEVER throw and must
 * ALWAYS log to console — whether or not Sentry is configured. On top of that we
 * verify the wiring: Sentry is invoked only when a DSN is set, and skipped
 * (true no-op) when it isn't.
 *
 * Determinism: we mock `@sentry/nextjs` (so no real SDK/network) and `@/lib/env`
 * (so the DSN is controlled in-test, never read from the ambient environment).
 * `vi.resetModules()` per case lets each test re-import `observability` against a
 * freshly-mocked env, since the DSN is read at module scope of the dependency.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocked Sentry — captureException is a spy so we can assert call behaviour, and
// the module is replaced entirely so the test pulls in no real SDK code/network.
const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException,
  // Referenced by instrumentation files but harmless to stub here.
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  init: vi.fn(),
}));

// `env` is mutable per-test so we can flip the DSN on and off. Both the server
// (SENTRY_DSN) and the client-surfaced (SENTRY_DSN_PUBLIC) keys are modelled so we
// can verify capture works when only the PUBLIC one is present (the client case).
const mockEnv: { SENTRY_DSN: string; SENTRY_DSN_PUBLIC: string } = {
  SENTRY_DSN: "",
  SENTRY_DSN_PUBLIC: "",
};
vi.mock("@/lib/env.server", () => ({ env: mockEnv }));

/** Re-import observability with the current mockEnv applied. */
async function loadCaptureError() {
  vi.resetModules();
  const mod = await import("./observability");
  return mod.captureError;
}

describe("captureError", () => {
  beforeEach(() => {
    captureException.mockClear();
    // Reset BOTH DSN keys so one case's value can't bleed into the next.
    mockEnv.SENTRY_DSN = "";
    mockEnv.SENTRY_DSN_PUBLIC = "";
    // Silence the intentional console.error so test output stays clean, while
    // still letting us assert it was called.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never throws and still console.errors when no DSN is configured", async () => {
    mockEnv.SENTRY_DSN = "";
    const captureError = await loadCaptureError();

    expect(() => captureError(new Error("boom"), { route: "/x" })).not.toThrow();
    expect(console.error).toHaveBeenCalledTimes(1);
    // No DSN ⇒ Sentry is never touched (bootstrap-safe no-op).
    expect(captureException).not.toHaveBeenCalled();
  });

  it("forwards to Sentry AND console.errors when a DSN is configured", async () => {
    mockEnv.SENTRY_DSN = "https://public@example.ingest.sentry.io/123";
    const captureError = await loadCaptureError();

    const err = new Error("kaboom");
    expect(() => captureError(err, { siteId: "abc" })).not.toThrow();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(err, { extra: { siteId: "abc" } });
  });

  it("forwards to Sentry when ONLY the client (public) DSN is set", async () => {
    // Client surface: SENTRY_DSN is stripped from the browser bundle, so only
    // SENTRY_DSN_PUBLIC is present. captureError must still forward.
    mockEnv.SENTRY_DSN = "";
    mockEnv.SENTRY_DSN_PUBLIC = "https://public@example.ingest.sentry.io/123";
    const captureError = await loadCaptureError();

    captureError(new Error("client-side boom"), { where: "browser" });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("passes undefined extra when no context is given (with DSN)", async () => {
    mockEnv.SENTRY_DSN = "https://public@example.ingest.sentry.io/123";
    const captureError = await loadCaptureError();

    captureError(new Error("nope"));
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), undefined);
  });

  it("does not throw even if Sentry.captureException itself throws", async () => {
    mockEnv.SENTRY_DSN = "https://public@example.ingest.sentry.io/123";
    captureException.mockImplementationOnce(() => {
      throw new Error("sentry exploded");
    });
    const captureError = await loadCaptureError();

    // The try/catch around the Sentry call must swallow this.
    expect(() => captureError(new Error("orig"))).not.toThrow();
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("handles non-Error values without throwing", async () => {
    mockEnv.SENTRY_DSN = "";
    const captureError = await loadCaptureError();

    expect(() => captureError("just a string")).not.toThrow();
    expect(() => captureError(null)).not.toThrow();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

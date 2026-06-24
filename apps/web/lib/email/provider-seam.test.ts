/**
 * lib/email/provider-seam.test.ts
 *
 * lib/email/index.ts is the ONE place provider selection happens: Resend when
 * RESEND_API_KEY is set, otherwise the no-send stub so local/demo still work.
 * Getting this wrong means either no emails in prod or accidental live sends in
 * dev — so the selection logic is worth a test. We mock @/lib/env so the choice
 * is driven purely by the (mocked) key, with no live ESP.
 *
 * Env-free: no network, no real Resend key.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted above imports, so the factory's captured value must be
// created with vi.hoisted (also hoisted) to avoid the TDZ error.
const envMock = vi.hoisted(() => ({
  RESEND_API_KEY: "",
  EMAIL_FROM: "Makoya <reports@mailer.test>",
}));

vi.mock("@/lib/env", () => ({ env: envMock }));

import { getEmailProvider } from "./index";
import { stubEmailProvider, getOutbox, clearOutbox } from "./stub-provider";

beforeEach(() => {
  clearOutbox();
  envMock.RESEND_API_KEY = "";
});

describe("getEmailProvider — provider selection seam", () => {
  it("returns the stub provider when no RESEND_API_KEY is set", () => {
    envMock.RESEND_API_KEY = "";
    const provider = getEmailProvider();
    expect(provider).toBe(stubEmailProvider);
    expect(provider.name).toBe("stub");
  });

  it("returns the Resend provider when RESEND_API_KEY is set", () => {
    envMock.RESEND_API_KEY = "re_live_key";
    const provider = getEmailProvider();
    expect(provider.name).toBe("resend");
  });
});

describe("stubEmailProvider", () => {
  it("records to the outbox and always returns ok:true (never sends)", async () => {
    const result = await stubEmailProvider.send({
      to: "a@b.com",
      subject: "hi",
      html: "<p>hi</p>",
      text: "hi",
    });
    expect(result.ok).toBe(true);
    expect(result.provider).toBe("stub");
    expect(getOutbox()).toHaveLength(1);
    expect(getOutbox()[0].to).toBe("a@b.com");
    expect(getOutbox()[0].at).toBeTruthy();
  });

  it("clearOutbox empties the recorded mail", async () => {
    await stubEmailProvider.send({ to: "x@y.com", subject: "s", html: "h", text: "t" });
    expect(getOutbox().length).toBeGreaterThan(0);
    clearOutbox();
    expect(getOutbox()).toHaveLength(0);
  });
});

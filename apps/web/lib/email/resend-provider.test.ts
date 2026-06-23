import { describe, it, expect, vi, afterEach } from "vitest";
import { createResendProvider } from "./resend-provider";
import type { OutboundEmail } from "./types";

const mail: OutboundEmail = {
  to: "owner@shop.com",
  subject: "Your accessibility scan",
  html: "<p>hi</p>",
  text: "hi",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createResendProvider", () => {
  it("is named 'resend'", () => {
    expect(createResendProvider("re_test", "Makoya <a@b.co>").name).toBe("resend");
  });

  it("POSTs to the Resend API with auth, from-address, and the email payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "abc123" }), { status: 200 })
      );

    const provider = createResendProvider("re_test", "Makoya <reports@mailer.jewlx.ai>");
    const result = await provider.send(mail);

    expect(result).toEqual({ ok: true, provider: "resend", id: "abc123" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.from).toBe("Makoya <reports@mailer.jewlx.ai>");
    expect(body.to).toBe("owner@shop.com");
    expect(body.subject).toBe("Your accessibility scan");
    expect(body.html).toBe("<p>hi</p>");
    expect(body.text).toBe("hi");
  });

  it("returns ok:false with a truncated error on a non-2xx response (never throws)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("domain not verified", { status: 403 })
    );

    const provider = createResendProvider("re_test", "Makoya <x@unverified.co>");
    const result = await provider.send(mail);

    expect(result.ok).toBe(false);
    expect(result.provider).toBe("resend");
    expect(result.error).toContain("403");
  });

  it("returns ok:false (never throws) when fetch itself rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const provider = createResendProvider("re_test", "Makoya <a@b.co>");
    const result = await provider.send(mail);

    expect(result.ok).toBe(false);
    expect(result.error).toContain("network down");
  });
});

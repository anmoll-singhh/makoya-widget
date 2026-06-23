/**
 * lib/email/resend-provider.ts — Resend-backed EmailProvider.
 *
 * Sends via the Resend REST API (https://api.resend.com/emails) with a single
 * fetch — no SDK dependency, so the serverless bundle stays small and we avoid a
 * vendor lock-in surface. Selected in lib/email/index.ts ONLY when RESEND_API_KEY
 * is set; otherwise the stub provider is used.
 *
 * The `from` address MUST be on a Resend-verified domain (today: mailer.jewlx.ai),
 * configurable via EMAIL_FROM. Send failures NEVER throw — they return
 * SendResult{ ok:false, error } so the funnel is never blocked by an email hiccup
 * (the lead is already persisted by the time we try to send). The error string is
 * truncated and used for server-side logging only; it is not echoed to the public.
 */

import type { EmailProvider, OutboundEmail, SendResult } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function createResendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(email: OutboundEmail): Promise<SendResult> {
      try {
        const res = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: email.to,
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return {
            ok: false,
            provider: "resend",
            error: `resend ${res.status}: ${detail.slice(0, 200)}`,
          };
        }

        const data = (await res.json().catch(() => ({}))) as { id?: string };
        return { ok: true, provider: "resend", id: data.id };
      } catch (e) {
        return {
          ok: false,
          provider: "resend",
          error: e instanceof Error ? e.message : "resend send failed",
        };
      }
    },
  };
}

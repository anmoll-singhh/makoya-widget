/**
 * lib/email/stub-provider.ts — the no-send email provider used until Resend is wired.
 *
 * It records every email to an in-memory outbox and logs a line, so the funnel
 * is fully demonstrable (you can prove "the report was sent") without a real ESP
 * or a verified sending domain. Swap happens in lib/email/index.ts.
 *
 * NOTE: the outbox is per-process and resets on restart — it's a dev/demo aid,
 * not durable storage. The lead itself IS persisted (in the leads table).
 */

import type { EmailProvider, OutboundEmail, SendResult } from "./types";

export interface RecordedEmail extends OutboundEmail {
  at: string;
}

const outbox: RecordedEmail[] = [];

/** Inspect what the stub "sent" (used by demos/tests). */
export function getOutbox(): readonly RecordedEmail[] {
  return outbox;
}

/** Clear the outbox (tests). */
export function clearOutbox(): void {
  outbox.length = 0;
}

export const stubEmailProvider: EmailProvider = {
  name: "stub",
  async send(email: OutboundEmail): Promise<SendResult> {
    outbox.push({ ...email, at: new Date().toISOString() });
    // eslint-disable-next-line no-console
    console.info(`[email:stub] → ${email.to} :: ${email.subject}`);
    return { ok: true, provider: "stub", id: `stub_${outbox.length}` };
  },
};

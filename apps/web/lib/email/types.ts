/**
 * lib/email/types.ts — the provider-agnostic email contract.
 *
 * Every email in the app is an `OutboundEmail` sent through an `EmailProvider`.
 * Today the only provider is the stub (records, doesn't send). When RESEND_API_KEY
 * is set we add a Resend provider — and NOTHING else in the app changes, because
 * all call sites depend on this interface, not on a vendor SDK.
 */

export interface OutboundEmail {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback — always provided for deliverability + a11y. */
  text: string;
}

export interface SendResult {
  ok: boolean;
  /** Which provider handled it ("stub" | "resend" | ...). */
  provider: string;
  /** Provider message id, when available. */
  id?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(email: OutboundEmail): Promise<SendResult>;
}

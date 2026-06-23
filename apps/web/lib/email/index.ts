/**
 * lib/email/index.ts — the ONE place provider selection happens.
 *
 * If RESEND_API_KEY is set we use the Resend provider; otherwise the stub
 * (records to an in-memory outbox, never sends) so local dev / demos still work
 * with no ESP configured. Every call site keeps using getEmailProvider() +
 * buildReportEmail() and never touches a vendor SDK.
 */

import type { EmailProvider } from "./types";
import { env } from "@/lib/env";
import { stubEmailProvider } from "./stub-provider";
import { createResendProvider } from "./resend-provider";

export type { EmailProvider, OutboundEmail, SendResult } from "./types";
export { buildReportEmail } from "./report-email";
export type { ReportEmailInput, ReportTotals } from "./report-email";
export { getOutbox, clearOutbox } from "./stub-provider";

export function getEmailProvider(): EmailProvider {
  if (env.RESEND_API_KEY) {
    return createResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return stubEmailProvider;
}

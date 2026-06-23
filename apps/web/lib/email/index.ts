/**
 * lib/email/index.ts — the ONE place provider selection happens.
 *
 * Today: always the stub. When we wire Resend, this is the only file that
 * changes: import a resendProvider and return it when RESEND_API_KEY is set.
 * Every call site keeps using getEmailProvider() + buildReportEmail().
 */

import type { EmailProvider } from "./types";
import { stubEmailProvider } from "./stub-provider";

export type { EmailProvider, OutboundEmail, SendResult } from "./types";
export { buildReportEmail } from "./report-email";
export type { ReportEmailInput, ReportTotals } from "./report-email";
export { getOutbox, clearOutbox } from "./stub-provider";

export function getEmailProvider(): EmailProvider {
  // TODO(phase-1 follow-up): when process.env.RESEND_API_KEY is set, return a
  // Resend-backed provider here. Nothing else in the app needs to change.
  return stubEmailProvider;
}

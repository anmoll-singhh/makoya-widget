/**
 * lib/email/report-email.ts — builds the scan-report email.
 *
 * HONEST-HYBRID COPY RULES (non-negotiable, see CLAUDE.md compliance guardrails):
 *  - Never say "compliant", "WCAG compliant", "ADA compliant", "lawsuit-proof",
 *    or "guaranteed". The FTC fined accessiBe $1M for exactly these claims.
 *  - State real findings plainly and offer to help fix them at the source.
 *
 * Pure function (no I/O) so it is trivially unit-testable.
 */

import { hostOf } from "@/lib/utils/url";
import type { OutboundEmail } from "./types";

export interface ReportTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total?: number;
}

export interface ReportEmailInput {
  to: string;
  /** The URL that was scanned. */
  url: string;
  /** 0–100 accessibility score. */
  score: number;
  totals: ReportTotals;
  /** Base app URL for the CTA link. */
  appUrl: string;
}

function sumTotals(t: ReportTotals): number {
  return typeof t.total === "number"
    ? t.total
    : t.critical + t.serious + t.moderate + t.minor;
}

export function buildReportEmail(input: ReportEmailInput): OutboundEmail {
  const host = hostOf(input.url);
  const total = sumTotals(input.totals);
  const { critical, serious, moderate, minor } = input.totals;
  const cta = `${input.appUrl.replace(/\/$/, "")}/login`;

  const subject = `Your accessibility scan for ${host} — ${input.score}/100`;

  const text = [
    `Accessibility scan results for ${host}`,
    ``,
    `Score: ${input.score}/100`,
    `Issues found: ${total} (critical ${critical}, serious ${serious}, moderate ${moderate}, minor ${minor})`,
    ``,
    `These are real issues our scanner found on your page. We don't claim this`,
    `makes your site "compliant" — no tool honestly can. What we can do is show`,
    `you exactly what's wrong and help you fix it at the source, then keep`,
    `watching so it stays fixed.`,
    ``,
    `See your full report and next steps: ${cta}`,
    ``,
    `— Makoya`,
  ].join("\n");

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <h2 style="margin:0 0 4px">Accessibility scan for ${host}</h2>
    <p style="margin:0 0 16px;color:#475569">Here's what our scanner actually found.</p>
    <div style="display:inline-block;padding:12px 18px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px">
      <div style="font-size:34px;font-weight:700;line-height:1">${input.score}<span style="font-size:16px;color:#64748b">/100</span></div>
    </div>
    <table style="border-collapse:collapse;margin-bottom:16px">
      <tr>
        <td style="padding:4px 14px 4px 0;color:#b91c1c">Critical: <strong>${critical}</strong></td>
        <td style="padding:4px 14px 4px 0;color:#c2410c">Serious: <strong>${serious}</strong></td>
        <td style="padding:4px 14px 4px 0;color:#a16207">Moderate: <strong>${moderate}</strong></td>
        <td style="padding:4px 0;color:#475569">Minor: <strong>${minor}</strong></td>
      </tr>
    </table>
    <p style="color:#334155;line-height:1.5">
      These are real issues found on your page. We don't claim this makes your site
      &ldquo;compliant&rdquo; &mdash; no tool honestly can. We show you exactly what's
      wrong, help you fix it at the source, and keep watching so it stays fixed.
    </p>
    <p>
      <a href="${cta}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">
        See your full report
      </a>
    </p>
    <p style="font-size:12px;color:#94a3b8">— Makoya · honest accessibility, no compliance theater.</p>
  </div>`.trim();

  return { to: input.to, subject, html, text };
}

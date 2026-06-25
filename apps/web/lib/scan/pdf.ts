/**
 * lib/scan/pdf.ts — client helper that turns a scan result into a downloaded PDF.
 *
 * Shared by both PDF triggers on the /scan surface (the results-header button and
 * the email-gate auto-download), so the request shape lives in exactly one place.
 * The server (POST /api/report-pdf) re-checks the email, so this is a convenience
 * path, not the security boundary — the gate cannot be bypassed by calling it.
 *
 * Returns `true` on success, `false` on any non-OK response, and never throws on a
 * network error the caller should surface (callers wrap it in try/catch).
 */
import { hostSlug } from "@/lib/utils/url";
import type { ScanResult } from "@/lib/scan/types";

export async function triggerPdfDownload(opts: {
  url: string;
  email: string;
  result: ScanResult;
}): Promise<boolean> {
  const res = await fetch("/api/report-pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: opts.url,
      email: opts.email,
      score: opts.result.score,
      totals: opts.result.totals,
      topIssues: opts.result.topIssues,
      isPartialScan: opts.result.isPartialScan,
    }),
  });
  if (!res.ok) return false;

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `makoya-report-${hostSlug(opts.url)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
  return true;
}

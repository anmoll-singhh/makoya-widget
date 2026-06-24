/**
 * /scan — the PUBLIC accessibility scanner (top of the sales funnel).
 *
 * Flow this screen owns end-to-end:
 *   1. Visitor pastes a URL → POST /api/public-scan → real axe-core scan.
 *   2. We show a big score /100, a critical→minor severity breakdown, and the
 *      worst issues translated into plain English.
 *   3. An email-capture card ("Get the full report") → POST /api/scan-ingest
 *      with { url, email, score, totals } → creates a lead (and stub-emails a
 *      report today). Success state confirms it's on the way.
 *
 * This is a client component because the whole experience is interactive
 * (fetch + local state for loading/error/result). It is intentionally a single
 * screen — no routing, no auth — so it loads fast for cold traffic.
 *
 * Honesty rules (enforced in copy below): we show REAL issues and a score. We
 * never say "compliant", "ADA", "WCAG compliant", "guaranteed", or imply a scan
 * makes a site legally safe. We sell clarity + help, not a compliance badge.
 */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { hostSlug } from "@/lib/utils/url";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Shapes returned by /api/public-scan ────────────────────────────────────
type Severity = "critical" | "serious" | "moderate" | "minor";

interface ScanTotals {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
}

interface TopIssue {
  id: string;
  impact: Severity | null;
  help: string; // plain-English title
  whatItMeans: string;
  whoItAffects: string;
  disabilityGroups?: string[];
  howToFix?: string;
  measuredEvidence?: string;
}

/** Short, human labels for the structured disability groups (badge text). */
const DISABILITY_LABELS: Record<string, string> = {
  "blind": "Blind",
  "low-vision": "Low vision",
  "color-blind": "Colour blindness",
  "deaf-hard-of-hearing": "Deaf / HoH",
  "motor": "Motor",
  "cognitive": "Cognitive",
  "vestibular": "Motion sensitivity",
  "speech": "Speech",
};

interface ScanResult {
  score: number;
  totals: ScanTotals;
  finalUrl: string;
  isPartialScan: boolean;
  topIssues: TopIssue[];
}

// ── Severity → colour mapping (matches the admin score palette) ─────────────
const SEVERITY_META: Record<Severity, { label: string; dot: string; chip: string }> = {
  critical: { label: "Critical", dot: "bg-red-500", chip: "bg-red-500/10 text-red-700 ring-1 ring-red-500/20" },
  serious: { label: "Serious", dot: "bg-orange-500", chip: "bg-orange-500/10 text-orange-700 ring-1 ring-orange-500/20" },
  moderate: { label: "Moderate", dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20" },
  minor: { label: "Minor", dot: "bg-sky-500", chip: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/20" },
};

function scoreTone(score: number): { ring: string; text: string; verdict: string } {
  if (score >= 80) return { ring: "ring-emerald-500/30", text: "text-emerald-600", verdict: "A solid start — a few things to tidy up." };
  if (score >= 60) return { ring: "ring-amber-500/30", text: "text-amber-600", verdict: "Real gaps are turning some visitors away." };
  return { ring: "ring-red-500/30", text: "text-red-600", verdict: "Several visitors likely can't use parts of this site." };
}

// Default export wraps the page in Suspense because useSearchParams() (used to
// read the ?url= deep-link from the landing page) requires a Suspense boundary
// under the App Router.
export default function PublicScanPage() {
  return (
    <Suspense fallback={null}>
      <PublicScanPageInner />
    </Suspense>
  );
}

function PublicScanPageInner() {
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  // Deep link from the landing hero: /scan?url=example.com → prefill + auto-run
  // exactly once. The ref guards against re-running on re-render / param change.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    const incoming = searchParams.get("url")?.trim();
    if (incoming) {
      autoRan.current = true;
      setUrl(incoming);
      void runScan(undefined, incoming);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runScan(e?: React.FormEvent, override?: string) {
    e?.preventDefault();
    const trimmed = (override ?? url).trim();
    if (!trimmed || scanning) return;

    setScanning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/public-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "We couldn't scan that site. Check the address and try again."
        );
        return;
      }
      setResult(data as ScanResult);
    } catch {
      setError("Something went wrong reaching the scanner. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <main className="min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <a
            href="/login"
            className="transition-base text-sm font-medium text-neutral-500 hover:text-neutral-900"
          >
            Sign in
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Hero + input */}
        <section className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Can everyone actually use <span className="text-gradient">your website?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">
            Run a real accessibility scan in seconds. We&apos;ll show you a score and the
            specific issues turning visitors away — in plain English, no jargon.
          </p>

          <form
            onSubmit={runScan}
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <Input
              type="text"
              inputMode="url"
              autoComplete="url"
              aria-label="Website address to scan"
              placeholder="yourwebsite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={scanning}
              className="h-11 flex-1 text-base"
            />
            <Button type="submit" size="lg" disabled={scanning || !url.trim()} className="h-11 px-6">
              {scanning ? "Scanning…" : "Scan my site"}
            </Button>
          </form>

          <p className="mt-3 text-xs text-neutral-400">
            We scan the page you give us and report real issues. We don&apos;t claim any site
            is &quot;compliant&quot; — we show you what to fix.
          </p>
        </section>

        {/* Loading */}
        {scanning && (
          <div className="mt-12 flex flex-col items-center gap-4 text-center" aria-live="polite">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-brand-600" />
            <p className="text-sm text-neutral-500">
              Loading the page in a real browser and checking it against WCAG rules — this
              usually takes 10–30 seconds.
            </p>
          </div>
        )}

        {/* Error */}
        {error && !scanning && (
          <div
            role="alert"
            className="mt-10 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Result */}
        {result && !scanning && <Results result={result} />}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Result block: score, severity breakdown, top issues, email gate.
// ---------------------------------------------------------------------------

function Results({ result }: { result: ScanResult }) {
  const tone = scoreTone(result.score);
  const severities: Severity[] = ["critical", "serious", "moderate", "minor"];

  // The PDF is gated behind email: it unlocks only once the visitor submits the
  // email-capture form below. `capturedEmail` is the unlock token; until then
  // the download button nudges the visitor to the gate.
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const scrollToGate = () =>
    gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="mt-12 space-y-8">
      {/* Score + breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardDescription className="min-w-0 flex-1 truncate">
              Results for{" "}
              <span className="font-medium text-neutral-700">{result.finalUrl}</span>
            </CardDescription>
            <DownloadReportButton
              result={result}
              url={result.finalUrl}
              capturedEmail={capturedEmail}
              onNeedEmail={scrollToGate}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            {/* Big number */}
            <div
              className={`grid h-28 w-28 shrink-0 place-items-center rounded-full bg-white ring-8 ${tone.ring}`}
            >
              <div className="text-center">
                <div className={`font-display text-4xl font-extrabold ${tone.text}`}>
                  {result.score}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  / 100
                </div>
              </div>
            </div>

            {/* Verdict + severity counts */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-neutral-700">{tone.verdict}</p>
              <p className="mt-1 text-sm text-neutral-500">
                We found <span className="font-semibold text-neutral-800">{result.totals.total}</span>{" "}
                {result.totals.total === 1 ? "issue" : "issues"} on this page.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {severities.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2"
                  >
                    <span className={`h-2 w-2 rounded-full ${SEVERITY_META[s].dot}`} />
                    <span className="text-xs text-neutral-500">{SEVERITY_META[s].label}</span>
                    <span className="ml-auto text-sm font-bold text-neutral-800">
                      {result.totals[s]}
                    </span>
                  </div>
                ))}
              </div>

              {result.isPartialScan && (
                <p className="mt-3 text-xs text-neutral-400">
                  This page was large, so we scanned the core WCAG A/AA rules. The full
                  report covers everything.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top issues */}
      {result.topIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Top things to fix</CardTitle>
            <CardDescription>
              The issues most likely to affect your visitors, worst first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.topIssues.map((issue) => {
              const meta = issue.impact ? SEVERITY_META[issue.impact] : null;
              return (
                <div
                  key={issue.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-neutral-900">{issue.help}</h3>
                    {meta && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
                      >
                        {meta.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-neutral-600">{issue.whatItMeans}</p>

                  {issue.measuredEvidence && (
                    <p className="mt-2 inline-block rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700">
                      {issue.measuredEvidence}
                    </p>
                  )}

                  {issue.disabilityGroups && issue.disabilityGroups.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {issue.disabilityGroups.map((g) => (
                        <span
                          key={g}
                          className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                        >
                          {DISABILITY_LABELS[g] ?? g}
                        </span>
                      ))}
                    </div>
                  )}

                  {issue.howToFix && (
                    <p className="mt-2 text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-800">How to fix:</span> {issue.howToFix}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-neutral-500">Affects: {issue.whoItAffects}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Email gate — also the only path to the PDF download */}
      <div ref={gateRef}>
        <EmailGate result={result} onCaptured={setCapturedEmail} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: build + trigger the branded PDF download (requires a captured email).
// Returns true on success. The server (/api/report-pdf) re-checks the email, so
// this gate cannot be bypassed by calling the API directly.
// ---------------------------------------------------------------------------

async function triggerPdfDownload(opts: {
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

// ---------------------------------------------------------------------------
// Download PDF report → POST /api/report-pdf → triggers a file download.
// The report is built from data the page already has (no re-scan).
// ---------------------------------------------------------------------------

function DownloadReportButton({
  result,
  url,
  capturedEmail,
  onNeedEmail,
}: {
  result: ScanResult;
  url: string;
  capturedEmail: string | null;
  onNeedEmail: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);

  async function download() {
    // Gate: no email captured yet → send the visitor to the email form.
    if (!capturedEmail) {
      setNudge(true);
      onNeedEmail();
      return;
    }
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const ok = await triggerPdfDownload({ url, email: capturedEmail, result });
      if (!ok) setErr("Couldn't build the PDF. Try again.");
    } catch {
      setErr("Couldn't build the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={download} disabled={busy}>
        {busy ? "Preparing…" : capturedEmail ? "Download PDF" : "Download PDF report"}
      </Button>
      {nudge && !capturedEmail && (
        <span className="text-xs text-neutral-400">Enter your email below to unlock the PDF.</span>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email capture → POST /api/scan-ingest (creates a lead).
// Honest, shadcn-based reimagining of scanner-integration/EmailCapture.tsx.
// ---------------------------------------------------------------------------

function EmailGate({
  result,
  onCaptured,
}: {
  result: ScanResult;
  onCaptured: (email: string) => void;
}) {
  const { finalUrl: url, score, totals } = result;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reDownloading, setReDownloading] = useState(false);

  const highRisk = totals.critical > 0 || totals.serious > 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || busy) return;

    setBusy(true);
    setErr(null);
    try {
      // 1) Capture the lead + queue the emailed report.
      const res = await fetch("/api/scan-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, email: value, score, totals }),
      });
      if (!res.ok) {
        setErr("We couldn't process that just now. Please try again.");
        return;
      }
      // 2) Unlock the PDF for this session and deliver it immediately.
      onCaptured(value);
      setDone(true);
      const ok = await triggerPdfDownload({ url, email: value, result });
      if (!ok) {
        setErr("Your report was emailed, but the PDF download didn't start. Use the button below.");
      }
    } catch {
      setErr("We couldn't process that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function reDownload() {
    if (reDownloading) return;
    setReDownloading(true);
    setErr(null);
    try {
      const ok = await triggerPdfDownload({ url, email: email.trim(), result });
      if (!ok) setErr("Couldn't build the PDF. Try again.");
    } finally {
      setReDownloading(false);
    }
  }

  if (done) {
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent>
          <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Your PDF is downloading — and it&apos;s in your inbox too.
                </p>
                <p className="text-sm text-emerald-700">
                  We&apos;ll follow up with the full breakdown and how we can help.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reDownload}
              disabled={reDownloading}
              className="shrink-0 border-emerald-300 text-emerald-800"
            >
              {reDownloading ? "Preparing…" : "Download PDF again"}
            </Button>
          </div>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-neutral-900 text-white ring-0">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white">Get your full report (PDF)</CardTitle>
        <CardDescription className="text-neutral-300">
          {highRisk
            ? "We found critical issues blocking some visitors. Enter your email and we'll download your full PDF report and email you a copy with exactly how to fix each one."
            : "Enter your email to download your full PDF report — the complete breakdown of every issue and how to fix it. We'll email you a copy too."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Input
            type="email"
            required
            aria-label="Your email address"
            placeholder="you@business.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="h-11 flex-1 border-neutral-700 bg-neutral-800 text-base text-white placeholder:text-neutral-500"
          />
          <Button type="submit" size="lg" disabled={busy || !email.trim()} className="h-11 px-6">
            {busy ? "Preparing…" : "Email & download report"}
          </Button>
        </form>
        {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
        <p className="mt-3 text-xs text-neutral-400">
          Honest scan — we report real issues and never claim a site is &quot;compliant&quot;.
          We use your email only to send this report and follow up.
        </p>
      </CardContent>
    </Card>
  );
}

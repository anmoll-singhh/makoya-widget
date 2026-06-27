/**
 * /scan — the PUBLIC accessibility scanner (top of the sales funnel), rebuilt on
 * the "Redline" design system.
 *
 * This file is the ORCHESTRATOR: it owns all interactive state and the network
 * calls, and composes the presentational Redline pieces:
 *   - <ScanHeader>      the top bar
 *   - <ScanForm>        the headline + URL input (deep-link auto-runs from /scan?url=)
 *   - <ScanLoading>     the methodical line-tick loader (foundation component)
 *   - <ScanResults>     the score (<ScoreMark>), severity breakdown (<SeverityBar>
 *                       + <SeverityChip>), and worst issues (<IssueCard>)
 *   - <ScanEmailGate>   the email-capture card → /api/scan-ingest → PDF unlock
 *
 * Flow (unchanged from the previous version — only the visuals changed):
 *   1. Visitor pastes a URL (or arrives via /scan?url=…) → POST /api/public-scan.
 *   2. We show the score, severity breakdown, and plain-English issues.
 *   3. The email gate posts to /api/scan-ingest (creates a lead) and unlocks the
 *      branded PDF (/api/report-pdf). `capturedEmail` is the unlock token; it lives
 *      here so both <ScanResults>'s download button and <ScanEmailGate> share it.
 *
 * Client component (the whole experience is interactive). No auth, single screen,
 * fast for cold traffic. Honesty: we show REAL issues and a score and never claim
 * a site is "compliant".
 */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScanHeader } from "@/components/scan/ScanHeader";
import { ScanForm } from "@/components/scan/ScanForm";
import { ScanResults } from "@/components/scan/ScanResults";
import { ScanEmailGate } from "@/components/scan/ScanEmailGate";
import { ScanLoading } from "@/components/makoya/ScanLoading";
import { PageTransition } from "@/components/motion/PageTransition";
import { Reveal } from "@/components/landing/Reveal";
import type { ScanResult } from "@/lib/scan/types";

// useSearchParams() (the ?url= deep-link) requires a Suspense boundary under the
// App Router, so the page body is wrapped.
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

  // The PDF is gated behind email: it unlocks only once the visitor submits the
  // email-capture form. `capturedEmail` is the unlock token shared by the results
  // download button and the gate.
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const gateRef = useRef<HTMLDivElement>(null);
  const scrollToGate = () =>
    gateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

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
    setCapturedEmail(null); // a fresh scan re-locks the PDF until email is re-entered

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
    <div className="paper-grain min-h-dvh bg-[var(--paper)] text-[var(--ink-900)]">
      <ScanHeader />

      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* Entrance motion on mount (self-disables under reduced motion). */}
        <PageTransition>
          <ScanForm
            url={url}
            onUrlChange={setUrl}
            onSubmit={runScan}
            scanning={scanning}
          />
        </PageTransition>

        {/* Loading — the methodical line-tick loader, not a spinner/sweep.
            aria-live is on the OUTER wrapper (always in the DOM) so screen
            readers can announce the region even when its content is inserted
            dynamically. Fix 4 (a11y 4.1.3): persistent aria-live element. */}
        <div aria-live="polite">
          {scanning && (
            <div className="mt-12">
              <ScanLoading label="Loading the page in a real browser and checking it against WCAG rules — this usually takes 10–30 seconds." />
            </div>
          )}
        </div>

        {/* Error */}
        {error && !scanning && (
          <div
            role="alert"
            className="mt-10 rounded-xl border px-5 py-4 text-sm"
            style={{
              borderColor: "var(--color-sev-critical)",
              background: "var(--color-sev-critical-bg)",
              color: "var(--color-sev-critical)",
            }}
          >
            {error}
          </div>
        )}

        {/* Results + email gate */}
        {result && !scanning && (
          <Reveal className="mt-12 space-y-8">
            <ScanResults
              result={result}
              capturedEmail={capturedEmail}
              onNeedEmail={scrollToGate}
            />
            <div ref={gateRef}>
              <ScanEmailGate
                result={result}
                onCaptured={setCapturedEmail}
                onRescan={() => {
                  setUrl(result.finalUrl);
                  setResult(null);
                  setError(null);
                  setCapturedEmail(null);
                  if (typeof window !== "undefined")
                    window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}

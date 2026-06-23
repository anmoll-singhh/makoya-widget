/**
 * RescannableScanReport.tsx  (client component)
 *
 * Thin client wrapper around <ScanReport> that enables Re-scan: clicking the
 * button increments a key, which unmounts and remounts ScanReport, triggering
 * a fresh POST /api/scan on mount.  No extra state or callback needed in
 * ScanReport itself.
 */

"use client";

import { useRef, useState } from "react";
import { ScanReport } from "@/components/ScanReport";

interface Props {
  siteId: string;
}

export function RescannableScanReport({ siteId }: Props) {
  const [scanKey, setScanKey] = useState(0);
  // Transient "kicking off" affordance. ScanReport refetches on remount; we
  // can't observe its internal loading, so we show a brief spinner on the
  // button to acknowledge the click, then hand off to ScanReport's own state.
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function rescan() {
    if (busy) return;
    setBusy(true);
    setScanKey((k) => k + 1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBusy(false), 1200);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
          <svg
            aria-hidden="true"
            className="mt-px h-3.5 w-3.5 shrink-0 text-neutral-400"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <circle cx="8" cy="8" r="6.25" />
            <path d="M8 5v3.5l2 1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            This report reflects your most recent scan. Run a fresh check any
            time — it usually takes 10–30 seconds.
          </span>
        </p>
        <button
          type="button"
          onClick={rescan}
          disabled={busy}
          aria-label={busy ? "Re-scanning your site" : "Re-scan your site now"}
          className="transition-base inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${busy ? "motion-safe:animate-spin" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 8A5.5 5.5 0 1 1 8 2.5M13.5 2.5v3h-3"
            />
          </svg>
          {busy ? "Re-scanning…" : "Re-scan"}
        </button>
      </div>

      {/* Polite status region so screen-reader users hear that a re-scan began. */}
      <span className="sr-only" role="status" aria-live="polite">
        {busy ? "Re-scan started." : ""}
      </span>

      <ScanReport key={scanKey} siteId={siteId} />
    </div>
  );
}

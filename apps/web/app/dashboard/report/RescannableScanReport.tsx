/**
 * RescannableScanReport.tsx  (client component)
 *
 * Thin client wrapper around <ScanReport> that enables Re-scan: clicking the
 * button increments a key, which unmounts and remounts ScanReport, triggering
 * a fresh POST /api/scan on mount.  No extra state or callback needed in
 * ScanReport itself.
 */

"use client";

import { useState } from "react";
import { ScanReport } from "@/components/ScanReport";

interface Props {
  siteId: string;
}

export function RescannableScanReport({ siteId }: Props) {
  const [scanKey, setScanKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-400">
          Scans update automatically — click Re-scan to run a fresh check now.
        </p>
        <button
          type="button"
          onClick={() => setScanKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
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
          Re-scan
        </button>
      </div>

      <ScanReport key={scanKey} siteId={siteId} />
    </div>
  );
}

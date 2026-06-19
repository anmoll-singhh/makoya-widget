"use client";
import { useEffect, useState } from "react";

interface PlainIssue { id: string; impact: string | null; title: string; whatItMeans: string; whoItAffects: string }
interface ScanResult { scanId: string; score: number; totals: { critical: number; serious: number; moderate: number; minor: number; total: number }; createdAt: string; plainTop3: PlainIssue[] }

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-600", serious: "text-orange-600", moderate: "text-yellow-600", minor: "text-neutral-500",
};

export function ScanReport({ siteId }: { siteId: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ScanResult | null>(null);
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const res = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId }) });
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (on) { setData(json); setState("ready"); }
      } catch { if (on) setState("error"); }
    })();
    return () => { on = false; };
  }, [siteId]);

  async function requestFullReport() {
    setRequesting(true);
    await fetch("/api/consultation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ siteId, type: "full_report" }) });
    setRequesting(false); setRequested(true);
  }

  if (state === "loading") return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-neutral-500">Analyzing your site for accessibility issues…</p>
      <div className="mt-3 h-2 w-40 animate-pulse rounded bg-neutral-200" />
    </div>
  );
  if (state === "error" || !data) return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-neutral-500">We couldn&apos;t analyze this site right now. We&apos;ll try again automatically.</p>
    </div>
  );

  const remaining = Math.max(0, data.totals.total - data.plainTop3.length);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Accessibility report</h2>
        <div className="text-right">
          <div className="text-3xl font-bold">{data.score}<span className="text-base font-normal text-neutral-400">/100</span></div>
          <div className="text-xs text-neutral-500">{data.totals.total} issues found</div>
        </div>
      </div>

      <ul className="mt-5 space-y-4">
        {data.plainTop3.map((p) => (
          <li key={p.id} className="border-l-2 border-neutral-200 pl-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold uppercase ${SEV_COLOR[p.impact ?? "minor"] ?? "text-neutral-500"}`}>{p.impact ?? "minor"}</span>
              <span className="font-medium">{p.title}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-600">{p.whatItMeans}</p>
            <p className="mt-0.5 text-xs text-neutral-400">Affects: {p.whoItAffects}</p>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl bg-neutral-50 p-4 ring-1 ring-neutral-200">
        {!requested ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              {remaining > 0 ? `${remaining} more issue${remaining === 1 ? "" : "s"} found.` : "Want help fixing these?"} Get the full report and a walkthrough with our team.
            </p>
            <button onClick={requestFullReport} disabled={requesting}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {requesting ? "Sending…" : "Get full report / Book a call"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-green-700">Thanks — we&apos;ve received your request and will reach out with the full report and next steps.</p>
        )}
      </div>
    </div>
  );
}

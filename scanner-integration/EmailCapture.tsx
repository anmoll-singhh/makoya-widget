/**
 * Drop this into your EXISTING scanner (ada-external-scanner) report page.
 * Shows after a scan completes: gate the full report behind an email, then
 * POST to the dashboard's /api/scan-ingest to create a lead + store the scan.
 *
 * This is the single highest-ROI change: it turns the scanner from a toy that
 * forgets people into a lead engine.
 */
"use client";
import { useState } from "react";

interface Props {
  url: string;
  score: number;
  totals: { critical: number; serious: number; moderate: number; minor: number };
  ingestUrl?: string; // default points at the dashboard ingest route
}

export function EmailCapture({ url, score, totals, ingestUrl = "/api/scan-ingest" }: Props) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const highRisk = totals.critical > 0 || totals.serious > 2;

  async function submit() {
    if (!email) return;
    setBusy(true);
    await fetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, email, score, totals }),
    }).catch(() => {});
    setBusy(false); setDone(true);
  }

  if (done) return <p>✓ Report sent. Check your inbox.</p>;

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, maxWidth: 460 }}>
      <h3 style={{ marginTop: 0 }}>Get your full report (PDF)</h3>
      {highRisk && (
        <p style={{ color: "#b91c1c", fontSize: 14 }}>
          This site has issues commonly cited in ADA accessibility lawsuits. We can fix them and provide a signed compliance file.
        </p>
      )}
      <input
        type="email" placeholder="you@business.com" value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: "9px 11px", border: "1px solid #e2e8f0", borderRadius: 8 }}
      />
      <div style={{ height: 8 }} />
      <button onClick={submit} disabled={busy}
        style={{ background: "#2563eb", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 600 }}>
        {busy ? "Sending…" : "Email me the report"}
      </button>
      <p style={{ fontSize: 12, color: "#64748b" }}>
        Honest scan. We never claim "WCAG compliant" — we show real issues and fix them.
      </p>
    </div>
  );
}

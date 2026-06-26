/**
 * AddAgent.tsx — 4-step add-agent wizard (client component).
 *
 * Ports the wizard from docs/makoya_v7.html lines 487–509.
 * Verbatim copy is preserved for: step labels, honest copy about the scan,
 * "Not yet conformant — estimated", and the "install to unlock" locked row.
 *
 * Flow:
 *   Step 1 (form)   → user enters domain → POST /api/sites → siteId + token
 *   Step 2 (scan)   → call GET /api/public-scan with domain homepage URL
 *                      show REAL top issue + locked remainder
 *   Step 3 (plan)   → (placeholder: "Continue — get the widget" skips here)
 *   Step 4 (install) → redirect /dashboard/<siteId>/install
 *
 * PostHog: fires `agent_added` (on site create success) and `free_scan_viewed`
 * (on scan result). Both are best-effort — failure is silently skipped.
 *
 * Honest copy preserved verbatim:
 *  - "We scanned your homepage"
 *  - "Not yet conformant — estimated"
 *  - "install to unlock the full audit"
 *  - "See full audit with Mike"
 * No compliance/"guaranteed accessible" claims anywhere.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

// ── Types ───────────────────────────────────────────────────────────────────

interface ScanTopIssue {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  help: string;
  whatItMeans?: string;
}

interface ScanResult {
  score: number | null;
  totals: {
    critical?: number;
    serious?: number;
    moderate?: number;
    minor?: number;
    total?: number;
  };
  topIssues: ScanTopIssue[];
  finalUrl: string;
}

type Step = 1 | 2;

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Maps scan impact → Pill class + icon */
function impactPill(impact: string) {
  if (impact === "critical" || impact === "serious") {
    return { cls: "pill high", icon: "ti ti-alert-octagon", label: "High" };
  }
  if (impact === "moderate") {
    return { cls: "pill med", icon: "ti ti-alert-triangle", label: "Medium" };
  }
  return { cls: "pill low", icon: "ti ti-info-circle", label: "Low" };
}

/** Score ring SVG — matches the mockup's embedded SVG (lines 503–504). */
function ScoreRing({ score }: { score: number | null }) {
  const n = score ?? 0;
  // Circumference of r=15.6 circle ≈ 98. dashoffset = 98 * (1 - n/100).
  const offset = Math.round(98 * (1 - n / 100));
  const strokeColor = n >= 80 ? "#3C6B53" : n >= 50 ? "#8A5A00" : "#C0392B";

  return (
    <svg
      width="118"
      height="118"
      viewBox="0 0 36 36"
      role="img"
      aria-label={`Estimated score: ${score ?? "unknown"} out of 100`}
      style={{ margin: "0 auto 12px" }}
    >
      <circle cx="18" cy="18" r="15.6" fill="none" stroke="#E2E5EA" strokeWidth="3.2" />
      <circle
        cx="18"
        cy="18"
        r="15.6"
        fill="none"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray="98"
        strokeDashoffset={offset}
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="17.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fill="#0D1B4D"
        fontFamily="Satoshi"
      >
        {score ?? "—"}
      </text>
      <text
        x="18"
        y="23"
        textAnchor="middle"
        fontSize="3.4"
        fill="#6B7280"
      >
        / 100
      </text>
    </svg>
  );
}

// ── Step indicator ──────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps = ["Add agent", "Free scan", "Choose plan", "Install"];
  return (
    <div className="steps">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const now = n === current;
        return (
          <div key={label} style={{ display: "contents" }}>
            <div className={`step${done ? " done" : now ? " now" : ""}`}>
              <span className="num">
                {done ? <i className="ti ti-check" aria-hidden="true" /> : n}
              </span>
              {label}
            </div>
            {i < steps.length - 1 && (
              <div className={`sep${done ? " done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function AddAgent() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1: Create site ─────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || undefined, domain }),
      });
      const data = (await res.json()) as { siteId?: string; token?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to create agent. Please try again.");
        return;
      }

      const newSiteId = data.siteId!;
      setSiteId(newSiteId);

      // Fire PostHog: agent_added
      try {
        posthog.capture("agent_added", { siteId: newSiteId, domain });
      } catch {
        // Analytics must never break the flow.
      }

      // Step 2: run the free scan
      await runScan(domain, newSiteId);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Free scan (step 2) ──────────────────────────────────────────────────

  async function runScan(rawDomain: string, createdSiteId: string) {
    // Build the homepage URL from the bare domain.
    const url = rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`;

    try {
      const res = await fetch("/api/public-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        // Scan failed — move to step 2 with null result (honest empty state).
        setScanResult(null);
      } else {
        const data = (await res.json()) as ScanResult;
        setScanResult(data);

        // Fire PostHog: free_scan_viewed
        try {
          posthog.capture("free_scan_viewed", {
            siteId: createdSiteId,
            domain: rawDomain,
            score: data.score,
          });
        } catch {
          // Analytics must never break the flow.
        }
      }
    } catch {
      // Network error — proceed to step 2 with null scan.
      setScanResult(null);
    }

    setStep(2);
  }

  // ── Step 2: Continue to install ─────────────────────────────────────────

  function handleContinue() {
    if (siteId) {
      router.push(`/dashboard/${siteId}/install`);
    }
  }

  function handleMike() {
    if (siteId) {
      router.push(`/dashboard/${siteId}/mike`);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // Count severities from real scan totals
  const totals = scanResult?.totals ?? {};
  const highCount = (totals.critical ?? 0) + (totals.serious ?? 0);
  const medCount = totals.moderate ?? 0;
  const lowCount = totals.minor ?? 0;
  const totalIssues = totals.total ?? highCount + medCount + lowCount;
  const topIssue = scanResult?.topIssues?.[0] ?? null;

  return (
    <>
      {/* Page header — verbatim from mockup lines 487–488 */}
      <div className="pagehead">
        New agent <b>Add an agent</b>
      </div>
      <p className="muted" style={{ margin: "-8px 0 18px", fontSize: 13.5, maxWidth: 560 }}>
        Point a new agent at your website. We scan the homepage free, then you
        choose how to protect it.
      </p>

      <section className="card cpad" style={{ maxWidth: 920 }}>
        <StepBar current={step} />

        {/* ── Step 1: Form ─────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleCreate}>
            <label className="fl" htmlFor="agent-domain">
              Website domain
            </label>
            <input
              id="agent-domain"
              className="inp"
              type="text"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              disabled={submitting}
              autoComplete="url"
            />

            <label className="fl" htmlFor="agent-name" style={{ marginTop: 14 }}>
              Agent name{" "}
              <span style={{ fontWeight: 400, color: "var(--t3)" }}>(optional)</span>
            </label>
            <input
              id="agent-name"
              className="inp"
              type="text"
              placeholder="My Company Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
            />

            {error && (
              <div
                className="note warn"
                style={{ marginTop: 14 }}
                role="alert"
              >
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="btn pri"
                disabled={submitting || !domain.trim()}
              >
                {submitting ? (
                  <>
                    <i className="ti ti-loader-2" aria-hidden="true" />
                    {" Scanning…"}
                  </>
                ) : (
                  <>
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                    {" Add agent & scan"}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Scan result ───────────────────────────────────────── */}
        {step === 2 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr .9fr",
              gap: 30,
              alignItems: "center",
            }}
          >
            {/* Left: issues summary */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <i
                  className="ti ti-world"
                  aria-hidden="true"
                  style={{ fontSize: 18, color: "var(--primary-hover)" }}
                />
                <b style={{ color: "var(--deep)" }}>{domain}</b>
              </div>

              {scanResult ? (
                <>
                  <h2 style={{ fontSize: 19 }}>We scanned your homepage</h2>
                  <p
                    className="muted"
                    style={{ fontSize: 13.5, margin: "6px 0 14px" }}
                  >
                    Found{" "}
                    <b style={{ color: "var(--t1)" }}>
                      {totalIssues} {totalIssues === 1 ? "issue" : "issues"}
                    </b>{" "}
                    across WCAG criteria on this page alone. A full-site audit by
                    Mike usually finds more.
                  </p>

                  {/* Severity pills */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    {highCount > 0 && (
                      <span className="pill high">
                        <i className="ti ti-alert-octagon" aria-hidden="true" />
                        {highCount} High
                      </span>
                    )}
                    {medCount > 0 && (
                      <span className="pill med">
                        <i className="ti ti-alert-triangle" aria-hidden="true" />
                        {medCount} Medium
                      </span>
                    )}
                    {lowCount > 0 && (
                      <span className="pill low">
                        <i className="ti ti-info-circle" aria-hidden="true" />
                        {lowCount} Low
                      </span>
                    )}
                    {totalIssues === 0 && (
                      <span className="pill green">
                        <i className="ti ti-check" aria-hidden="true" />
                        No issues found
                      </span>
                    )}
                  </div>

                  {/* Top issue + locked remainder */}
                  <div
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {topIssue ? (
                      <div
                        className="between"
                        style={{
                          padding: "12px 14px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontSize: 13.5 }}>{topIssue.help}</span>
                        <span className={impactPill(topIssue.impact).cls}>
                          <i
                            className={impactPill(topIssue.impact).icon}
                            aria-hidden="true"
                          />
                          {impactPill(topIssue.impact).label}
                        </span>
                      </div>
                    ) : (
                      <div
                        style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}
                      >
                        <span style={{ fontSize: 13.5, color: "var(--t2)" }}>
                          No issues detected on this page.
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        padding: "12px 14px",
                        background: "var(--bg)",
                      }}
                    >
                      <span className="tiny muted">
                        <i className="ti ti-lock" aria-hidden="true" />{" "}
                        {Math.max(0, totalIssues - 1)} more — install to unlock
                        the full audit
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Scan failed / timed out — honest empty state */
                <>
                  <h2 style={{ fontSize: 19 }}>Agent created</h2>
                  <p className="muted" style={{ fontSize: 13.5, margin: "6px 0 14px" }}>
                    We couldn't complete the homepage scan right now. Install the
                    widget and Mike will run a full audit once the site is
                    connected.
                  </p>
                </>
              )}
            </div>

            {/* Right: score ring + CTAs */}
            <div style={{ textAlign: "center" }}>
              <ScoreRing score={scanResult?.score ?? null} />

              {scanResult ? (
                <div style={{ marginBottom: 14 }}>
                  <span className="pill med">
                    <i className="ti ti-alert-triangle" aria-hidden="true" />
                    Not yet conformant — estimated
                  </span>
                </div>
              ) : (
                <div style={{ marginBottom: 14 }}>
                  <span className="pill gray">Scan pending</span>
                </div>
              )}

              {/* Primary CTA — verbatim from mockup */}
              <button
                className="btn pri"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={handleContinue}
              >
                <i className="ti ti-arrow-right" aria-hidden="true" />
                {" Continue — get the widget"}
              </button>

              {/* Secondary CTA — verbatim from mockup */}
              <button
                className="btn ghost"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  marginTop: 8,
                }}
                onClick={handleMike}
              >
                See full audit with Mike
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

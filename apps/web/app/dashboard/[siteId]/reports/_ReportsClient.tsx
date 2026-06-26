"use client";
/**
 * app/dashboard/[siteId]/reports/_ReportsClient.tsx — v7 Reports screen (CLIENT).
 *
 * Wired to:
 *   GET /api/sites/[siteId]/reports      → MonthlyReport[]
 *   GET /api/sites/[siteId]/remediation  → RemediationEntry[]
 *
 * Real-data discipline (HARD RULES from plan):
 *   - ALL rows in the Monthly audits table come from the API. Mockup literals
 *     "June 2026 / 82", "May 2026 / 76", "April 2026 / 68" are NEVER hard-coded.
 *   - "Download PDF" link is REAL: shown only when `report.pdfUrl` is non-null;
 *     otherwise an honest "—" is rendered — never a fake link.
 *   - "Download all (PDF)" header button is honest: if no reports exist it is
 *     disabled; otherwise it opens the first available PDF (or notes none are ready).
 *   - Report count in the card header is real (not "3 reports" hard-coded).
 *   - Remediation log tab shows real RemediationEntry rows; empty state is honest.
 *   - Loading / error states are all honest (role=status / role=alert).
 *
 * Tab model: two real <button role="tab"> elements — Monthly audits and Remediation log.
 *
 * Info note verbatim from mockup:
 *   "Remediations are human-made — by your team or Makoya specialists. The widget
 *    never auto-edits your code. Every fix is logged with the WCAG criterion it resolves."
 */

import { useState, useEffect } from "react";

/* ── API shapes (client-local; mirrors lib types) ────────────────────────────── */
interface MonthlyReport {
  period: string;   // "YYYY-MM"
  score: number | null;
  issuesFound: number;
  issuesResolved: number;
  pdfUrl: string | null;
}

interface RemediationEntry {
  id: string;
  siteId: string;
  issueId: string | null;
  wcagCriterion: string | null;
  action: string;
  fixedBy: string | null;
  fixedAt: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function monthLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function num(n: number): string {
  return n.toLocaleString();
}

/* ── Loading / error primitives ──────────────────────────────────────────────── */
function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" style={{ padding: "32px 0", textAlign: "center", color: "var(--t3)", fontSize: 13.5 }}>
      {label}
    </div>
  );
}
function ErrorState({ label }: { label: string }) {
  return (
    <div className="note warn" role="alert" style={{ marginTop: 16 }}>
      <i className="ti ti-alert-triangle" aria-hidden="true" />
      <div>{label}</div>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
}

type TabId = "monthly" | "remediation";

/* ── Main component ──────────────────────────────────────────────────────────── */
export function ReportsClient({ siteId }: Props) {
  const [tab, setTab] = useState<TabId>("monthly");

  /* Monthly reports state */
  const [reports, setReports] = useState<MonthlyReport[] | null>(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(false);

  /* Remediation log state — lazy: only fetched when the tab is first opened */
  const [remediation, setRemediation] = useState<RemediationEntry[] | null>(null);
  const [remLoading, setRemLoading] = useState(false);
  const [remError, setRemError] = useState(false);
  const [remFetched, setRemFetched] = useState(false);

  /* ── Fetch monthly reports on mount ───────────────────────────────────────── */
  useEffect(() => {
    let live = true;
    setReportsLoading(true);
    setReportsError(false);
    fetch(`/api/sites/${siteId}/reports`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<MonthlyReport[]>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setReports(d);
        setReportsLoading(false);
      })
      .catch(() => {
        if (live) { setReportsError(true); setReportsLoading(false); }
      });
    return () => { live = false; };
  }, [siteId]);

  /* ── Fetch remediation log lazily on first tab open ──────────────────────── */
  useEffect(() => {
    if (tab !== "remediation" || remFetched) return;
    let live = true;
    setRemLoading(true);
    setRemError(false);
    fetch(`/api/sites/${siteId}/remediation`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<RemediationEntry[]>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setRemediation(d);
        setRemLoading(false);
        setRemFetched(true);
      })
      .catch(() => {
        if (live) { setRemError(true); setRemLoading(false); }
      });
    return () => { live = false; };
  }, [tab, siteId, remFetched]);

  /* ── Download all PDF — honest: links to the first available or notes absence */
  function handleDownloadAll() {
    if (!reports || reports.length === 0) return;
    const firstWithPdf = reports.find((r) => r.pdfUrl);
    if (firstWithPdf?.pdfUrl) {
      window.open(firstWithPdf.pdfUrl, "_blank", "noopener noreferrer");
    }
    // If no PDFs are available, the button is disabled (see below).
  }

  const hasPdfs = reports?.some((r) => r.pdfUrl) ?? false;
  const hasReports = (reports?.length ?? 0) > 0;

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Audit history <b>Reports</b>
      </div>

      {/* Sub-header + download all */}
      <div className="between" style={{ margin: "6px 0 18px" }}>
        <p className="muted" style={{ margin: 0 }}>Monthly audits and the remediation log.</p>
        <button
          className="btn pri"
          type="button"
          onClick={handleDownloadAll}
          disabled={!hasPdfs}
          aria-label={hasPdfs ? "Download all available monthly reports as PDF" : "No PDF reports available yet"}
          title={!hasPdfs ? "PDF reports are generated monthly — none available yet" : undefined}
        >
          <i className="ti ti-download" aria-hidden="true" /> Download all (PDF)
        </button>
      </div>

      {/* Tabs */}
      <div className="seg" style={{ marginBottom: 16 }} role="tablist" aria-label="Reports sections">
        <button
          type="button"
          role="tab"
          className={tab === "monthly" ? "on" : ""}
          aria-selected={tab === "monthly"}
          aria-controls="reports-monthly-panel"
          onClick={() => setTab("monthly")}
        >
          Monthly audits
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "remediation" ? "on" : ""}
          aria-selected={tab === "remediation"}
          aria-controls="reports-remediation-panel"
          onClick={() => setTab("remediation")}
        >
          Remediation log
        </button>
      </div>

      {/* Monthly audits tab */}
      {tab === "monthly" && (
        <div id="reports-monthly-panel" role="tabpanel" aria-label="Monthly audits">
          {reportsLoading && <LoadingState label="Loading monthly reports…" />}
          {reportsError && (
            <ErrorState label="Couldn't load monthly reports — please try again shortly." />
          )}
          {!reportsLoading && !reportsError && (
            <>
              {!hasReports ? (
                <div className="note info">
                  <i className="ti ti-info-circle" aria-hidden="true" />
                  <div>
                    No monthly reports yet — the first report is generated after a full month of
                    monitoring. Check back next month.
                  </div>
                </div>
              ) : (
                <section className="card">
                  <div className="ch">
                    <h3>Monthly audits</h3>
                    <span className="cnt">{reports!.length} {reports!.length === 1 ? "report" : "reports"}</span>
                  </div>
                  <div className="tcard" style={{ border: "none", borderRadius: 0 }}>
                    <div
                      className="thead"
                      style={{ gridTemplateColumns: "1.4fr 90px 130px 120px 130px" }}
                    >
                      <div>Month</div>
                      <div>Score</div>
                      <div>Issues found</div>
                      <div>Resolved</div>
                      <div>Report</div>
                    </div>
                    {reports!.map((r) => (
                      <div
                        key={r.period}
                        className="trow"
                        style={{ gridTemplateColumns: "1.4fr 90px 130px 120px 130px", alignItems: "center" }}
                      >
                        <div style={{ fontWeight: 700, color: "var(--deep)" }}>
                          {monthLabel(r.period)}
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--deep)" }}>
                          {r.score != null ? r.score : "—"}
                        </div>
                        <div>{num(r.issuesFound)}</div>
                        <div>
                          {r.issuesResolved > 0 ? (
                            <span className="pill green">
                              <i className="ti ti-check" aria-hidden="true" />
                              {num(r.issuesResolved)}
                            </span>
                          ) : (
                            <span className="tiny muted">0</span>
                          )}
                        </div>
                        <div>
                          {r.pdfUrl ? (
                            <a
                              className="viewall"
                              href={r.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                              aria-label={`Download ${monthLabel(r.period)} report PDF`}
                            >
                              <i className="ti ti-download" aria-hidden="true" /> Download
                            </a>
                          ) : (
                            <span
                              className="tiny muted"
                              title="PDF not yet generated for this month"
                            >
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Remediation log tab */}
      {tab === "remediation" && (
        <div id="reports-remediation-panel" role="tabpanel" aria-label="Remediation log">
          {remLoading && <LoadingState label="Loading remediation log…" />}
          {remError && (
            <ErrorState label="Couldn't load the remediation log — please try again shortly." />
          )}
          {!remLoading && !remError && (
            <>
              {remediation === null || remediation.length === 0 ? (
                <div className="note info">
                  <i className="ti ti-info-circle" aria-hidden="true" />
                  <div>
                    No remediations logged yet. Fixes appear here once your team or Makoya
                    specialists resolve issues with a WCAG reference.
                  </div>
                </div>
              ) : (
                <section className="card">
                  <div className="ch">
                    <h3>Remediation log</h3>
                    <span className="cnt">{remediation.length} {remediation.length === 1 ? "fix" : "fixes"}</span>
                  </div>
                  <div className="tcard" style={{ border: "none", borderRadius: 0 }}>
                    <div
                      className="thead"
                      style={{ gridTemplateColumns: "1fr 130px 130px 120px" }}
                    >
                      <div>Action</div>
                      <div>WCAG criterion</div>
                      <div>Fixed by</div>
                      <div>Date</div>
                    </div>
                    {remediation.map((r) => (
                      <div
                        key={r.id}
                        className="trow"
                        style={{ gridTemplateColumns: "1fr 130px 130px 120px", alignItems: "center" }}
                      >
                        <div style={{ fontWeight: 600, color: "var(--deep)", fontSize: 13.5 }}>
                          {r.action}
                        </div>
                        <div>
                          {r.wcagCriterion ? (
                            <span className="pill gray" style={{ fontSize: 11.5 }}>
                              {r.wcagCriterion}
                            </span>
                          ) : (
                            <span className="tiny muted">—</span>
                          )}
                        </div>
                        <div className="tiny" style={{ color: "var(--t2)" }}>
                          {r.fixedBy ?? "—"}
                        </div>
                        <div className="tiny muted">{shortDate(r.fixedAt)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* Info note — verbatim from mockup */}
      <div className="note info" style={{ marginTop: 16 }}>
        <i className="ti ti-info-circle" aria-hidden="true" />
        <div>
          Remediations are human-made — by your team or Makoya specialists. The widget never
          auto-edits your code. Every fix is logged with the WCAG criterion it resolves.
        </div>
      </div>
    </>
  );
}

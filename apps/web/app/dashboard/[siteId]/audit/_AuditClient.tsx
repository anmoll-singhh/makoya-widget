"use client";
/**
 * app/dashboard/[siteId]/audit/_AuditClient.tsx — Full Audit view (CLIENT).
 *
 * Renders the honest, accessScan-parity per-rule breakdown from
 *   GET /api/sites/[siteId]/audit         → { content: AuditReportContent, ... }
 * and can trigger a fresh deep audit via
 *   POST /api/sites/[siteId]/audit/run    → { ready } | 202 in_progress
 * and download the PDF via
 *   GET /api/sites/[siteId]/audit-pdf.
 *
 * HONESTY: every user-facing string comes from the server-built content model
 * (buildAuditReport), which a unit test forbids from making compliance claims.
 * This view adds NO verdict copy of its own — it only lays out outcomes. Rules
 * that did not apply render as a muted, collapsed "Not relevant" list — never a
 * green pass (reviewer P0).
 *
 * Layout mirrors accessScan: a dark score header, then each check as a row with
 * an outcome badge + WCAG chip, followed by dark numbered code-snapshot chips.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { LoadingButton } from "../../_components";
import type { AuditReportContent, AuditRuleRow } from "@/lib/audit/audit-content";

interface Props {
  siteId: string;
}

interface AuditResponse {
  content: AuditReportContent;
  scanId: string;
  generatedAt: string;
}

/* ── Outcome styling (fail=red, review=amber, pass=green, n/a=grey) ─────────── */
const OUTCOME_STYLE: Record<
  AuditRuleRow["outcome"],
  { bg: string; fg: string; border: string }
> = {
  fail: { bg: "#fff0f0", fg: "#b91c1c", border: "#fecaca" },
  review: { bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  pass: { bg: "#f0fdf4", fg: "#15803d", border: "#bbf7d0" },
  "not-applicable": { bg: "#f1f5f9", fg: "#64748b", border: "#e2e8f0" },
};

function scoreColor(score: number): string {
  if (score >= 80) return "#1FA86B";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

/* ── Code-snapshot chip (dark, numbered) — matches accessScan ───────────────── */
function CodeChip({ n, sample }: { n: number; sample: { target: string; html: string } }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        background: "#0d1b2a",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          background: "#132538",
          color: "#93c5fd",
          fontWeight: 700,
          fontSize: 12,
          padding: "10px 12px",
          minWidth: 34,
          textAlign: "center",
        }}
      >
        {n}
      </div>
      <code
        style={{
          color: "#e2e8f0",
          fontSize: 11.5,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
          padding: "10px 12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          lineHeight: 1.55,
        }}
      >
        {sample.html || sample.target}
      </code>
    </div>
  );
}

/* ── One rule row ───────────────────────────────────────────────────────────── */
function RuleRow({ row, index }: { row: AuditRuleRow; index: number }) {
  const s = OUTCOME_STYLE[row.outcome];
  const countLabel =
    row.outcome === "fail"
      ? `${row.count} ${row.count === 1 ? "element" : "elements"}`
      : row.outcome === "review"
        ? `${row.count} to review`
        : row.outcome === "pass"
          ? `${row.count} checked`
          : "—";

  return (
    <div
      className="card"
      style={{ padding: 16, marginBottom: 12, borderLeft: `3px solid ${s.fg}` }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ color: "var(--t3)", fontWeight: 700, fontSize: 13, minWidth: 22 }}>
          {index}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 650, color: "var(--deep)", fontSize: 14, marginBottom: 6 }}>
            {row.title}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: s.fg,
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              {row.outcomeLabel}
            </span>
            {row.relevant && (
              <span className="tiny muted" style={{ fontSize: 11.5 }}>
                {countLabel}
              </span>
            )}
            {row.wcagCriterion && (
              <span className="pill gray" style={{ fontSize: 11 }}>
                {row.wcagCriterion}
              </span>
            )}
            <span className="pill gray" style={{ fontSize: 11 }}>
              {row.levelLabel}
            </span>
            {row.severityLabel && (
              <span className="pill" style={{ fontSize: 11, background: s.bg, color: s.fg }}>
                {row.severityLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {row.sample.length > 0 && row.sampleHeading && (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--t2)",
              marginBottom: 8,
            }}
          >
            {row.sampleHeading}
          </div>
          {row.sample.map((sample, i) => (
            <CodeChip key={i} n={i + 1} sample={sample} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export function AuditClient({ siteId }: Props) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [noAudit, setNoAudit] = useState(false);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const liveRef = useRef(true);
  useEffect(() => {
    liveRef.current = true;
    return () => {
      liveRef.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<"ok" | "empty" | "error"> => {
    try {
      const res = await fetch(`/api/sites/${siteId}/audit`, { credentials: "same-origin" });
      if (res.status === 404) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "no_audit") return "empty";
        return "error";
      }
      if (!res.ok) return "error";
      const json = (await res.json()) as AuditResponse;
      if (liveRef.current) setData(json);
      return "ok";
    } catch {
      return "error";
    }
  }, [siteId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    load().then((r) => {
      if (!live) return;
      setNoAudit(r === "empty");
      setLoadError(r === "error");
      setLoading(false);
    });
    return () => {
      live = false;
    };
  }, [load]);

  /* Trigger a fresh deep audit, then poll for the result (202 = already running). */
  async function runAudit() {
    if (running) return;
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/audit/run`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 200) {
        await load();
        setNoAudit(false);
      } else if (res.status === 202) {
        // Another audit is already running — poll for it to land.
        for (let i = 0; i < 16 && liveRef.current; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const r = await load();
          if (r === "ok") {
            setNoAudit(false);
            break;
          }
        }
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setRunError(body.error ?? "Couldn't run the full audit right now — please try again shortly.");
      }
    } catch {
      setRunError("Couldn't run the full audit right now — please try again shortly.");
    } finally {
      if (liveRef.current) setRunning(false);
    }
  }

  async function downloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/audit-pdf`, { credentials: "same-origin" });
      if (!res.ok) throw new Error("pdf");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "makoya-full-audit.pdf";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 200);
    } catch {
      setDownloadError("Couldn't generate the PDF — please try again shortly.");
    } finally {
      setDownloading(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <div className="pagehead">
          Full audit <b>Every check, in plain English</b>
        </div>
        <div role="status" style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}>
          Loading the full audit…
        </div>
      </>
    );
  }

  const content = data?.content;
  const applicable = content
    ? content.scoredRules.filter((r) => r.outcome !== "not-applicable")
    : [];
  const notApplicable = content
    ? content.scoredRules.filter((r) => r.outcome === "not-applicable")
    : [];

  return (
    <>
      <div className="pagehead">
        Full audit <b>Every check, in plain English</b>
      </div>

      <div className="between" style={{ margin: "6px 0 18px", gap: 12, flexWrap: "wrap" }}>
        <p className="muted" style={{ margin: 0 }}>
          A per-rule breakdown of the latest deep scan — what applied, what passed, and what to fix.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          {content && (
            <LoadingButton
              className="btn"
              type="button"
              onClick={() => void downloadPdf()}
              loading={downloading}
              icon={<i className="ti ti-download" aria-hidden="true" />}
            >
              Download PDF
            </LoadingButton>
          )}
          <LoadingButton
            className="btn pri"
            type="button"
            onClick={() => void runAudit()}
            loading={running}
            icon={<i className="ti ti-refresh" aria-hidden="true" />}
          >
            {content ? "Re-run full audit" : "Run full audit"}
          </LoadingButton>
        </div>
      </div>

      {runError && (
        <div className="note warn" role="alert" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{runError}</div>
        </div>
      )}
      {downloadError && (
        <div className="note warn" role="alert" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{downloadError}</div>
        </div>
      )}
      {running && (
        <div className="note info" role="status" style={{ marginBottom: 14 }}>
          <i className="ti ti-loader-2" aria-hidden="true" />
          <div>Running a full audit — this can take up to a minute…</div>
        </div>
      )}

      {loadError && (
        <div className="note warn" role="alert">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load the full audit — please try again shortly.</div>
        </div>
      )}

      {!loadError && noAudit && !content && (
        <div className="note info">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>
            No full audit yet. Click <b>Run full audit</b> to scan every WCAG check against your
            homepage and see each element that passed, failed, or needs review.
          </div>
        </div>
      )}

      {content && (
        <>
          {/* ── Score header (dark, accessScan-style) ─────────────────────── */}
          <section
            style={{
              background: "#0d1b2a",
              borderRadius: 14,
              padding: "24px 26px",
              color: "#fff",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12.5, color: "#93c5fd", fontWeight: 700, letterSpacing: 0.4 }}>
                  FULL ACCESSIBILITY AUDIT
                </div>
                <div style={{ fontSize: 20, fontWeight: 750, marginTop: 4 }}>{content.host}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
                  {content.url} · {content.dateLabel}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 13.5, marginTop: 12, maxWidth: 560 }}>
                  {content.scoreVerdict}
                </div>
              </div>
              <div style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: scoreColor(content.score) }}>
                  {content.score}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>/ 100</div>
              </div>
            </div>
            {/* Summary chips */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
              <SummaryChip label="Failing" value={content.summary.failed} tone="#f87171" />
              <SummaryChip label="Needs review" value={content.summary.review} tone="#fbbf24" />
              <SummaryChip label="No issue found" value={content.summary.passed} tone="#34d399" />
              <SummaryChip label="Not relevant" value={content.summary.notApplicable} tone="#94a3b8" />
              <SummaryChip label="Checks run" value={content.summary.totalRules} tone="#93c5fd" />
            </div>
          </section>

          {/* ── Applicable, scored rules (fail-first) ─────────────────────── */}
          <div className="ch" style={{ marginBottom: 12 }}>
            <h3>Checks that applied to this page</h3>
            <span className="cnt">{applicable.length}</span>
          </div>
          {applicable.length === 0 ? (
            <div className="note info" style={{ marginBottom: 20 }}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <div>No scored checks applied to this page.</div>
            </div>
          ) : (
            applicable.map((row, i) => <RuleRow key={row.id} row={row} index={i + 1} />)
          )}

          {/* ── Best practices (not in score) ─────────────────────────────── */}
          {content.bestPracticeRules.length > 0 && (
            <>
              <div className="ch" style={{ margin: "24px 0 12px" }}>
                <h3>Best practices</h3>
                <span className="cnt">not included in the score</span>
              </div>
              {content.bestPracticeRules
                .filter((r) => r.outcome !== "not-applicable")
                .map((row, i) => (
                  <RuleRow key={row.id} row={row} index={i + 1} />
                ))}
            </>
          )}

          {/* ── Not-relevant checks (collapsed, muted — never a pass) ──────── */}
          {notApplicable.length > 0 && (
            <details style={{ marginTop: 20 }}>
              <summary
                style={{ cursor: "pointer", color: "var(--t2)", fontSize: 13.5, fontWeight: 600 }}
              >
                Checks that didn&apos;t apply to this page ({notApplicable.length})
              </summary>
              <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--t3)", fontSize: 13 }}>
                {notApplicable.map((r) => (
                  <li key={r.id} style={{ marginBottom: 4 }}>
                    {r.title}
                    {r.wcagCriterion ? ` — ${r.wcagCriterion}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* ── Honest disclaimer ─────────────────────────────────────────── */}
          <div className="note info" style={{ marginTop: 24 }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <div>{content.disclaimer}</div>
          </div>
        </>
      )}
    </>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 84,
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{label}</div>
    </div>
  );
}

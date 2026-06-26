"use client";
/**
 * app/dashboard/[siteId]/proof/_ProofClient.tsx — v7 Proof of effort screen (CLIENT).
 *
 * Wired to:
 *   GET /api/sites/[siteId]/proof-pack → ProofPack
 *
 * Real-data discipline (HARD RULES from plan):
 *   - NEVER shows a fake "Ready" / "Up to date" when an evidence item is absent.
 *     Each item displays its TRUE state from the API or an honest "Not yet" / "Empty"
 *     badge when the evidence does not exist.
 *   - Audit history count, remediation count, install days, VPAT count, manual
 *     audit count — ALL come from the API. Mockup literals "12 monthly Mike audits",
 *     "71 fixes logged", "142 days · 99.9% uptime" etc. are replaced with real data.
 *   - Download proof pack button is present but honest: there is no PDF generation
 *     endpoint yet — the button states this clearly rather than silently no-oping.
 *   - Loading / error states are honest (role=status / role=alert).
 *
 * Evidence items shown (6, matching the mockup):
 *   1. Audit history           → auditHistory.count + latestScore
 *   2. Remediation log         → remediationCount
 *   3. Accessibility statement → statementPublished
 *   4. Widget install proof    → install.daysInstalled + firstSeenOn
 *   5. VPAT / ACR              → vpat.length
 *   6. Manual expert audit     → manualAudits.length
 *
 * Warn note verbatim from mockup:
 *   "If your accessibility is ever challenged — for example a demand letter —
 *    this pack documents good-faith, ongoing effort. It is evidence of effort,
 *    not a guarantee against claims."
 */

import { useState, useEffect } from "react";

/* ── API shape (mirrors lib/proof.ts return; kept client-local) ──────────────── */
interface ProofPack {
  auditHistory: {
    count: number;
    latestScore: number | null;
    latestOn: string | null;
  };
  remediationCount: number;
  statementPublished: boolean;
  install: {
    daysInstalled: number;
    firstSeenOn: string | null;
  };
  vpat: { id: string; title: string; generatedOn: string | null }[];
  manualAudits: { id: string; auditor: string; performedOn: string | null }[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/* ── Evidence item component ─────────────────────────────────────────────────── */
interface EvidenceItemProps {
  icon: string;
  title: string;
  description: string;
  /** true = green "Up to date" / label; false = gray "Not yet" */
  present: boolean;
  presentLabel: string;
  absentLabel: string;
}

function EvidenceItem({
  icon,
  title,
  description,
  present,
  presentLabel,
  absentLabel,
}: EvidenceItemProps) {
  return (
    <div className="feat">
      <div className="ic" aria-hidden="true">
        <i className={`ti ${icon}`} aria-hidden="true" />
      </div>
      <div style={{ flex: 1 }}>
        <div className="nm">{title}</div>
        <div className="de">{description}</div>
      </div>
      <span
        className={`pill ${present ? "green" : "gray"}`}
        aria-label={`${title}: ${present ? presentLabel : absentLabel}`}
      >
        {present && <i className="ti ti-check" aria-hidden="true" />}
        {present ? presentLabel : absentLabel}
      </span>
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
  domain: string;
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export function ProofClient({ siteId, domain }: Props) {
  const [data, setData] = useState<ProofPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloadNote, setDownloadNote] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`/api/sites/${siteId}/proof-pack`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<ProofPack>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (live) { setError(true); setLoading(false); }
      });
    return () => { live = false; };
  }, [siteId]);

  /* ── Loading ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}>
        Loading proof of effort…
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────────── */
  if (error || !data) {
    return (
      <div className="note warn" role="alert" style={{ marginTop: 24 }}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>Couldn&apos;t load your proof pack — please try again shortly.</div>
      </div>
    );
  }

  /* ── Evidence item descriptions (built from REAL data) ──────────────────── */
  const auditDesc = data.auditHistory.count > 0
    ? `${plural(data.auditHistory.count, "audit")} on file${
        data.auditHistory.latestScore != null
          ? ` · latest score ${data.auditHistory.latestScore}`
          : ""
      }${data.auditHistory.latestOn ? ` · last ${shortDate(data.auditHistory.latestOn)}` : ""}`
    : "No audits on file yet";

  const remediationDesc = data.remediationCount > 0
    ? `${plural(data.remediationCount, "fix")} logged with WCAG mapping`
    : "No fixes logged yet";

  const statementDesc = data.statementPublished
    ? "Published — link your statement from your footer"
    : "Not generated yet — create one on the Statement screen";

  const installDesc = data.install.daysInstalled > 0
    ? `${plural(data.install.daysInstalled, "day")} installed${
        data.install.firstSeenOn ? ` · since ${shortDate(data.install.firstSeenOn)}` : ""
      }`
    : "Widget not yet detected on your site";

  const vpatDesc = data.vpat.length > 0
    ? `${plural(data.vpat.length, "document")} on file${
        data.vpat[0].generatedOn ? ` · latest ${shortDate(data.vpat[0].generatedOn)}` : ""
      }`
    : "None on file yet";

  const auditDesc2 = data.manualAudits.length > 0
    ? `By ${data.manualAudits[0].auditor}${
        data.manualAudits[0].performedOn ? ` · ${shortDate(data.manualAudits[0].performedOn)}` : ""
      }`
    : "None on file yet";

  /* ── Count items that have real evidence ──────────────────────────────────── */
  const itemsWithEvidence = [
    data.auditHistory.count > 0,
    data.remediationCount > 0,
    data.statementPublished,
    data.install.daysInstalled > 0,
    data.vpat.length > 0,
    data.manualAudits.length > 0,
  ].filter(Boolean).length;

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        <i className="ti ti-shield-check" aria-hidden="true" /> Proof of effort{" "}
        <b>Proof of effort</b>
      </div>

      {/* Sub-header + download */}
      <div className="between" style={{ margin: "4px 0 18px" }}>
        <div className="muted tiny" style={{ maxWidth: 440 }}>
          A documented, time-stamped record of the ongoing accessibility work on{" "}
          <b>{domain}</b>.
        </div>
        <div>
          <button
            className="btn pri"
            type="button"
            onClick={() => setDownloadNote(true)}
            aria-label="Download proof pack (PDF generation coming soon)"
          >
            <i className="ti ti-download" aria-hidden="true" /> Download proof pack
          </button>
        </div>
      </div>

      {/* Download coming-soon note */}
      {downloadNote && (
        <div className="note info" role="status" style={{ marginBottom: 14 }}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <div>
            PDF proof pack generation is not yet available — your evidence items are recorded
            and will be included when PDF export ships. Close this notice by refreshing.
          </div>
        </div>
      )}

      {/* Warn note — verbatim from mockup */}
      <div className="note warn">
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>
          If your accessibility is ever challenged — for example a demand letter — this pack documents
          good-faith, ongoing effort. It is evidence of effort, not a guarantee against claims.
        </div>
      </div>

      {/* Evidence items */}
      <section className="card" style={{ marginTop: 16 }}>
        <div className="ch">
          <h3>Evidence on file</h3>
          <span className="cnt">{itemsWithEvidence} of 6 items</span>
        </div>
        <div className="cpad">
          <div className="grid2">
            <EvidenceItem
              icon="ti-history"
              title="Audit history"
              description={auditDesc}
              present={data.auditHistory.count > 0}
              presentLabel="Up to date"
              absentLabel="Not yet"
            />
            <EvidenceItem
              icon="ti-list-check"
              title="Remediation log"
              description={remediationDesc}
              present={data.remediationCount > 0}
              presentLabel="Up to date"
              absentLabel="Empty"
            />
            <EvidenceItem
              icon="ti-file-text"
              title="Accessibility statement"
              description={statementDesc}
              present={data.statementPublished}
              presentLabel="Live"
              absentLabel="Not generated"
            />
            <EvidenceItem
              icon="ti-plug-connected"
              title="Widget install proof"
              description={installDesc}
              present={data.install.daysInstalled > 0}
              presentLabel="Verified"
              absentLabel="Not seen"
            />
            <EvidenceItem
              icon="ti-certificate"
              title="VPAT / ACR"
              description={vpatDesc}
              present={data.vpat.length > 0}
              presentLabel="Ready"
              absentLabel="Not generated"
            />
            <EvidenceItem
              icon="ti-user-search"
              title="Manual expert audit"
              description={auditDesc2}
              present={data.manualAudits.length > 0}
              presentLabel="On file"
              absentLabel="Not yet"
            />
          </div>
        </div>
      </section>
    </>
  );
}

"use client";
/**
 * app/dashboard/[siteId]/statement/_StatementClient.tsx — v7 Accessibility Statement screen (CLIENT).
 *
 * Wired to:
 *   GET  /api/sites/[siteId]/statement → current StatementRecord | null
 *   POST /api/sites/[siteId]/statement → generate + save statement from form inputs
 *
 * Real-data discipline:
 *   - Form fields pre-populated from the saved statement (if any); defaults derived
 *     from the site domain and account email when none exists yet.
 *   - Live preview updates in real time from form state — not from hard-coded copy.
 *   - "Copy HTML" copies data.html from the API response (already XSS-escaped by
 *     lib/statement.ts — the server guarantees no injection). Falls back to a
 *     client-side preview if no saved statement exists yet.
 *   - Jurisdictions shown as real toggleable pills (ada / aoda / aca / eaa).
 *   - Conformance target is a real <select> (WCAG 2.1 AA or 2.2 AA).
 *   - Loading / error / empty states are all honest (role=status / role=alert).
 *
 * Honesty (per CLAUDE.md compliance guardrail — verbatim from mockup):
 *   "States your commitment and target — it is not a legal certification.
 *    Pairs with your proof-of-effort record."
 *
 * No "compliant", "certified", "guaranteed", or "guaranteed accessible" copy lives here.
 */

import { useState, useEffect } from "react";
import { LoadingButton } from "../../_components";

/* ── API types (client-local; mirrors lib/statement.ts shapes) ───────────────── */
type Jurisdiction = "ada" | "aoda" | "aca" | "eaa";

interface StatementRecord {
  brandName: string;
  jurisdictions: Jurisdiction[];
  conformanceTarget: string;
  contactEmail: string;
  html: string;
  updatedAt: string;
}

/* ── Jurisdiction display names ─────────────────────────────────────────────── */
const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
  ada: "US · ADA",
  aoda: "Canada · AODA",
  aca: "Canada · ACA",
  eaa: "EU · EAA",
};

const ALL_JURISDICTIONS: Jurisdiction[] = ["ada", "aoda", "aca", "eaa"];

/* ── Conformance targets ─────────────────────────────────────────────────────── */
const CONFORMANCE_TARGETS = ["WCAG 2.1 Level AA (recommended)", "WCAG 2.2 Level AA"];

/* ── Helper: format updated date ─────────────────────────────────────────────── */
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * Escape HTML-significant chars from owner-supplied text to prevent XSS injection
 * when the output is rendered via dangerouslySetInnerHTML.
 * Mirrors lib/statement.ts#escapeHtml — that function is private (not exported)
 * because it lives alongside server-only Supabase calls; we inline the same five
 * replacements here rather than importing from a mixed server/client module.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build a client-side preview HTML string (used before the first POST / when no
 * saved record exists yet).
 *
 * SECURITY: `brand`, `target`, and `contact` are owner-supplied form inputs.
 * They MUST be escaped via `esc()` before interpolation — this output is rendered
 * via dangerouslySetInnerHTML. Server-generated `record.html` is already escaped
 * by lib/statement.ts#generateStatementHtml and does NOT pass through this function.
 */
function buildPreviewHtml(
  brand: string,
  target: string,
  contact: string,
  jurisdictions: Jurisdiction[]
): string {
  const jLabels = jurisdictions.map((j) => JURISDICTION_LABELS[j]).join(", ");
  const eBrand = esc(brand);
  const eTarget = esc(target);
  const eContact = esc(contact);
  return [
    `<b>Accessibility statement</b>`,
    ``,
    `${eBrand || "Your brand"} is committed to digital accessibility for people with disabilities.`,
    `We aim to conform to <b>${eTarget || "WCAG 2.1 Level AA"}</b>${jLabels ? `, in line with ${jLabels}` : ""}.`,
    ``,
    `Feedback: <a href="mailto:${eContact}">${eContact || "your@email.com"}</a>`,
    ``,
    `<em>Last reviewed — · Monitored by a Makoya agent.</em>`,
  ].join("\n");
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
  domain: string;
  accountEmail: string;
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export function StatementClient({ siteId, domain, accountEmail }: Props) {
  /* server data */
  const [record, setRecord] = useState<StatementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  /* form state */
  const defaultBrand = domain
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/^\w/, (c) => c.toUpperCase());
  const [brand, setBrand] = useState(defaultBrand);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>(["ada", "aoda"]);
  const [target, setTarget] = useState("WCAG 2.1 Level AA (recommended)");
  const [contact, setContact] = useState(accountEmail);

  /* UI state */
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  /* Public URL — the page a merchant links from their footer. Starts as a
   * relative path (SSR-safe, no hydration mismatch) and is upgraded to an
   * absolute origin URL on the client so the copy is paste-ready anywhere. */
  const relPublicUrl = `/a11y/${siteId}`;
  const [publicUrl, setPublicUrl] = useState(relPublicUrl);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(`${window.location.origin}${relPublicUrl}`);
    }
  }, [relPublicUrl]);

  /* ── Fetch existing statement ──────────────────────────────────────────────── */
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`/api/sites/${siteId}/statement`, { credentials: "same-origin" })
      .then((r) =>
        r.ok ? (r.json() as Promise<StatementRecord | null>) : Promise.reject(r.status)
      )
      .then((d) => {
        if (!live) return;
        setRecord(d);
        if (d) {
          setBrand(d.brandName);
          setJurisdictions(d.jurisdictions);
          setTarget(d.conformanceTarget);
          setContact(d.contactEmail);
        }
        setLoading(false);
      })
      .catch(() => {
        if (live) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [siteId]);

  /* ── Toggle jurisdiction ─────────────────────────────────────────────────── */
  function toggleJurisdiction(j: Jurisdiction) {
    setJurisdictions((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));
  }

  /* ── Save (POST) ─────────────────────────────────────────────────────────── */
  async function save() {
    setSaving(true);
    setSaveErr(null);
    try {
      const conformanceTarget = target.replace(" (recommended)", "").trim();
      const res = await fetch(`/api/sites/${siteId}/statement`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: brand,
          jurisdictions,
          conformanceTarget,
          contactEmail: contact,
        }),
      });
      if (!res.ok) {
        setSaveErr("Couldn't save your statement — please try again shortly.");
        return;
      }
      const updated = (await res.json()) as StatementRecord;
      setRecord(updated);
    } catch {
      setSaveErr("Network error — please try again shortly.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Copy HTML ────────────────────────────────────────────────────────────── */
  async function copyHtml() {
    // If we have a saved record, copy its real XSS-escaped server-generated HTML.
    // Otherwise, copy a client-side preview.
    const html =
      record?.html ??
      buildPreviewHtml(brand, target.replace(" (recommended)", ""), contact, jurisdictions);
    try {
      await navigator.clipboard?.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  /* ── Copy the public URL ─────────────────────────────────────────────────── */
  async function copyPublicUrl() {
    try {
      await navigator.clipboard?.writeText(publicUrl);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  /* ── Live preview HTML ──────────────────────────────────────────────────────  */
  const previewHtml =
    record?.html ??
    buildPreviewHtml(brand, target.replace(" (recommended)", ""), contact, jurisdictions);

  /* ── Loading / error ─────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}
      >
        Loading accessibility statement…
      </div>
    );
  }

  if (error) {
    return (
      <div className="note warn" role="alert" style={{ marginTop: 24 }}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>Couldn&apos;t load your statement — please try again shortly.</div>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Compliance <b>Accessibility statement</b>
      </div>

      <p className="muted" style={{ margin: "-8px 0 18px", fontSize: 13.5 }}>
        State your commitment and conformance target. We recommend displaying it in your footer.
      </p>

      <div className="dash-split" style={{ maxWidth: 980 }}>
        {/* Left: form */}
        <section className="card cpad">
          {/* Brand name */}
          <label className="fl" htmlFor="stmt-brand" style={{ marginTop: 0 }}>
            Brand name
          </label>
          <input
            id="stmt-brand"
            className="inp"
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            maxLength={120}
            autoComplete="organization"
          />

          {/* Jurisdictions */}
          <label className="fl">Jurisdictions to reference</label>
          <div
            style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
            role="group"
            aria-label="Jurisdictions"
          >
            {ALL_JURISDICTIONS.map((j) => {
              const selected = jurisdictions.includes(j);
              return (
                <button
                  key={j}
                  type="button"
                  className={`pill ${selected ? "low" : "gray"}`}
                  aria-pressed={selected}
                  onClick={() => toggleJurisdiction(j)}
                  style={{ cursor: "pointer" }}
                >
                  {selected && <i className="ti ti-check" aria-hidden="true" />}
                  {JURISDICTION_LABELS[j]}
                </button>
              );
            })}
          </div>

          {/* Conformance target */}
          <label className="fl" htmlFor="stmt-target">
            Conformance target
          </label>
          <select
            id="stmt-target"
            className="inp"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {CONFORMANCE_TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Contact email */}
          <label className="fl" htmlFor="stmt-contact">
            Accessibility contact
          </label>
          <input
            id="stmt-contact"
            className="inp"
            type="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={254}
            autoComplete="email"
          />

          {/* Errors */}
          {saveErr && (
            <div className="note warn" role="alert" style={{ marginTop: 12 }}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <div>{saveErr}</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <LoadingButton
              className="btn pri"
              type="button"
              onClick={() => void save()}
              loading={saving}
              icon={<i className="ti ti-device-floppy" aria-hidden="true" />}
            >
              Save statement
            </LoadingButton>
            <button
              className="btn"
              type="button"
              onClick={() => void copyHtml()}
              aria-label={
                record ? "Copy the generated HTML for your statement" : "Copy preview HTML"
              }
            >
              <i className="ti ti-copy" aria-hidden="true" />
              {copied ? "Copied!" : "Copy HTML"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              aria-expanded={showPreview}
              aria-controls="stmt-preview-panel"
            >
              <i className="ti ti-eye" aria-hidden="true" />
              {showPreview ? "Hide" : "Preview"}
            </button>
          </div>

          {/* Last saved */}
          {record?.updatedAt && (
            <div className="tiny muted" style={{ marginTop: 10 }}>
              Last saved{" "}
              {new Date(record.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              .
            </div>
          )}

          {/* Public URL — the link a merchant puts in their footer. Goes live
              once a statement has been saved (the page 404s until then). */}
          <div style={{ marginTop: 16 }}>
            <label className="fl" htmlFor="stmt-public-url" style={{ marginTop: 0 }}>
              Public URL <span className="muted">(link this in your footer)</span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                id="stmt-public-url"
                className="inp"
                type="text"
                value={publicUrl}
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                style={{ flex: 1, fontFamily: "var(--font-geist-mono, monospace)", fontSize: 12.5 }}
              />
              <button
                className="btn"
                type="button"
                onClick={() => void copyPublicUrl()}
                aria-label="Copy the public accessibility-statement URL"
              >
                <i className="ti ti-link" aria-hidden="true" />
                {urlCopied ? "Copied!" : "Copy link"}
              </button>
            </div>
            {!record && (
              <div className="tiny muted" style={{ marginTop: 6 }}>
                Save your statement first — the page goes live at this URL once saved.
              </div>
            )}
          </div>

          {/* Honest note — verbatim from mockup */}
          <div className="note info" style={{ marginTop: 16 }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <div>
              States your commitment and target — it is not a legal certification. Pairs with your
              proof-of-effort record.
            </div>
          </div>

          {/* Expanded preview (accessible) */}
          {showPreview && (
            <div
              id="stmt-preview-panel"
              style={{
                marginTop: 16,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 16,
                fontSize: 12.5,
                lineHeight: 1.65,
                color: "var(--t2)",
                whiteSpace: "pre-wrap",
              }}
              aria-label="Statement preview"
              // dangerouslySetInnerHTML: server-generated record.html is escaped by
              // lib/statement.ts#generateStatementHtml; client-side preview HTML is
              // escaped by the local esc() helper in buildPreviewHtml above.
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </section>

        {/* Right: live preview */}
        <section
          className="card cpad"
          style={{ background: "var(--bg)" }}
          aria-label="Live preview"
        >
          <div
            className="tiny muted"
            style={{
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              marginBottom: 10,
            }}
          >
            Live preview
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 16,
              fontSize: 12.5,
              lineHeight: 1.65,
              color: "var(--t2)",
            }}
            aria-live="polite"
          >
            <b style={{ color: "var(--deep)", fontSize: 14 }}>Accessibility statement</b>
            <br />
            <br />
            <span>{brand || "Your brand"}</span> is committed to digital accessibility for people
            with disabilities. We aim to conform to <b>{target.replace(" (recommended)", "")}</b>
            {jurisdictions.length > 0 && (
              <>
                , in line with{" "}
                <b>{jurisdictions.map((j) => JURISDICTION_LABELS[j]).join(" and ")}</b>
              </>
            )}
            .
            <br />
            <br />
            Feedback:{" "}
            <span style={{ color: "var(--primary-hover)" }}>{contact || "your@email.com"}</span>
            <br />
            <br />
            <span className="tiny muted">
              Last reviewed {shortDate(record?.updatedAt ?? null)} · Monitored by a Makoya agent.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

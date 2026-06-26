"use client";
/**
 * app/dashboard/partners/_PartnersClient.tsx — v7 Partner program (CLIENT).
 *
 * Wired to:
 *   GET  /api/partner              → { partner: PartnerAccount|null, clients?, summary? }
 *   POST /api/partner/enroll       → role-gated, idempotent — enroll this org
 *   GET/PATCH /api/partner/white-label → cosmetic branding (URL + color hardened server-side)
 *
 * HARD RULES (plan § C12 + global constraints):
 *   - "14" client accounts  → data.summary?.clientCount ?? data.clients?.length (real)
 *   - "39" agents managed   → data.summary?.agentsManaged (real)
 *   - "$6.2k" revenue       → NEVER rendered; always $0 with honest note until Stripe
 *   - "Become a partner"    → real POST /api/partner/enroll
 *   - White-label form      → real PATCH /api/partner/white-label
 *   - Loading role=status / error role=alert / honest empty states
 */

import { useState, useEffect, useCallback } from "react";

/* ── API shapes (client-local; mirrors lib/partner.ts) ───────────────────────── */
interface PartnerAccount {
  id: string;
  orgId: string;
  status: "active" | "suspended";
  commissionRate: number;
  whiteLabelEnabled: boolean;
  createdAt: string;
}
interface PartnerClient {
  id: string;
  partnerId: string;
  clientOrgId: string;
  createdAt: string;
}
interface PartnerSummary {
  clientCount: number;
  agentsManaged: number;
  monthlyRevenueCents: number;
}
interface PartnerResponse {
  partner: PartnerAccount | null;
  clients?: PartnerClient[];
  summary?: PartnerSummary;
}
interface WhiteLabelConfig {
  partnerId: string;
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  supportEmail: string;
  hideMakoyaBranding: boolean;
  updatedAt: string;
}
interface WhiteLabelResponse {
  config: WhiteLabelConfig | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function num(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";
}
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const PARTNER_BENEFITS = [
  { icon: "ti-layout-grid", title: "One dashboard", sub: "Manage every client agent from a single login" },
  { icon: "ti-tag", title: "Partner pricing", sub: "Wholesale rates + bundled billing across clients" },
  { icon: "ti-brush", title: "White-label widget", sub: "Your branding on the widget and reports" },
  { icon: "ti-file-dollar", title: "Co-branded reports", sub: "Audit + proof-of-effort packs in your name" },
  { icon: "ti-cash", title: "Recurring commission", sub: "Earn on every client plan, every month" },
  { icon: "ti-headset", title: "Priority support", sub: "A dedicated partner success manager" },
];

/* ── Toggle helper ─────────────────────────────────────────────────────────── */
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
    />
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────────── */
export function PartnersClient() {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<PartnerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch("/api/partner", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<PartnerResponse>) : Promise.reject(r.status)))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) { setError(true); setLoading(false); } });
    return () => { live = false; };
  }, [reload]);

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Account <b>Partner program</b>
      </div>
      <p className="muted" style={{ margin: "-8px 0 18px", fontSize: 13.5 }}>
        Manage accessibility for clients at scale — for agencies and freelancers.
      </p>

      {loading && (
        <div role="status" aria-live="polite" style={{ padding: "40px 0", color: "var(--t3)", textAlign: "center" }}>
          Loading partner program…
        </div>
      )}
      {error && !loading && (
        <div className="note warn" role="alert">
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load the partner program — please try again shortly.</div>
        </div>
      )}
      {data && !data.partner && !loading && (
        <PartnerPitch onEnrolled={refresh} />
      )}
      {data && data.partner && !loading && (
        <PartnerDashboard
          partner={data.partner}
          clients={data.clients ?? []}
          summary={data.summary ?? null}
        />
      )}
    </>
  );
}

/* ── Partner pitch (not-yet enrolled) ────────────────────────────────────────── */
function PartnerPitch({ onEnrolled }: { onEnrolled: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function enroll() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/partner/enroll", { method: "POST", credentials: "same-origin" });
      if (res.status === 403) {
        setErr("Ask an owner or admin to enable the partner program for your account.");
        return;
      }
      if (!res.ok) {
        setErr("Couldn't enroll right now — try again shortly.");
        return;
      }
      onEnrolled();
    } catch {
      setErr("Network error — try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Benefits grid */}
      <div className="grid3" style={{ marginBottom: 18 }}>
        {PARTNER_BENEFITS.map((b) => (
          <section className="card cpad" key={b.title}>
            <div
              className="fav"
              style={{
                width: 38,
                height: 38,
                background: "var(--primary-soft)",
                color: "var(--primary-hover)",
                marginBottom: 10,
              }}
            >
              <i className={`ti ${b.icon}`} aria-hidden="true" />
            </div>
            <div style={{ fontWeight: 700, color: "var(--deep)", fontSize: 14 }}>{b.title}</div>
            <div className="tiny muted" style={{ marginTop: 3 }}>{b.sub}</div>
          </section>
        ))}
      </div>

      {/* CTA banner */}
      <div
        className="between"
        style={{
          marginTop: 18,
          background: "var(--deep)",
          borderRadius: "var(--r-lg)",
          padding: "20px 24px",
        }}
      >
        <div>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, fontFamily: "Satoshi" }}>
            Ready to resell Makoya?
          </div>
          <div style={{ color: "#aab6d6", fontSize: 13, marginTop: 2 }}>
            Apply to the partner program and onboard your first client agent today.
          </div>
        </div>
        <button
          className="btn"
          type="button"
          style={{ background: "#fff", borderColor: "#fff", color: "var(--primary-hover)" }}
          onClick={enroll}
          disabled={busy}
        >
          <i className="ti ti-arrow-right" aria-hidden="true" />{" "}
          {busy ? "Enrolling…" : "Become a partner"}
        </button>
      </div>

      {err && (
        <div className="note warn" role="alert" style={{ marginTop: 16 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{err}</div>
        </div>
      )}
    </>
  );
}

/* ── Partner dashboard (enrolled) ────────────────────────────────────────────── */
function PartnerDashboard({
  partner,
  clients,
  summary,
}: {
  partner: PartnerAccount;
  clients: PartnerClient[];
  summary: PartnerSummary | null;
}) {
  // Client count: prefer summary (accurate), fall back to clients array length
  const clientCount = summary?.clientCount ?? clients.length;
  const agentsManaged = summary?.agentsManaged ?? 0;
  // Revenue: always $0 until Stripe is connected — never render fake "$6.2k"
  const revenueCents = summary?.monthlyRevenueCents ?? 0;

  return (
    <>
      {/* KPI cards — REAL values */}
      <div className="grid3" style={{ marginBottom: 18 }}>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-users" aria-hidden="true" /> Client accounts
          </div>
          <div className="big">{num(clientCount)}</div>
        </div>
        <div className="mcard grn">
          <div className="l">
            <i className="ti ti-robot" aria-hidden="true" /> Agents managed
          </div>
          <div className="big">{num(agentsManaged)}</div>
        </div>
        <div className="mcard">
          <div className="l">
            <i className="ti ti-businessplan" aria-hidden="true" /> Monthly revenue
          </div>
          <div className="big" style={{ fontSize: 21, paddingTop: 10 }}>
            ${(revenueCents / 100).toLocaleString()}
          </div>
          <div className="d muted">
            {revenueCents === 0
              ? "Available once billing / Stripe is live"
              : "From active partner commissions"}
          </div>
        </div>
      </div>

      {/* White-label config */}
      <PartnerWhiteLabel partner={partner} />

      {/* Client list */}
      <div className="card cpad" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 14 }}>Client accounts</h3>
        <p className="tiny muted" style={{ marginTop: 2 }}>
          Organizations you manage under your partner account.
        </p>
        {clients.length === 0 ? (
          <div className="note info" style={{ marginTop: 12 }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <div>No client accounts linked yet. Once you onboard clients they&apos;ll appear here.</div>
          </div>
        ) : (
          <div className="tcard" style={{ marginTop: 12 }}>
            <div className="thead" style={{ gridTemplateColumns: "1fr 160px" }}>
              <div>Client organization</div>
              <div>Linked</div>
            </div>
            {clients.map((c) => (
              <div
                className="trow"
                key={c.id}
                style={{ gridTemplateColumns: "1fr 160px" }}
              >
                <div className="mono tiny">{c.clientOrgId}</div>
                <div className="tiny muted">{shortDate(c.createdAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ── White-label form ─────────────────────────────────────────────────────────── */
function PartnerWhiteLabel({ partner }: { partner: PartnerAccount }) {
  const [wlData, setWlData] = useState<WhiteLabelResponse | null>(null);
  const [wlLoading, setWlLoading] = useState(true);
  const [wlError, setWlError] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [hide, setHide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Only load if this partner has white-label enabled
  useEffect(() => {
    if (!partner.whiteLabelEnabled) {
      setWlLoading(false);
      return;
    }
    let live = true;
    fetch("/api/partner/white-label", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<WhiteLabelResponse>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setWlData(d);
        const c = d.config;
        if (c) {
          setBrandName(c.brandName ?? "");
          setLogoUrl(c.logoUrl ?? "");
          setPrimaryColor(c.primaryColor ?? "");
          setSupportEmail(c.supportEmail ?? "");
          setHide(c.hideMakoyaBranding ?? false);
        }
        setWlLoading(false);
      })
      .catch(() => { if (live) { setWlError(true); setWlLoading(false); } });
    return () => { live = false; };
  }, [partner.whiteLabelEnabled]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/partner/white-label", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName, logoUrl, primaryColor, supportEmail, hideMakoyaBranding: hide }),
      });
      if (res.status === 403) {
        setMsg({ ok: false, text: "Only owners and admins can edit branding." });
        return;
      }
      if (res.status === 400) {
        setMsg({ ok: false, text: "Check the logo URL (must be https), color (hex or rgb) and support email." });
        return;
      }
      if (!res.ok) {
        setMsg({ ok: false, text: "Couldn't save branding — try again." });
        return;
      }
      setMsg({ ok: true, text: "Branding saved." });
    } catch {
      setMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  if (!partner.whiteLabelEnabled) {
    return (
      <div className="note info">
        <i className="ti ti-brush" aria-hidden="true" />
        <div>
          White-label branding is available on partner plans.
          Contact us to enable it for your account.
        </div>
      </div>
    );
  }

  return (
    <div className="card cpad">
      <h3 style={{ fontSize: 14 }}>White-label branding</h3>
      <p className="tiny muted" style={{ marginTop: 2 }}>
        Cosmetic branding for the widget and reports — presentation only;
        it makes no accessibility-compliance claim.
      </p>
      {wlLoading && (
        <div role="status" aria-live="polite" style={{ padding: "14px 0", color: "var(--t3)" }}>
          Loading branding…
        </div>
      )}
      {wlError && !wlLoading && (
        <div className="note warn" role="alert" style={{ marginTop: 12 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>Couldn&apos;t load your branding — try again shortly.</div>
        </div>
      )}
      {!wlLoading && !wlError && (
        <form onSubmit={save} style={{ marginTop: 8, maxWidth: 560 }}>
          <label className="fl" htmlFor="wl-brand">Brand name</label>
          <input
            id="wl-brand"
            className="inp"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            maxLength={120}
            placeholder="Your agency"
          />
          <label className="fl" htmlFor="wl-logo">Logo URL</label>
          <input
            id="wl-logo"
            className="inp"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
          <label className="fl" htmlFor="wl-color">Primary color</label>
          <input
            id="wl-color"
            className="inp"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            placeholder="#1E63FF"
          />
          <label className="fl" htmlFor="wl-email">Support email</label>
          <input
            id="wl-email"
            className="inp"
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            placeholder="support@youragency.com"
          />
          <div
            className="between"
            style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "11px 13px", marginTop: 14 }}
          >
            <span style={{ fontSize: 13 }}>Hide &ldquo;Powered by Makoya&rdquo; branding</span>
            <Toggle
              on={hide}
              onToggle={() => setHide((v) => !v)}
              label={`Hide Makoya branding ${hide ? "on" : "off"}`}
            />
          </div>
          <button
            className="btn pri"
            type="submit"
            disabled={busy}
            style={{ marginTop: 16 }}
          >
            <i className="ti ti-check" aria-hidden="true" /> {busy ? "Saving…" : "Save branding"}
          </button>
          {msg && (
            <div
              className={`note ${msg.ok ? "good" : "warn"}`}
              role={msg.ok ? "status" : "alert"}
              style={{ marginTop: 12 }}
            >
              <i className={`ti ${msg.ok ? "ti-check" : "ti-alert-triangle"}`} aria-hidden="true" />
              <div>{msg.text}</div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

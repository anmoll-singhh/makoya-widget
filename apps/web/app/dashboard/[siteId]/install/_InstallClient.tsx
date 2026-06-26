"use client";
/**
 * app/dashboard/[siteId]/install/_InstallClient.tsx — v7 Install widget screen (CLIENT).
 *
 * Wired to:
 *   GET /api/sites/[siteId]/install-status → { status, lastSeenAt, firstSeenAt, pingCount }
 *
 * Real data replaces mockup values:
 *   - Snippet URL              → real siteId + server-minted token (prop from RSC)
 *   - Agent label              → real domain (prop from RSC)
 *   - Install status pill      → data.status from API
 *   - "Verify" description     → data.lastSeenAt, data.pingCount from API
 *   - "Send to developer"      → mailto link (honest, not fake "sent")
 *
 * Warning note verbatim from mockup:
 *   "The widget is a helper and a monitoring layer — it is not, by itself, legal
 *    compliance. Real conformance comes from Mike's audit plus human remediation.
 *    We track and estimate; we never auto-certify your site."
 *
 * Platform tiles are UI-only (no per-platform guides yet). Verify re-fetches
 * install-status on demand and reflects the real state.
 *
 * Token note: the token string is passed as a prop from the RSC page, which calls
 * mintSiteToken() server-side. It is never re-derived or stored client-side.
 */

import { useState, useEffect, useCallback } from "react";

/* ── API shape ───────────────────────────────────────────────────────────────── */
interface InstallStatusData {
  status: string;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  pingCount: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function shortDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function num(n: number): string {
  return n.toLocaleString();
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  active: { cls: "green", label: "Active" },
  monitoring: { cls: "low", label: "Monitoring" },
  action_needed: { cls: "high", label: "Action needed" },
  not_installed: { cls: "gray", label: "Not installed" },
};

const PLATFORMS: { label: string; icon: string }[] = [
  { label: "Direct HTML", icon: "ti-code" },
  { label: "WordPress", icon: "ti-brand-wordpress" },
  { label: "Shopify", icon: "ti-brand-shopify" },
  { label: "Wix", icon: "ti-square" },
  { label: "Squarespace", icon: "ti-brand-squarespace" },
  { label: "Webflow", icon: "ti-brand-webflow" },
];

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
  domain: string;
  token: string;
}

/* ── Main Component ──────────────────────────────────────────────────────────── */
export function InstallClient({ siteId, domain, token }: Props) {
  const [installStatus, setInstallStatus] = useState<InstallStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string>("Direct HTML");

  // The snippet carries siteId + token — matches how /v3/page.tsx builds it.
  const snippet = `<script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="${siteId}" data-token="${token}" defer></script>`;

  /* Fetch install status on mount */
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`/api/sites/${siteId}/install-status`, {
        credentials: "same-origin",
      });
      if (r.ok) {
        const d = (await r.json()) as InstallStatusData;
        setInstallStatus(d);
      }
    } catch {
      // Non-fatal: we show a fallback in the Verify section
    } finally {
      setStatusLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /* Copy snippet to clipboard */
  function handleCopy() {
    navigator.clipboard?.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  /* Verify: re-fetch install status */
  async function handleVerify() {
    setVerifying(true);
    setStatusLoading(true);
    await fetchStatus();
    setVerifying(false);
  }

  const pill =
    STATUS_PILL[installStatus?.status ?? "not_installed"] ?? STATUS_PILL.not_installed;
  const isInstalled =
    installStatus?.status === "active" || installStatus?.status === "monitoring";

  return (
    <>
      <div className="pagehead">
        Agent setup <b>Install widget</b>
      </div>

      <p
        className="muted"
        style={{ margin: "-4px 0 18px", maxWidth: 620 }}
      >
        Add the Makoya helper to your site so visitors get the accessibility toolbar and
        Mike can begin monitoring. Takes about 2 minutes.
      </p>

      {/* Compliance honesty note — verbatim from mockup */}
      <div className="note warn" style={{ marginBottom: 20, maxWidth: 900 }}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>
          The widget is a helper and a monitoring layer — it is not, by itself, legal
          compliance. Real conformance comes from Mike&apos;s audit plus human
          remediation. We track and estimate; we never auto-certify your site.
        </div>
      </div>

      {/* Step 1: Copy snippet */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 900 }}>
        <div className="ch">
          <h3>1 · Copy your install code</h3>
          <span className="cnt">Agent: {domain}</span>
        </div>
        <div className="cpad">
          <p className="muted tiny" style={{ margin: "0 0 12px" }}>
            Paste this just before the closing &lt;/body&gt; tag on every page you want
            monitored.
          </p>
          <div className="codebox">
            <span className="k">&lt;script </span>
            <span className="s">src=&quot;https://makoya-gamma.vercel.app/widget/loader.js&quot;</span>
            {" "}
            <span className="s">data-site=&quot;{siteId}&quot;</span>
            {" "}
            <span className="s">data-token=&quot;{token.slice(0, 12)}…&quot;</span>
            <span className="k"> defer&gt;&lt;/script&gt;</span>
          </div>
          <div
            className="between"
            style={{ marginTop: 14, gap: 10, justifyContent: "flex-start" }}
          >
            <button className="btn pri" type="button" onClick={handleCopy}>
              <i className="ti ti-copy" aria-hidden="true" />
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            <a
              className="btn ghost"
              href={`mailto:?subject=Makoya widget snippet for ${domain}&body=Paste this snippet just before the %3C%2Fbody%3E tag:%0A%0A${encodeURIComponent(snippet)}`}
              rel="noopener noreferrer"
            >
              <i className="ti ti-mail-forward" aria-hidden="true" />
              Send to developer
            </a>
          </div>
        </div>
      </section>

      {/* Step 2: Platform tiles */}
      <section className="card" style={{ marginBottom: 16, maxWidth: 900 }}>
        <div className="ch">
          <h3>2 · Pick your platform</h3>
          <span className="cnt">Step-by-step guide adjusts to your choice</span>
        </div>
        <div className="cpad">
          <div
            className="grid3"
            style={{
              gap: 12,
              gridTemplateColumns: "repeat(6, 1fr)",
            }}
          >
            {PLATFORMS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`ptile ${activePlatform === p.label ? "act" : ""}`}
                onClick={() => setActivePlatform(p.label)}
                aria-pressed={activePlatform === p.label}
                style={{ width: "100%", cursor: "pointer", background: "none", border: "1px solid var(--border)", fontFamily: "inherit" }}
              >
                <div className="pi">
                  <i className={`ti ${p.icon}`} aria-hidden="true" />
                </div>
                <div className="tiny" style={{ fontWeight: 600, marginTop: 4 }}>
                  {p.label}
                </div>
              </button>
            ))}
          </div>

          {/* Step guide based on selected platform */}
          <div
            style={{
              marginTop: 16,
              background: "var(--bg)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--deep)", marginBottom: 8 }}>
              {activePlatform} setup
            </div>
            {activePlatform === "Direct HTML" && (
              <ol style={{ paddingLeft: 18, fontSize: 13, color: "var(--t2)", lineHeight: 1.8 }}>
                <li>Open the HTML file(s) for your site.</li>
                <li>Find the closing <code style={{ background: "var(--border)", padding: "1px 4px", borderRadius: 4 }}>&lt;/body&gt;</code> tag.</li>
                <li>Paste the snippet above just before it.</li>
                <li>Save and publish your changes.</li>
                <li>Click &ldquo;Verify&rdquo; below to confirm.</li>
              </ol>
            )}
            {activePlatform === "WordPress" && (
              <ol style={{ paddingLeft: 18, fontSize: 13, color: "var(--t2)", lineHeight: 1.8 }}>
                <li>In WordPress Admin, go to <b>Appearance → Theme Editor</b> (or use a plugin like <b>Insert Headers and Footers</b>).</li>
                <li>Find <code style={{ background: "var(--border)", padding: "1px 4px", borderRadius: 4 }}>footer.php</code> or the &ldquo;Footer scripts&rdquo; field.</li>
                <li>Paste the snippet above.</li>
                <li>Save. The widget now loads on all pages.</li>
              </ol>
            )}
            {activePlatform === "Shopify" && (
              <ol style={{ paddingLeft: 18, fontSize: 13, color: "var(--t2)", lineHeight: 1.8 }}>
                <li>In Shopify Admin, go to <b>Online Store → Themes → Edit code</b>.</li>
                <li>Open <code style={{ background: "var(--border)", padding: "1px 4px", borderRadius: 4 }}>theme.liquid</code>.</li>
                <li>Find the closing <code style={{ background: "var(--border)", padding: "1px 4px", borderRadius: 4 }}>&lt;/body&gt;</code> tag and paste the snippet just before it.</li>
                <li>Save. Widget loads on your storefront.</li>
              </ol>
            )}
            {(activePlatform === "Wix" ||
              activePlatform === "Squarespace" ||
              activePlatform === "Webflow") && (
              <ol style={{ paddingLeft: 18, fontSize: 13, color: "var(--t2)", lineHeight: 1.8 }}>
                <li>In your {activePlatform} dashboard, look for <b>Settings → Custom Code</b> or <b>Site Integrations</b>.</li>
                <li>Add the snippet to the &ldquo;Body — end&rdquo; or &ldquo;Before &lt;/body&gt;&rdquo; section.</li>
                <li>Publish your site.</li>
                <li>Click &ldquo;Verify&rdquo; below to confirm it loaded.</li>
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* Step 3: Verify */}
      <section className="card" style={{ maxWidth: 900 }}>
        <div className="ch">
          <h3>3 · Verify installation</h3>
        </div>
        <div className="cpad">
          <div className="between">
            <div style={{ maxWidth: 440 }}>
              <div style={{ fontWeight: 700, color: "var(--deep)" }}>
                Confirm the widget is live
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>
                {statusLoading
                  ? "Checking install status…"
                  : isInstalled
                  ? `Live on ${domain} — last seen ${shortDate(installStatus?.lastSeenAt ?? null)}${
                      installStatus && installStatus.pingCount > 0
                        ? ` · ${num(installStatus.pingCount)} ping${installStatus.pingCount === 1 ? "" : "s"}`
                        : ""
                    }`
                  : `We'll check that the loader is responding on ${domain}. Once verified, Mike starts the first monitoring scan automatically.`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {!statusLoading && (
                <span className={`pill ${pill.cls}`}>
                  {isInstalled && (
                    <i className="ti ti-circle-check" aria-hidden="true" />
                  )}
                  {!isInstalled && installStatus?.status === "action_needed" && (
                    <i className="ti ti-alert-triangle" aria-hidden="true" />
                  )}
                  {pill.label}
                </span>
              )}
              <button
                className="btn pri"
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                aria-busy={verifying}
              >
                <i className="ti ti-circle-check" aria-hidden="true" />
                {verifying ? "Checking…" : "Verify"}
              </button>
            </div>
          </div>

          {/* Already installed: show first-seen date */}
          {isInstalled && installStatus?.firstSeenAt && (
            <div className="note good" style={{ marginTop: 14 }}>
              <i className="ti ti-check" aria-hidden="true" />
              <div>
                Widget confirmed on {domain} since{" "}
                <b>{shortDate(installStatus.firstSeenAt)}</b>. Mike is actively
                monitoring.
              </div>
            </div>
          )}

          {/* Not installed hint */}
          {!statusLoading && !isInstalled && (
            <div className="note info" style={{ marginTop: 14 }}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <div>
                Copy the snippet above, paste it before <code style={{ background: "rgba(30,99,255,.08)", padding: "1px 4px", borderRadius: 4 }}>&lt;/body&gt;</code> on your site, then click Verify. It usually takes a few seconds after publishing.
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

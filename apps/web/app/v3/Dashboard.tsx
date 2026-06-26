"use client";
/**
 * app/v3/Dashboard.tsx — the v3.1 dashboard UI (CLIENT component).
 *
 * A faithful React port of docs/makoya_v3.1.html: the same sidebar + screen
 * switching (the mockup's `show()` pattern becomes React state), the same markup
 * and the (scoped) styles from ./v3.css. The hard-coded mockup numbers are
 * replaced with REAL data fetched from the authed `/api/sites/[siteId]/*`
 * endpoints — same-origin fetch forwards the session cookie, so RLS scopes every
 * read to the signed-in owner.
 *
 * Resilience: each screen has a loading / error / empty state and never throws —
 * a failed endpoint degrades to "—" rather than crashing the page (mirrors the
 * widget's never-break philosophy). Data is cached per-URL so switching screens
 * doesn't refetch.
 *
 * Wiring map:
 *   Overview   → /overview          Audit      → /issues
 *   Analytics  → /analytics?days=30 Reports    → /reports
 *   Proof      → /proof-pack        Billing    → /billing
 *   Statement  → /statement         Settings   → /settings + /config
 *   Customize  → /config            Install    → snippet + /install-status
 *   Agents     → /overview (single-site roll-up)
 *
 * Account and Partners are wired to the org/team/partner tenancy APIs (which are
 * authed + same-origin, so the session cookie scopes every read via RLS):
 *   Account  → /api/org · /api/team (+POST invite) · /api/org/api-keys (CRUD)
 *   Partners → /api/partner · /api/partner/white-label (GET/PATCH) ·
 *              /api/partner/enroll (POST)
 * Both follow the same loading / error / empty discipline as the screens above,
 * and the one-time secrets these endpoints return (invite tokens, raw API keys)
 * are shown exactly once with a copy button and never persisted client-side.
 */
import { useEffect, useState } from "react";

/* ──────────────────────────────────────────────────────────────────────────
 * API response shapes (mirrors of the server lib types; kept local so this
 * client file never imports server-only modules).
 * ──────────────────────────────────────────────────────────────────────── */
interface CoverageEntry {
  framework: string;
  pct: number;
}
interface ActivityEntry {
  id: string;
  actor: string;
  type: string;
  summary: string;
  wcagRef: string | null;
  createdAt: string;
}
interface OverviewData {
  score: number | null;
  scoreDelta: number | null;
  status: string;
  streakDays: number;
  openIssues: number;
  needsHuman: number;
  issuesResolvedThisMonth: number;
  widgetOpens: number;
  coverage: CoverageEntry[];
  trend: { period: string; score: number | null }[];
  activity: ActivityEntry[];
}
interface IssueRecord {
  id: string;
  ruleId: string;
  wcagCriterion: string | null;
  framework: string;
  title: string;
  status: "failing" | "needs_review" | "passing";
  checksPassing: number;
  checksTotal: number;
}
type GroupedIssues = Record<"failing" | "needs_review" | "passing", IssueRecord[]>;
interface WidgetAnalytics {
  opens: number;
  featureActivations: number;
  mostUsed: { featureKey: string; count: number } | null;
  opensOverTime: { day: string; count: number }[];
  usageByFeature: { featureKey: string; count: number }[];
}
interface MonthlyReport {
  period: string;
  score: number | null;
  issuesFound: number;
  issuesResolved: number;
  pdfUrl: string | null;
}
interface ProofPack {
  auditHistory: { count: number; latestScore: number | null; latestOn: string | null };
  remediationCount: number;
  statementPublished: boolean;
  install: { daysInstalled: number; firstSeenOn: string | null };
  vpat: { id: string; title: string; generatedOn: string | null }[];
  manualAudits: { id: string; auditor: string; performedOn: string | null }[];
}
interface Plan {
  slug: string;
  name: string;
  tagline: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  visitLimit: number | null;
  highlighted: boolean;
  badge: string | null;
  ctaLabel: string;
  features: { text: string }[];
}
interface BillingData {
  subscription: { planSlug: string; period: string; status: string; renewsAt: string | null };
  quota: { slug: string; visitLimit: number | null } | null;
  usage: { used: number; limit: number | null; exceeded: boolean; unlimited: boolean } | null;
  catalog: {
    plans: Plan[];
    defaultPeriod: string;
    yearlySavingHeadline: number;
    footnote: string;
  };
}
interface StatementRecord {
  brandName: string;
  jurisdictions: string[];
  conformanceTarget: string;
  contactEmail: string;
  html: string;
  updatedAt: string;
}
interface SiteSettings {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}
interface SiteConfig {
  primaryColor: string;
  featuresEnabled: string[];
  customTriggerSelector: string;
  defaultLanguage: string;
  domObserverEnabled: boolean;
  inheritFonts: boolean;
  mobileEnabled: boolean;
}
interface InstallStatusData {
  status: string;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  pingCount: number;
}

/* ── Account / org-tenancy shapes (mirror lib/org.ts; secrets never present) ── */
type OrgRole = "owner" | "admin" | "developer";
interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}
interface TeamMember {
  id: string;
  orgId: string;
  userId: string | null;
  email: string;
  role: OrgRole;
  createdAt: string;
}
interface TeamInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  invitedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
}
interface ApiKeyRecord {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
interface OrgResponse {
  org: Organization;
  role: OrgRole;
}
interface TeamResponse {
  team: TeamMember[];
  invites?: TeamInvite[];
}
interface ApiKeysResponse {
  keys: ApiKeyRecord[];
}

/* ── Partner program shapes (mirror lib/partner.ts) ─────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────────────────
 * Tiny same-origin fetch hook with a per-URL module cache.
 * ──────────────────────────────────────────────────────────────────────── */
const cache = new Map<string, unknown>();

type AsyncState<T> = { loading: boolean; error: boolean; data: T | null };

/**
 * Same-origin GET hook with a per-URL cache. `reloadKey` is additive: when it is
 * 0 (the default for every existing caller) the cached value is reused; bumping
 * it past 0 busts the cache and forces a fresh fetch, which the Account/Partners
 * screens use to re-read a list after a mutation (invite, key, enroll, …).
 */
function useApi<T>(url: string, reloadKey = 0): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>(() =>
    reloadKey === 0 && cache.has(url)
      ? { loading: false, error: false, data: cache.get(url) as T }
      : { loading: true, error: false, data: null }
  );

  useEffect(() => {
    if (reloadKey === 0 && cache.has(url)) {
      setState({ loading: false, error: false, data: cache.get(url) as T });
      return;
    }
    let live = true;
    setState({ loading: true, error: false, data: null });
    fetch(url, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        cache.set(url, d);
        setState({ loading: false, error: false, data: d });
      })
      .catch(() => {
        if (live) setState({ loading: false, error: true, data: null });
      });
    return () => {
      live = false;
    };
  }, [url, reloadKey]);

  return state;
}

/** Owner/admin can manage the team + API keys (mirrors lib/roles.ts canManageTeam). */
function canManageTeam(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Two-letter initials for an avatar, derived from an email/name. */
function initials(s: string): string {
  const at = s.split("@")[0] ?? "";
  const parts = at.split(/[.\-_+\s]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? s[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

const ROLE_PILL: Record<OrgRole, string> = {
  owner: "p-blue",
  admin: "p-green",
  developer: "p-gray",
};

/* ── small presentational helpers ─────────────────────────────────────────── */
function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="v3-state" role="status">
      <span className="v3-spin" aria-hidden /> {label}
    </div>
  );
}
function Failed({ label = "Couldn't load this — try again shortly." }: { label?: string }) {
  return (
    <div className="note warn" role="alert">
      <i className="ti ti-alert-triangle" aria-hidden />
      <div>{label}</div>
    </div>
  );
}
/**
 * Shows a one-time secret (an invite link/token or a raw API key) in a code box
 * with a copy button. The value lives only in this component's props for as long
 * as the panel is open — it is never written to the per-URL cache or refetched,
 * because the server returns these exactly once by design.
 */
function CopyField({ value, copyLabel = "Copy" }: { value: string; copyLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="codebox" style={{ wordBreak: "break-all" }}>{value}</div>
      <button
        className="btn pri"
        type="button"
        style={{ marginTop: 10 }}
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
      >
        <i className="ti ti-copy" aria-hidden /> {copied ? "Copied!" : copyLabel}
      </button>
    </div>
  );
}
function num(n: number | null | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toLocaleString() : "—";
}
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function monthLabel(period: string): string {
  // period is "YYYY-MM"
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return shortDate(iso);
}
/** stroke-dashoffset for a ring of total `dash`, filled to `pct` (0..1). */
function ringOffset(pct: number, dash: number): number {
  return Math.max(0, Math.min(1, 1 - pct)) * dash;
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  active: { cls: "p-green", label: "Active" },
  monitoring: { cls: "p-blue", label: "Monitoring" },
  action_needed: { cls: "p-red", label: "Action needed" },
  not_installed: { cls: "p-gray", label: "Not installed" },
};

const FEATURE_META: Record<string, { label: string; icon: string }> = {
  textSize: { label: "Bigger text", icon: "ti-zoom-in" },
  lineSpacing: { label: "Line & letter spacing", icon: "ti-line-height" },
  contrast: { label: "Contrast modes", icon: "ti-contrast" },
  stopMotion: { label: "Stop animations", icon: "ti-player-pause" },
  readingRuler: { label: "Reading ruler", icon: "ti-ruler-2" },
  highlightLinks: { label: "Highlight links", icon: "ti-link" },
  bigCursor: { label: "Big cursor", icon: "ti-pointer" },
  readableFont: { label: "Readable & dyslexic fonts", icon: "ti-letter-case" },
  hideImages: { label: "Hide images", icon: "ti-photo-off" },
  saturation: { label: "Saturation", icon: "ti-color-swatch" },
  readingMask: { label: "Reading mask", icon: "ti-layout-navbar" },
  highlightTitles: { label: "Highlight titles", icon: "ti-heading" },
  textAlign: { label: "Text align", icon: "ti-align-left" },
  muteSounds: { label: "Mute sounds", icon: "ti-volume-off" },
  readAloud: { label: "Read page aloud", icon: "ti-volume" },
};
function featureMeta(key: string): { label: string; icon: string } {
  return FEATURE_META[key] ?? { label: key, icon: "ti-circle" };
}

/* ── navigation model ─────────────────────────────────────────────────────── */
type ScreenId =
  | "overview"
  | "agents"
  | "audit"
  | "install"
  | "customize"
  | "statement"
  | "proof"
  | "reports"
  | "analytics"
  | "billing"
  | "settings"
  | "account"
  | "partners";

interface Props {
  siteId: string;
  domain: string;
  token: string;
  accountEmail: string;
}

export function Dashboard({ siteId, domain, token, accountEmail }: Props) {
  const [screen, setScreen] = useState<ScreenId>("overview");
  const base = `/api/sites/${siteId}`;

  const nav = (id: ScreenId, icon: string, label: string) => (
    <button
      type="button"
      className={screen === id ? "on" : ""}
      aria-current={screen === id ? "page" : undefined}
      onClick={() => {
        setScreen(id);
        window.scrollTo(0, 0);
      }}
    >
      <i className={`ti ${icon}`} aria-hidden /> {label}
    </button>
  );

  return (
    <div className="v3app">
      <div className="app">
        {/* ── sidebar ───────────────────────────────────────────────────── */}
        <aside className="side">
          <div className="brand">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden>
              <path d="M16 2.5L27.7 9.2L27.7 22.8L16 29.5L4.3 22.8L4.3 9.2Z" stroke="#0D1B4D" strokeWidth="2" />
              <path d="M14 11L9 16L14 21" stroke="#0D1B4D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 11L23 16L18 21" stroke="#1E63FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Makoya
          </div>
          <div className="sbar"><i className="ti ti-search" style={{ fontSize: 15 }} aria-hidden /> Search <span className="k">⌘K</span></div>
          <nav className="nav" aria-label="Main">
            {nav("overview", "ti-layout-dashboard", "Dashboard")}
            {nav("agents", "ti-stack-2", "Agents")}
          </nav>
          <div className="glabel"><i className="ti ti-shield-check" style={{ fontSize: 13 }} aria-hidden /> Compliance</div>
          <nav className="nav" aria-label="Compliance">
            {nav("audit", "ti-robot", "Mike — audit")}
            {nav("install", "ti-code", "Install widget")}
            {nav("customize", "ti-adjustments", "Customize widget")}
            {nav("statement", "ti-certificate", "Statement")}
            {nav("proof", "ti-shield-check", "Proof of effort")}
          </nav>
          <div className="glabel"><i className="ti ti-activity" style={{ fontSize: 13 }} aria-hidden /> Monitoring</div>
          <nav className="nav" aria-label="Monitoring">
            {nav("reports", "ti-file-description", "Reports")}
            {nav("analytics", "ti-chart-bar", "Analytics")}
          </nav>
          <div className="glabel"><i className="ti ti-building" style={{ fontSize: 13 }} aria-hidden /> Account</div>
          <nav className="nav" aria-label="Account">
            {nav("billing", "ti-credit-card", "Plan & billing")}
            {nav("settings", "ti-settings", "Agent settings")}
            {nav("account", "ti-users", "Account")}
            {nav("partners", "ti-affiliate", "Partners")}
          </nav>
          <div className="foot">
            <a><i className="ti ti-help" aria-hidden /> Help &amp; docs</a>
            <a><i className="ti ti-activity-heartbeat" aria-hidden /> System status</a>
          </div>
        </aside>

        {/* ── main ──────────────────────────────────────────────────────── */}
        <main className="main">
          <div className="glow" aria-hidden />
          <div className="wrap">
            <div className="topc">
              <div className="agentpill"><span className="dot" aria-hidden /> {domain}</div>
              <button className="tibtn" type="button" aria-label="Notifications"><i className="ti ti-bell" aria-hidden /></button>
              <div className="av" style={{ width: 34, height: 34, background: "var(--blue-bg)", color: "var(--blue-d)", fontSize: 12, boxShadow: "var(--sh-sm)", border: "1px solid var(--line)" }}>
                {(accountEmail[0] ?? "?").toUpperCase()}
              </div>
            </div>

            {screen === "overview" && <OverviewScreen base={base} domain={domain} />}
            {screen === "agents" && <AgentsScreen base={base} domain={domain} />}
            {screen === "audit" && <AuditScreen base={base} />}
            {screen === "install" && <InstallScreen base={base} siteId={siteId} token={token} />}
            {screen === "customize" && <CustomizeScreen base={base} />}
            {screen === "statement" && <StatementScreen base={base} domain={domain} email={accountEmail} />}
            {screen === "proof" && <ProofScreen base={base} />}
            {screen === "reports" && <ReportsScreen base={base} />}
            {screen === "analytics" && <AnalyticsScreen base={base} />}
            {screen === "billing" && <BillingScreen base={base} />}
            {screen === "settings" && <SettingsScreen base={base} />}
            {screen === "account" && <AccountScreen domain={domain} email={accountEmail} />}
            {screen === "partners" && <PartnersScreen />}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * OVERVIEW
 * ════════════════════════════════════════════════════════════════════════ */
function OverviewScreen({ base, domain }: { base: string; domain: string }) {
  const { loading, error, data } = useApi<OverviewData>(`${base}/overview`);

  if (loading) return <Loading />;
  if (error || !data) return <Failed />;

  const score = data.score;
  const gaugeOffset = ringOffset((score ?? 0) / 100, 98);
  const delta = data.scoreDelta;

  return (
    <section className="screen on">
      <div className="hero glass" style={{ gap: 26, padding: "24px 28px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span className="pill p-green tiny"><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> Monitoring live</span>
            <span className="tiny muted"><i className="ti ti-flame" style={{ fontSize: 13, verticalAlign: -2, color: "var(--amber)" }} aria-hidden /> {data.streakDays}-day streak</span>
          </div>
          <div style={{ fontFamily: "'Satoshi'", fontSize: 25, fontWeight: 700, letterSpacing: "-.02em", color: "var(--ink)" }}>
            {score == null ? "No score yet" : score >= 90 ? "You're AA-ready" : `You're ${Math.max(0, 90 - score)} points from AA-ready`}
          </div>
          <div className="muted" style={{ fontSize: 13.5, margin: "7px 0 16px", maxWidth: 460 }}>
            Live monitoring on {domain}. {data.needsHuman} issue{data.needsHuman === 1 ? "" : "s"} need human review to keep your score climbing.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn pri" type="button"><i className="ti ti-robot" aria-hidden /> Review with Mike</button>
            <button className="btn" type="button"><i className="ti ti-file-text" aria-hidden /> View report</button>
          </div>
          <div className="journey">
            <div className="j" style={{ color: "var(--green)" }}><i className="ti ti-circle-check" aria-hidden /> Level A</div>
            <i className="ti ti-chevron-right" style={{ color: "var(--t3)", fontSize: 15 }} aria-hidden />
            <div className="j"><span>AA</span><div className="jbar"><span style={{ display: "block", height: "100%", width: `${Math.min(100, score ?? 0)}%`, background: "linear-gradient(90deg,var(--blue),var(--green))" }} /></div><span style={{ color: "var(--blue-d)" }}>{score == null ? "—" : `${score}%`}</span></div>
            <i className="ti ti-chevron-right" style={{ color: "var(--t3)", fontSize: 15 }} aria-hidden />
            <div className="j" style={{ color: "var(--t3)" }}>AAA</div>
          </div>
        </div>
        <div className="gauge">
          <svg width="168" height="168" viewBox="0 0 36 36" aria-hidden>
            <defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E63FF" /><stop offset="1" stopColor="#2F8F62" /></linearGradient></defs>
            <circle cx="18" cy="18" r="15.6" fill="none" stroke="#E7EAF1" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.6" fill="none" stroke="url(#gg)" strokeWidth="3" strokeLinecap="round" strokeDasharray="98" strokeDashoffset={gaugeOffset} transform="rotate(-90 18 18)" />
          </svg>
          <div className="ctr">
            <div className="n">{score ?? "—"}</div>
            <div className="u">/ 100 · WCAG AA</div>
            {delta != null && (
              <span className={`pill tiny ${delta >= 0 ? "p-green" : "p-red"}`} style={{ marginTop: 9 }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} this month</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid4" style={{ marginBottom: 18 }}>
        <div className="mcard grn">
          <div className="between"><div className="l"><i className="ti ti-checks" aria-hidden /> Issues resolved</div><span className="pill p-green tiny">this month</span></div>
          <div className="big">{num(data.issuesResolvedThisMonth)}</div>
        </div>
        <div className="mcard">
          <div className="between"><div className="l"><i className="ti ti-alert-triangle" aria-hidden /> Open issues</div></div>
          <div className="big">{num(data.openIssues)}</div>
        </div>
        <div className="mcard">
          <div className="between"><div className="l"><i className="ti ti-user-cog" aria-hidden /> Needs human</div><span className="pill p-amber tiny">action</span></div>
          <div className="big">{num(data.needsHuman)}</div>
          <div className="d muted" style={{ marginTop: 7 }}>Routes to remediation</div>
        </div>
        <div className="mcard grn">
          <div className="between"><div className="l"><i className="ti ti-click" aria-hidden /> Widget opens</div><span className="pill p-green tiny">30d</span></div>
          <div className="big">{num(data.widgetOpens)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 18, marginBottom: 18 }}>
        <div className="card pad">
          <div className="between" style={{ marginBottom: 3 }}><b style={{ fontSize: 14 }}>Compliance trend</b><span className="tiny" style={{ color: "var(--green)", fontWeight: 600 }}>Target 90 · AA-ready</span></div>
          <div className="muted tiny" style={{ marginBottom: 10 }}>Monthly · estimated WCAG 2.1 AA</div>
          <TrendChart trend={data.trend} />
          <div className="months">{data.trend.length === 0 ? <span>No history yet</span> : data.trend.map((t) => <span key={t.period}>{t.period.slice(5)}</span>)}</div>
        </div>
        <div className="card pad" style={{ display: "flex", flexDirection: "column" }}>
          <div className="between" style={{ marginBottom: 10 }}><b style={{ fontSize: 14 }}>Next best action</b><span className="pill p-amber tiny">Hit 90</span></div>
          <div style={{ fontFamily: "'Satoshi'", fontSize: 23, fontWeight: 700, color: "var(--ink)", letterSpacing: "-.02em" }}>{num(data.needsHuman)} issues</div>
          <div className="muted" style={{ fontSize: 13, margin: "4px 0 14px" }}>need human judgment — alt text, link purpose, custom widgets. These can&apos;t be auto-fixed.</div>
          <button className="btn pri" type="button" style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}><i className="ti ti-arrow-right" aria-hidden /> Get remediation quote</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="card">
          <div className="pad between" style={{ borderBottom: "1px solid var(--line)" }}><b style={{ fontSize: 14 }}>Recent activity</b></div>
          <div className="pad feed" style={{ padding: "6px 20px 14px" }}>
            {data.activity.length === 0 && <div className="muted tiny" style={{ padding: "14px 0" }}>No activity recorded yet.</div>}
            {data.activity.map((a) => {
              const isResolve = /resolv/i.test(a.type);
              const isFound = /found|issue/i.test(a.type) && !isResolve;
              const ic = isResolve
                ? { bg: "var(--green-bg)", c: "var(--green)", i: "ti-check" }
                : isFound
                ? { bg: "var(--amber-bg)", c: "var(--amber)", i: "ti-alert-triangle" }
                : { bg: "var(--blue-bg)", c: "var(--blue-d)", i: "ti-robot" };
              return (
                <div className="it" key={a.id}>
                  <div className="ic" style={{ background: ic.bg, color: ic.c }}><i className={`ti ${ic.i}`} aria-hidden /></div>
                  <div>
                    <div className="tx">{a.summary}</div>
                    <div className="tm">{a.wcagRef ? `${a.wcagRef} · ` : ""}{relTime(a.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card pad">
          <b style={{ fontSize: 14 }}>Coverage by framework</b>
          <div style={{ marginTop: 12 }}>
            {data.coverage.length === 0 && <div className="muted tiny">No coverage data yet.</div>}
            {data.coverage.map((c) => (
              <div className="fwrow" key={c.framework}>
                <span className="lab">{c.framework.toUpperCase()}</span>
                <div className="track"><span style={{ display: "block", height: "100%", width: `${c.pct}%`, background: c.pct >= 75 ? "var(--blue)" : "var(--green)" }} /></div>
                <span className="val">{c.pct}%</span>
              </div>
            ))}
          </div>
          <div className="note info" style={{ marginTop: 14, fontSize: 12 }}><i className="ti ti-info-circle" style={{ fontSize: 16 }} aria-hidden /><div>Coverage is the share of tracked checks currently passing — estimates from automated checks, not a compliance guarantee.</div></div>
        </div>
      </div>
    </section>
  );
}

function TrendChart({ trend }: { trend: { period: string; score: number | null }[] }) {
  const points = trend.filter((t) => t.score != null) as { period: string; score: number }[];
  if (points.length < 2) {
    return <div className="muted tiny" style={{ padding: "30px 0" }}>Not enough history to chart a trend yet.</div>;
  }
  const w = 600;
  const h = 160;
  const max = 100;
  const step = points.length > 1 ? w / (points.length - 1) : w;
  const coords = points.map((p, i) => {
    const x = i * step;
    const y = h - (p.score / max) * (h - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `${coords.join(" ")} ${w},${h} 0,${h}`;
  const last = coords[coords.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${w} 180`} style={{ width: "100%", height: 172, display: "block" }} aria-hidden>
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1E63FF" stopOpacity="0.16" /><stop offset="1" stopColor="#1E63FF" stopOpacity="0" /></linearGradient></defs>
      <line x1="0" y1={h - (90 / max) * (h - 20) - 10} x2={w} y2={h - (90 / max) * (h - 20) - 10} stroke="#2F8F62" strokeWidth="1.5" strokeDasharray="5 6" />
      <polygon points={area} fill="url(#area)" />
      <polyline fill="none" stroke="#1E63FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={coords.join(" ")} />
      <circle cx={last[0]} cy={last[1]} r="5" fill="#1E63FF" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * AGENTS (single-site roll-up using the overview endpoint)
 * ════════════════════════════════════════════════════════════════════════ */
function AgentsScreen({ base, domain }: { base: string; domain: string }) {
  const { loading, error, data } = useApi<OverviewData>(`${base}/overview`);
  const score = data?.score ?? null;
  const pill = STATUS_PILL[data?.status ?? "monitoring"] ?? STATUS_PILL.monitoring;

  return (
    <section className="screen on">
      <div className="between" style={{ marginBottom: 16 }}><div className="h1">Agents</div></div>
      <div className="grid4" style={{ marginBottom: 18 }}>
        <div className="mcard"><div className="l"><i className="ti ti-stack-2" aria-hidden /> Total agents</div><div className="big">1</div></div>
        <div className="mcard grn"><div className="l"><i className="ti ti-gauge" aria-hidden /> Avg. score</div><div className="big">{score ?? "—"}<span style={{ fontSize: 15, color: "var(--t3)" }}>/100</span></div></div>
        <div className="mcard"><div className="l"><i className="ti ti-alert-triangle" aria-hidden /> Open issues</div><div className="big">{loading ? "…" : num(data?.openIssues)}</div></div>
        <div className="mcard"><div className="l"><i className="ti ti-user-cog" aria-hidden /> Needs human</div><div className="big">{loading ? "…" : num(data?.needsHuman)}</div></div>
      </div>
      {error && <Failed />}
      <div className="tcard">
        <div className="thead" style={{ gridTemplateColumns: "1fr 150px 150px 120px" }}><div>Agent</div><div>Status</div><div>Compliance score</div><div>Open issues</div></div>
        <div className="trow" style={{ gridTemplateColumns: "1fr 150px 150px 120px" }}>
          <div className="sitecell"><div className="fav" style={{ background: "#1E63FF" }}><i className="ti ti-world" aria-hidden /></div><div><div className="cname">{domain}</div><div className="csub">Monitored agent</div></div></div>
          <div><span className={`pill ${pill.cls}`}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} /> {pill.label}</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}><div className="bar"><span style={{ width: `${score ?? 0}%`, background: (score ?? 0) >= 75 ? "var(--green)" : (score ?? 0) >= 50 ? "var(--amber)" : "var(--red)" }} /></div><b>{score ?? "—"}</b></div>
          <div className="tiny muted">{loading ? "…" : num(data?.openIssues)}</div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * AUDIT / ISSUES
 * ════════════════════════════════════════════════════════════════════════ */
function AuditScreen({ base }: { base: string }) {
  const { loading, error, data } = useApi<GroupedIssues>(`${base}/issues`);
  const [filter, setFilter] = useState<"all" | "failing" | "needs_review" | "passing">("all");

  if (loading) return <><div className="h1">Accessibility overview</div><Loading /></>;
  if (error || !data) return <><div className="h1">Accessibility overview</div><Failed /></>;

  const counts = {
    failing: data.failing.length,
    needs_review: data.needs_review.length,
    passing: data.passing.length,
  };
  const total = counts.failing + counts.needs_review + counts.passing;
  const passPct = total > 0 ? Math.round((counts.passing / total) * 100) : 0;

  const groups: { key: "failing" | "needs_review" | "passing"; label: string; icon: string; color: string; pill: string }[] = [
    { key: "failing", label: "Failing", icon: "ti-x", color: "var(--red)", pill: "p-red" },
    { key: "needs_review", label: "Needs review", icon: "ti-flag", color: "var(--amber)", pill: "p-amber" },
    { key: "passing", label: "Passing", icon: "ti-checks", color: "var(--green)", pill: "p-green" },
  ];
  const visible = groups.filter((g) => filter === "all" || filter === g.key);

  return (
    <section className="screen on">
      <div className="h1">Accessibility overview</div>
      <div className="stats">
        <div className="stat"><div className="lab">Passing checks</div><div className="v">
          <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden><circle cx="18" cy="18" r="15" fill="none" stroke="#E7EAF1" strokeWidth="5" /><circle cx="18" cy="18" r="15" fill="none" stroke="#2F8F62" strokeWidth="5" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset={ringOffset(passPct / 100, 94.2)} transform="rotate(-90 18 18)" /></svg>
          {passPct}% <small>· {counts.passing}/{total}</small></div></div>
        <div className="stat"><div className="lab">Failing</div><div className="v">{counts.failing} <small>issues</small></div></div>
        <div className="stat"><div className="lab">Needs review</div><div className="v">{counts.needs_review}<small> issues</small></div></div>
      </div>
      <div className="chips" role="tablist" aria-label="Issue filter">
        <button type="button" className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All issues</button>
        <button type="button" className={`chip ${filter === "failing" ? "on" : ""}`} onClick={() => setFilter("failing")}><i className="ti ti-x" style={{ color: "var(--red)" }} aria-hidden /> Failing <span className="n">{counts.failing}</span></button>
        <button type="button" className={`chip ${filter === "needs_review" ? "on" : ""}`} onClick={() => setFilter("needs_review")}><i className="ti ti-flag" style={{ color: "var(--amber)" }} aria-hidden /> Needs review <span className="n">{counts.needs_review}</span></button>
        <button type="button" className={`chip ${filter === "passing" ? "on" : ""}`} onClick={() => setFilter("passing")}><i className="ti ti-checks" style={{ color: "var(--green)" }} aria-hidden /> Passing <span className="n">{counts.passing}</span></button>
      </div>

      {total === 0 ? (
        <div className="note info"><i className="ti ti-info-circle" aria-hidden /><div>No tracked issues yet — they appear here after the first scan ingests.</div></div>
      ) : (
        <div className="tcard">
          <div className="thead" style={{ gridTemplateColumns: "1fr 190px 130px" }}><div>Issue</div><div>Framework</div><div>Status</div></div>
          {visible.map((g) => (
            <div key={g.key}>
              <div className="grp"><i className={`ti ${g.icon}`} style={{ color: g.color }} aria-hidden /> {g.label} <span className="n">{counts[g.key]}</span></div>
              {data[g.key].length === 0 && <div className="trow" style={{ gridTemplateColumns: "1fr" }}><div className="muted tiny">None.</div></div>}
              {data[g.key].map((issue) => {
                const pct = issue.checksTotal > 0 ? issue.checksPassing / issue.checksTotal : g.key === "passing" ? 1 : 0;
                return (
                  <div className="trow" style={{ gridTemplateColumns: "1fr 190px 130px" }} key={issue.id}>
                    <div className="ctrl-left">
                      <svg className="mini-ring" viewBox="0 0 36 36" aria-hidden><circle cx="18" cy="18" r="15" fill="none" stroke="#F0F2F7" strokeWidth="6" /><circle cx="18" cy="18" r="15" fill="none" stroke={g.color} strokeWidth="6" strokeDasharray="94.2" strokeDashoffset={ringOffset(pct, 94.2)} transform="rotate(-90 18 18)" /></svg>
                      <div><div className="cname">{issue.title}</div><div className="csub">{issue.checksTotal > 0 ? `${issue.checksPassing} of ${issue.checksTotal} checks passing` : "Tracked rule"}{issue.wcagCriterion ? ` · WCAG ${issue.wcagCriterion}` : ""}</div></div>
                    </div>
                    <div className="owner"><span className="fw" style={{ width: 18, height: 18, fontSize: 6, background: "#1E63FF", margin: 0 }}>{issue.framework.toUpperCase()}</span></div>
                    <div><span className={`pill ${g.pill}`}><i className={`ti ${g.icon}`} style={{ fontSize: 13 }} aria-hidden /> {g.label}</span></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * INSTALL
 * ════════════════════════════════════════════════════════════════════════ */
function InstallScreen({ base, siteId, token }: { base: string; siteId: string; token: string }) {
  const { loading, data } = useApi<InstallStatusData>(`${base}/install-status`);
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="https://makoya-gamma.vercel.app/widget/loader.js" data-site="${siteId}" data-token="${token}" defer></script>`;
  const pill = STATUS_PILL[data?.status ?? "not_installed"] ?? STATUS_PILL.not_installed;
  const installed = data?.status === "active" || data?.status === "monitoring";

  const platforms: { label: string; icon: string; on?: boolean }[] = [
    { label: "Direct", icon: "ti-code", on: true },
    { label: "WordPress", icon: "ti-brand-wordpress" },
    { label: "Shopify", icon: "ti-brand-shopify" },
    { label: "Wix", icon: "ti-square" },
    { label: "Squarespace", icon: "ti-brand-squarespace" },
    { label: "Webflow", icon: "ti-brand-webflow" },
  ];

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Install widget</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>One snippet. The widget loads on every page and starts monitoring automatically.</div>
      <div className="note warn" style={{ marginBottom: 18, maxWidth: 880 }}><i className="ti ti-info-circle" aria-hidden /><div>The widget adds a personalization toolbar + live monitoring. It is a <b>helper</b> — it doesn&apos;t by itself make your site legally compliant. Real conformance comes from Mike&apos;s audit + remediation.</div></div>

      <div className="card pad" style={{ marginBottom: 16, maxWidth: 880 }}>
        <div className="between" style={{ marginBottom: 12 }}><b>1 · Copy your install code</b><span className="pill p-gray tiny mono">agent: {siteId.slice(0, 8)}…</span></div>
        <div className="codebox">{snippet}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button className="btn pri" type="button" onClick={() => { navigator.clipboard?.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}>
            <i className="ti ti-copy" aria-hidden /> {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button className="btn" type="button"><i className="ti ti-send" aria-hidden /> Send to developer</button>
        </div>
      </div>

      <div className="card pad" style={{ marginBottom: 16, maxWidth: 880 }}>
        <b>2 · Pick your platform for step-by-step help</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginTop: 14 }}>
          {platforms.map((p) => (
            <div className={`ptile ${p.on ? "act" : ""}`} key={p.label}><div className="pi"><i className={`ti ${p.icon}`} aria-hidden /></div><div className="tiny" style={{ fontWeight: 600 }}>{p.label}</div></div>
          ))}
        </div>
      </div>

      <div className="card pad between" style={{ maxWidth: 880 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <i className="ti ti-rosette-discount-check" style={{ fontSize: 22, color: installed ? "var(--green)" : "var(--t3)" }} aria-hidden />
          <div>
            <b>3 · Verify installation</b>
            <div className="muted tiny">
              {loading ? "Checking…" : installed ? `Live — last seen ${shortDate(data?.lastSeenAt ?? null)} · ${num(data?.pingCount)} pings` : "We'll confirm the widget is live and start the first crawl."}
            </div>
          </div>
        </div>
        <span className={`pill ${pill.cls}`}>{pill.label}</span>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * CUSTOMIZE (from /config)
 * ════════════════════════════════════════════════════════════════════════ */
function CustomizeScreen({ base }: { base: string }) {
  const { loading, error, data } = useApi<SiteConfig>(`${base}/config`);

  return (
    <section className="screen on">
      <div className="between" style={{ marginBottom: 18 }}>
        <div><div className="h1" style={{ fontSize: 22 }}>Customize widget</div><div className="muted" style={{ fontSize: 13.5 }}>What your visitors see and can turn on.</div></div>
      </div>
      {loading && <Loading />}
      {(error || !data) && !loading && <Failed />}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 24, alignItems: "start" }}>
          <div>
            <div className="seg" style={{ marginBottom: 14 }}><button className="on" type="button">Features</button><button type="button">Appearance</button><button type="button">Mobile</button></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.keys(FEATURE_META).map((key) => {
                const meta = featureMeta(key);
                const on = data.featuresEnabled.includes(key);
                return (
                  <div className="feat" key={key}>
                    <div className="ic"><i className={`ti ${meta.icon}`} aria-hidden /></div>
                    <div style={{ flex: 1 }}><div className="nm">{meta.label}</div><div className="de mono tiny muted">{key}</div></div>
                    <span className={`toggle ${on ? "on" : ""}`} role="img" aria-label={`${meta.label} ${on ? "enabled" : "disabled"}`} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="tiny muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Live preview</div>
            <div className="wpv">
              <div className="hd" style={{ background: data.primaryColor || "var(--blue)" }}><span><i className="ti ti-accessible" style={{ fontSize: 15, verticalAlign: -2 }} aria-hidden /> Accessibility</span><i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden /></div>
              <div className="t2"><span className="on">Personalize</span><span>Report an issue</span></div>
              <div className="g2">Enabled tools</div>
              <div className="tiles">
                {data.featuresEnabled.slice(0, 6).map((key) => {
                  const meta = featureMeta(key);
                  return <div className="tile act" key={key}><i className={`ti ${meta.icon}`} aria-hidden />{meta.label}</div>;
                })}
                {data.featuresEnabled.length === 0 && <div className="tile">No tools enabled</div>}
              </div>
            </div>
            <div className="card pad"><b className="tiny" style={{ fontSize: 13 }}>Brand color</b><div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}><span style={{ width: 30, height: 30, borderRadius: 8, background: data.primaryColor, border: "1px solid var(--line)" }} /><span className="mono tiny">{data.primaryColor}</span></div></div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * STATEMENT
 * ════════════════════════════════════════════════════════════════════════ */
function StatementScreen({ base, domain, email }: { base: string; domain: string; email: string }) {
  const { loading, error, data } = useApi<StatementRecord | null>(`${base}/statement`);
  const [brand, setBrand] = useState("");
  const [contact, setContact] = useState("");
  const [target, setTarget] = useState("WCAG 2.1 Level AA");

  useEffect(() => {
    if (data) {
      setBrand(data.brandName);
      setContact(data.contactEmail);
      setTarget(data.conformanceTarget);
    } else if (!loading) {
      setBrand(domain.replace(/^www\./, "").split(".")[0].replace(/^\w/, (c) => c.toUpperCase()));
      setContact(email);
    }
  }, [data, loading, domain, email]);

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Accessibility statement</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>State your commitment and conformance target. We recommend displaying it in your footer.</div>
      {loading && <Loading />}
      {error && <Failed />}
      {!loading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 22, alignItems: "start", maxWidth: 980 }}>
          <div className="card pad">
            <label className="fl" htmlFor="v3-brand" style={{ marginTop: 0 }}>Brand name</label>
            <input id="v3-brand" className="inp" value={brand} onChange={(e) => setBrand(e.target.value)} />
            <label className="fl" htmlFor="v3-target">Conformance target</label>
            <select id="v3-target" className="inp" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option>WCAG 2.1 Level AA</option>
              <option>WCAG 2.2 Level AA</option>
            </select>
            <label className="fl" htmlFor="v3-contact">Accessibility contact</label>
            <input id="v3-contact" className="inp" value={contact} onChange={(e) => setContact(e.target.value)} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}><button className="btn pri" type="button"><i className="ti ti-copy" aria-hidden /> Copy HTML</button><button className="btn" type="button"><i className="ti ti-eye" aria-hidden /> Preview</button></div>
            <div className="note info" style={{ marginTop: 16 }}><i className="ti ti-info-circle" aria-hidden /><div>States your commitment and target — it is not a legal certification. Pairs with your proof-of-effort record.</div></div>
            {data?.updatedAt && <div className="tiny muted" style={{ marginTop: 10 }}>Last saved {shortDate(data.updatedAt)}.</div>}
          </div>
          <div className="card pad" style={{ background: "var(--bg)" }}>
            <div className="tiny muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Live preview</div>
            <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 10, padding: 16, fontSize: 12.5, lineHeight: 1.65, color: "var(--t2)" }}>
              <b style={{ color: "var(--ink)", fontSize: 14 }}>Accessibility statement</b><br /><br />
              {brand || "Your brand"} is committed to digital accessibility for people with disabilities. We aim to conform to <b>{target}</b>.<br /><br />
              Feedback: <span style={{ color: "var(--blue-d)" }}>{contact || "you@example.com"}</span><br /><br />
              <span className="tiny muted">Monitored by a Makoya agent.</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * PROOF OF EFFORT
 * ════════════════════════════════════════════════════════════════════════ */
function ProofScreen({ base }: { base: string }) {
  const { loading, error, data } = useApi<ProofPack>(`${base}/proof-pack`);

  return (
    <section className="screen on">
      <div className="between" style={{ marginBottom: 6 }}>
        <div><div className="h1" style={{ fontSize: 22 }}><i className="ti ti-shield-check" style={{ color: "var(--green)" }} aria-hidden /> Proof of effort</div><div className="muted" style={{ fontSize: 13.5 }}>A timestamped evidence pack of your ongoing accessibility work.</div></div>
        <button className="btn pri" type="button"><i className="ti ti-download" aria-hidden /> Download proof pack</button>
      </div>
      <div className="note warn" style={{ margin: "14px 0 18px", maxWidth: 960 }}><i className="ti ti-gavel" aria-hidden /><div>If your accessibility is ever challenged (e.g. a demand letter), this pack documents a good-faith, ongoing effort — your strongest practical response. It is evidence of effort, not a guarantee against claims.</div></div>
      {loading && <Loading />}
      {(error || !data) && !loading && <Failed />}
      {data && (
        <div className="grid2">
          <ProofCard icon="ti-robot" title="Audit history" sub={`${data.auditHistory.count} audit${data.auditHistory.count === 1 ? "" : "s"} on file${data.auditHistory.latestScore != null ? ` · latest score ${data.auditHistory.latestScore}` : ""}`} state={data.auditHistory.count > 0 ? "Up to date" : "Pending"} ok={data.auditHistory.count > 0} />
          <ProofCard icon="ti-list-check" title="Remediation log" sub={`${data.remediationCount} fix${data.remediationCount === 1 ? "" : "es"} logged with WCAG mapping`} state={data.remediationCount > 0 ? "Up to date" : "Empty"} ok={data.remediationCount > 0} />
          <ProofCard icon="ti-certificate" title="Accessibility statement" sub={data.statementPublished ? "Published & on record" : "Not generated yet"} state={data.statementPublished ? "Live" : "Pending"} ok={data.statementPublished} />
          <ProofCard icon="ti-code" title="Widget install proof" sub={`Installed ${data.install.daysInstalled} day${data.install.daysInstalled === 1 ? "" : "s"}${data.install.firstSeenOn ? ` · since ${shortDate(data.install.firstSeenOn)}` : ""}`} state={data.install.daysInstalled > 0 ? "Verified" : "Not seen"} ok={data.install.daysInstalled > 0} />
          <ProofCard icon="ti-file-text" title="VPAT / ACR" sub={data.vpat.length > 0 ? `${data.vpat.length} document${data.vpat.length === 1 ? "" : "s"} on file` : "None on file yet"} state={data.vpat.length > 0 ? "Ready" : "Pending"} ok={data.vpat.length > 0} />
          <ProofCard icon="ti-school" title="Manual expert audit" sub={data.manualAudits.length > 0 ? `Latest by ${data.manualAudits[0].auditor}` : "None on file yet"} state={data.manualAudits.length > 0 ? "On file" : "Pending"} ok={data.manualAudits.length > 0} />
        </div>
      )}
    </section>
  );
}
function ProofCard({ icon, title, sub, state, ok }: { icon: string; title: string; sub: string; state: string; ok: boolean }) {
  return (
    <div className="card pad" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div className="fav" style={{ width: 38, height: 38, background: "var(--blue-bg)", color: "var(--blue-d)" }}><i className={`ti ${icon}`} aria-hidden /></div>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div><div className="tiny muted" style={{ marginTop: 2 }}>{sub}</div></div>
      <span className={`pill ${ok ? "p-green" : "p-gray"}`}>{state}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * REPORTS
 * ════════════════════════════════════════════════════════════════════════ */
function ReportsScreen({ base }: { base: string }) {
  const { loading, error, data } = useApi<MonthlyReport[]>(`${base}/reports`);

  return (
    <section className="screen on">
      <div className="between" style={{ marginBottom: 16 }}>
        <div><div className="h1" style={{ fontSize: 22 }}>Reports</div><div className="muted" style={{ fontSize: 13.5 }}>Monthly audits and the remediation log for this agent.</div></div>
        <button className="btn" type="button"><i className="ti ti-download" aria-hidden /> Download all (PDF)</button>
      </div>
      {loading && <Loading />}
      {(error || !data) && !loading && <Failed />}
      {data && data.length === 0 && <div className="note info"><i className="ti ti-info-circle" aria-hidden /><div>No monthly reports yet — the first one is generated after a full month of monitoring.</div></div>}
      {data && data.length > 0 && (
        <div className="tcard">
          <div className="thead" style={{ gridTemplateColumns: "1fr 100px 130px 110px 120px" }}><div>Month</div><div>Score</div><div>Issues found</div><div>Resolved</div><div>Report</div></div>
          {data.map((r) => (
            <div className="trow" style={{ gridTemplateColumns: "1fr 100px 130px 110px 120px" }} key={r.period}>
              <div style={{ fontWeight: 600 }}>{monthLabel(r.period)}</div>
              <div><b>{r.score ?? "—"}</b></div>
              <div>{num(r.issuesFound)}</div>
              <div style={{ color: "var(--green)", fontWeight: 600 }}>{num(r.issuesResolved)}</div>
              <div>{r.pdfUrl ? <a href={r.pdfUrl} style={{ color: "var(--blue-d)", fontWeight: 600 }}><i className="ti ti-file-type-pdf" aria-hidden /> Download</a> : <span className="muted tiny">—</span>}</div>
            </div>
          ))}
        </div>
      )}
      <div className="note info" style={{ marginTop: 16, maxWidth: 900 }}><i className="ti ti-info-circle" aria-hidden /><div>Remediations are made by your team or by Makoya specialists — the widget never auto-edits your code. Every change is logged with the WCAG criterion it resolves, building your proof-of-effort trail.</div></div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * ANALYTICS
 * ════════════════════════════════════════════════════════════════════════ */
function AnalyticsScreen({ base }: { base: string }) {
  const { loading, error, data } = useApi<WidgetAnalytics>(`${base}/analytics?days=30`);

  if (loading) return <><div className="h1" style={{ fontSize: 22 }}>Analytics</div><Loading /></>;
  if (error || !data) return <><div className="h1" style={{ fontSize: 22 }}>Analytics</div><Failed /></>;

  const maxOpen = Math.max(1, ...data.opensOverTime.map((o) => o.count));
  const mostUsed = data.mostUsed ? featureMeta(data.mostUsed.featureKey) : null;

  return (
    <section className="screen on">
      <div className="between" style={{ marginBottom: 18 }}>
        <div><div className="h1" style={{ fontSize: 22 }}>Analytics</div><div className="muted" style={{ fontSize: 13.5 }}>How visitors use the accessibility widget on this agent.</div></div>
        <button className="btn" type="button"><i className="ti ti-calendar" aria-hidden /> Last 30 days</button>
      </div>
      <div className="grid3" style={{ marginBottom: 18 }}>
        <div className="mcard grn"><div className="l"><i className="ti ti-click" aria-hidden /> Widget opens</div><div className="big">{num(data.opens)}</div></div>
        <div className="mcard"><div className="l"><i className="ti ti-adjustments" aria-hidden /> Feature activations</div><div className="big">{num(data.featureActivations)}</div><div className="d muted">across {data.usageByFeature.length} tools</div></div>
        <div className="mcard"><div className="l"><i className="ti ti-star" aria-hidden /> Most used</div><div className="big" style={{ fontSize: 20, paddingTop: 10 }}>{mostUsed ? mostUsed.label : "—"}</div><div className="d muted">{data.mostUsed ? `${num(data.mostUsed.count)} activations` : "no data yet"}</div></div>
      </div>
      <div className="card pad" style={{ marginBottom: 18 }}>
        <b style={{ fontSize: 14 }}>Widget opens over time</b>
        {data.opensOverTime.length === 0 ? (
          <div className="muted tiny" style={{ padding: "26px 0" }}>No opens recorded in this window yet.</div>
        ) : (
          <div className="barchart">
            {data.opensOverTime.map((o) => (
              <div className="col" key={o.day} title={`${o.day}: ${o.count}`}><div className="bar2" style={{ height: `${Math.max(4, (o.count / maxOpen) * 100)}%` }} /></div>
            ))}
          </div>
        )}
      </div>
      <div className="card pad">
        <b style={{ fontSize: 14 }}>Usage by feature</b>
        {data.usageByFeature.length === 0 ? (
          <div className="muted tiny" style={{ marginTop: 12 }}>No feature activations recorded yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 14 }}>
            {data.usageByFeature.map((f) => {
              const meta = featureMeta(f.featureKey);
              return (
                <div className="fcard" key={f.featureKey}><div className="ic"><i className={`ti ${meta.icon}`} aria-hidden /></div><div><div className="n">{num(f.count)}</div><div className="tiny muted">{meta.label}</div></div></div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * BILLING
 * ════════════════════════════════════════════════════════════════════════ */
function BillingScreen({ base }: { base: string }) {
  // `reload` busts the per-URL cache so a successful checkout re-reads the
  // subscription and the chosen card flips to "Current plan" (see useApi).
  const [reload, setReload] = useState(0);
  const { loading, error, data } = useApi<BillingData>(`${base}/billing`, reload);
  const [period, setPeriod] = useState<"yearly" | "monthly">("yearly");
  // `busy` holds the slug whose checkout POST is in flight (disables that card's
  // button + shows a pending label). `ok`/`err` are the inline result banners —
  // never an alert(), never a fabricated paid state (status comes from the API).
  const [busy, setBusy] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (loading) return <><div className="h1" style={{ fontSize: 22 }}>Plan &amp; billing</div><Loading /></>;
  if (error || !data) return <><div className="h1" style={{ fontSize: 22 }}>Plan &amp; billing</div><Failed /></>;

  const currentSlug = data.subscription.planSlug;
  const currentStatus = data.subscription.status;
  const currentPlan = data.catalog.plans.find((p) => p.slug === currentSlug);
  // A plan counts as the live "Current plan" only when the subscription for that
  // exact slug is active or trialing — an inactive/canceled row still lets the
  // owner re-pick it. Status is read from the API; we never invent it locally.
  const isActiveCurrent = (slug: string) =>
    slug === currentSlug && (currentStatus === "active" || currentStatus === "trialing");

  /**
   * Buy now → POST {planSlug, period} to the checkout endpoint (built in a
   * parallel lane). Contract: 200 `{ok:true, subscription, paymentPending:true}`
   * (no real charge yet) / 400 on a bad request. On success we surface a calm
   * confirmation and refetch the billing data so the card flips to Current plan.
   * Any non-ok / thrown error shows a generic inline message — the page never
   * crashes and no "paid" state is fabricated.
   */
  async function buy(slug: string) {
    setErr(null);
    setOk(null);
    setBusy(slug);
    try {
      const res = await fetch(`${base}/billing/checkout`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug: slug, period }),
      });
      if (!res.ok) {
        setErr("Couldn't switch your plan just now — please try again shortly.");
        return;
      }
      const body = (await res.json().catch(() => null)) as { ok?: boolean; paymentPending?: boolean } | null;
      if (!body?.ok) {
        setErr("Couldn't switch your plan just now — please try again shortly.");
        return;
      }
      const plan = data?.catalog.plans.find((p) => p.slug === slug);
      setOk(
        `You're on the ${plan?.name ?? slug} plan${body.paymentPending ? " (trial)" : ""}. No charge yet — we'll let you know before any billing starts once checkout is live.`
      );
      cache.delete(`${base}/billing`);
      setReload((n) => n + 1);
    } catch {
      setErr("Network error — please try again shortly.");
    } finally {
      setBusy(null);
    }
  }

  /** Enterprise has no self-serve price — acknowledge inline, no fake action. */
  function contactSales() {
    setErr(null);
    setOk("Thanks — our team will reach out about an Enterprise plan.");
  }

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Plan &amp; billing</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>This agent is on the {currentPlan?.name ?? currentSlug} plan. Manage your subscription and invoices.</div>

      <div className="note warn" style={{ marginBottom: 14, maxWidth: 980 }}><i className="ti ti-credit-card-off" aria-hidden /><div>
        Payments aren&apos;t connected yet — choosing a plan activates it in trial; you&apos;ll be billed once we finish setting up checkout.
      </div></div>

      <div className="note info" style={{ marginBottom: 18, maxWidth: 980 }}><i className="ti ti-calendar-event" aria-hidden /><div>
        Status <b>{data.subscription.status}</b>{data.subscription.renewsAt ? ` · renews ${shortDate(data.subscription.renewsAt)}` : ""}
        {data.usage && !data.usage.unlimited ? ` · ${num(data.usage.used)} / ${num(data.usage.limit)} monthly opens` : data.usage?.unlimited ? " · unlimited visits" : ""}
        {data.usage?.exceeded ? " — over plan limit" : ""}
      </div></div>

      {ok && <div className="note good" style={{ marginBottom: 16, maxWidth: 980 }}><i className="ti ti-check" aria-hidden /><div>{ok}</div></div>}
      {err && <div className="note warn" style={{ marginBottom: 16, maxWidth: 980 }}><i className="ti ti-alert-triangle" aria-hidden /><div>{err}</div></div>}

      <div className="between" style={{ marginBottom: 12, maxWidth: 980 }}>
        <b style={{ fontSize: 15 }}>Plans</b>
        <div className="seg">
          <button type="button" className={period === "yearly" ? "on" : ""} onClick={() => setPeriod("yearly")}>Yearly · save {data.catalog.yearlySavingHeadline}%</button>
          <button type="button" className={period === "monthly" ? "on" : ""} onClick={() => setPeriod("monthly")}>Monthly</button>
        </div>
      </div>

      <div className="grid4" style={{ maxWidth: 980, alignItems: "stretch" }}>
        {data.catalog.plans.filter((p) => p.slug !== "free").map((p) => {
          const price = period === "yearly" ? p.yearlyPrice : p.monthlyPrice;
          const isCurrent = isActiveCurrent(p.slug);
          const isEnterprise = p.slug === "enterprise";
          const submitting = busy === p.slug;
          return (
            <div className="card pad" key={p.slug} style={{ display: "flex", flexDirection: "column", border: p.highlighted ? "2px solid var(--blue)" : undefined }}>
              {p.badge && <span className="pill p-blue tiny" style={{ alignSelf: "flex-start", marginBottom: 8 }}>{p.badge}</span>}
              {isCurrent && !p.badge && <span className="pill p-green tiny" style={{ alignSelf: "flex-start", marginBottom: 8 }}>Current plan</span>}
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.name}</div>
              <div style={{ fontSize: 23, fontWeight: 700, color: "var(--ink)", margin: "6px 0 2px" }}>
                {price == null ? "Custom" : `$${price.toLocaleString()}`}<span style={{ fontSize: 12, color: "var(--t3)", fontWeight: 500 }}>{price == null ? "" : period === "yearly" ? " /yr" : " /mo"}</span>
              </div>
              <div className="tiny muted" style={{ marginBottom: 14 }}>{p.visitLimit == null ? "100k+ visits" : `up to ${p.visitLimit.toLocaleString()} visits`}</div>
              {isCurrent ? (
                <button className="btn" type="button" disabled aria-disabled="true" style={{ marginTop: "auto", justifyContent: "center" }}>Current plan</button>
              ) : isEnterprise ? (
                <button className="btn" type="button" onClick={contactSales} style={{ marginTop: "auto", justifyContent: "center" }}>Contact sales</button>
              ) : (
                <button className="btn pri" type="button" onClick={() => buy(p.slug)} disabled={busy !== null} aria-busy={submitting} style={{ marginTop: "auto", justifyContent: "center" }}>{submitting ? "Activating…" : "Buy now"}</button>
              )}
            </div>
          );
        })}
      </div>
      <div className="note good" style={{ marginTop: 18, maxWidth: 980 }}><i className="ti ti-discount" aria-hidden /><div>{data.catalog.footnote}</div></div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * SETTINGS (/settings + /config)
 * ════════════════════════════════════════════════════════════════════════ */
function SettingsScreen({ base }: { base: string }) {
  const settings = useApi<SiteSettings>(`${base}/settings`);
  const config = useApi<SiteConfig>(`${base}/config`);

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Agent settings</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 16 }}>Owner details and advanced widget configuration for this agent.</div>
      {(settings.loading || config.loading) && <Loading />}
      {(settings.error || config.error) && !settings.loading && !config.loading && <Failed />}
      {settings.data && config.data && (
        <div className="grid2" style={{ alignItems: "start", maxWidth: 980 }}>
          <div className="card pad">
            <b style={{ fontSize: 14 }}>Agent owner</b>
            <div className="muted tiny" style={{ marginTop: 2 }}>Used in the accessibility statement and for alerts.</div>
            <label className="fl" htmlFor="v3-on">Owner name</label>
            <input id="v3-on" className="inp" defaultValue={settings.data.ownerName} placeholder="Not set" />
            <label className="fl" htmlFor="v3-oe">Email</label>
            <input id="v3-oe" className="inp" defaultValue={settings.data.ownerEmail} placeholder="Not set" />
            <label className="fl" htmlFor="v3-op">Phone</label>
            <input id="v3-op" className="inp" defaultValue={settings.data.ownerPhone} placeholder="Not set" />
            <button className="btn pri" type="button" style={{ marginTop: 16 }}><i className="ti ti-check" aria-hidden /> Save</button>
          </div>
          <div className="card pad">
            <b style={{ fontSize: 14 }}>Advanced widget config</b>
            <div className="muted tiny" style={{ marginTop: 2 }}>Optional. Some items require a developer.</div>
            <label className="fl" htmlFor="v3-trig">Custom trigger element</label>
            <input id="v3-trig" className="inp" defaultValue={config.data.customTriggerSelector} placeholder="Default launcher" />
            <label className="fl" htmlFor="v3-lang">Widget language</label>
            <input id="v3-lang" className="inp" defaultValue={config.data.defaultLanguage} />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="between" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}><span style={{ fontSize: 13 }}>Re-apply on dynamic content (DOM observer)</span><span className={`toggle ${config.data.domObserverEnabled ? "on" : ""}`} role="img" aria-label={`DOM observer ${config.data.domObserverEnabled ? "on" : "off"}`} /></div>
              <div className="between" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}><span style={{ fontSize: 13 }}>Inherit your site fonts</span><span className={`toggle ${config.data.inheritFonts ? "on" : ""}`} role="img" aria-label={`Inherit fonts ${config.data.inheritFonts ? "on" : "off"}`} /></div>
              <div className="between" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px" }}><span style={{ fontSize: 13 }}>Mobile enabled</span><span className={`toggle ${config.data.mobileEnabled ? "on" : ""}`} role="img" aria-label={`Mobile ${config.data.mobileEnabled ? "on" : "off"}`} /></div>
            </div>
            <div className="note info" style={{ marginTop: 14, fontSize: 12 }}><i className="ti ti-info-circle" style={{ fontSize: 16 }} aria-hidden /><div>No automated code-fixing here, by design — Makoya monitors and audits; fixes are on the record.</div></div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * ACCOUNT — Profile / Team / Security / API, wired to the org-tenancy APIs.
 *   /api/org           → org name (Profile) + the caller's role (gates Team/API)
 *   /api/team          → roster (+ invites if returned); POST creates an invite
 *   /api/org/api-keys  → list / create (secret-once) / revoke
 * One-time secrets (invite link, raw key) are shown via <CopyField> and never
 * cached or refetched. Mutations bust the per-URL cache and bump a reload key.
 * ════════════════════════════════════════════════════════════════════════ */
type AccountTab = "profile" | "team" | "security" | "api";

function AccountScreen({ domain, email }: { domain: string; email: string }) {
  const [tab, setTab] = useState<AccountTab>("profile");
  // /api/org gives both the org (Profile) and the caller's role (Team/API gating).
  const org = useApi<OrgResponse>("/api/org");
  const role = org.data?.role ?? null;

  const tabs: { id: AccountTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "team", label: "Team" },
    { id: "security", label: "Security" },
    { id: "api", label: "API" },
  ];

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Account settings</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>Organization, team, security and API access for your Makoya account.</div>
      <div className="seg" style={{ marginBottom: 18 }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className={tab === t.id ? "on" : ""} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "profile" && <AccountProfile org={org} email={email} domain={domain} />}
      {tab === "team" && <AccountTeam role={role} />}
      {tab === "security" && <AccountSecurity />}
      {tab === "api" && <AccountApiKeys role={role} />}
    </section>
  );
}

function AccountProfile({ org, email, domain }: { org: AsyncState<OrgResponse>; email: string; domain: string }) {
  return (
    <div className="grid2" style={{ alignItems: "start", maxWidth: 980 }}>
      <div className="card pad">
        <b style={{ fontSize: 14 }}>Organization</b>
        <div className="muted tiny" style={{ marginTop: 2 }}>Shown on your accessibility statement and reports.</div>
        {org.loading && <Loading />}
        {org.error && !org.loading && <Failed label="Couldn't load your organization — try again shortly." />}
        {org.data && (
          <>
            <label className="fl" htmlFor="v3-acc-org">Organization name</label>
            <input id="v3-acc-org" className="inp" value={org.data.org.name} readOnly />
            <label className="fl" htmlFor="v3-acc-email">Account email</label>
            <input id="v3-acc-email" className="inp" value={email} readOnly />
            <label className="fl" htmlFor="v3-acc-domain">Primary site</label>
            <input id="v3-acc-domain" className="inp" value={domain} readOnly />
            <div className="note info" style={{ marginTop: 16 }}><i className="ti ti-info-circle" aria-hidden /><div>To change your organization name or account email, contact support and we&apos;ll update it for you.</div></div>
          </>
        )}
      </div>
      <div className="card pad">
        <b style={{ fontSize: 14 }}>Your role</b>
        <div className="muted tiny" style={{ marginTop: 2 }}>What you can do in this account.</div>
        {org.loading && <Loading />}
        {org.data && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`pill ${ROLE_PILL[org.data.role]}`} style={{ textTransform: "capitalize" }}>{org.data.role}</span>
            <span className="tiny muted">{canManageTeam(org.data.role) ? "You can invite teammates and manage API keys." : "Ask an owner or admin to manage the team or API keys."}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountTeam({ role }: { role: OrgRole | null }) {
  const [reload, setReload] = useState(0);
  const { loading, error, data } = useApi<TeamResponse>("/api/team", reload);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "developer">("developer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const manage = canManageTeam(role);
  const pendingInvites = (data?.invites ?? []).filter((i) => !i.acceptedAt);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLink(null);
    if (!inviteEmail.trim()) {
      setErr("Enter an email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.status === 403) {
        setErr("Only owners and admins can invite teammates.");
        return;
      }
      if (!res.ok) {
        setErr("Couldn't create that invite — check the email and try again.");
        return;
      }
      const body = (await res.json()) as { token?: string };
      if (body.token) {
        setLink(`${window.location.origin}/accept-invite?token=${encodeURIComponent(body.token)}`);
      }
      setInviteEmail("");
      cache.delete("/api/team");
      setReload((n) => n + 1);
    } catch {
      setErr("Network error — try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 22, alignItems: "start", maxWidth: 980 }}>
      <div className="card pad">
        <b style={{ fontSize: 14 }}>Team members</b>
        <div className="muted tiny" style={{ marginTop: 2 }}>People with access to this account.</div>
        {loading && <Loading />}
        {error && !loading && <Failed label="Couldn't load your team — try again shortly." />}
        {data && (
          <div style={{ marginTop: 8 }}>
            {data.team.length === 0 && <div className="muted tiny" style={{ padding: "12px 0" }}>No team members yet.</div>}
            {data.team.map((m) => (
              <div className="between" key={m.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--line2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="av" style={{ width: 32, height: 32, background: "var(--blue-bg)", color: "var(--blue-d)", fontSize: 11 }}>{initials(m.email)}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.email}</div><div className="tiny muted">{m.userId ? "Active" : "Invited"}</div></div>
                </div>
                <span className={`pill ${ROLE_PILL[m.role]}`} style={{ textTransform: "capitalize" }}>{m.role}</span>
              </div>
            ))}
            {pendingInvites.length > 0 && (
              <>
                <div className="tiny muted" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", margin: "14px 0 4px" }}>Pending invites</div>
                {pendingInvites.map((i) => (
                  <div className="between" key={i.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--line2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="av" style={{ width: 32, height: 32, background: "var(--amber-bg)", color: "var(--amber)", fontSize: 11 }}>{initials(i.email)}</div>
                      <div><div style={{ fontWeight: 600, fontSize: 13.5 }}>{i.email}</div><div className="tiny muted">Invited {shortDate(i.createdAt)}</div></div>
                    </div>
                    <span className="pill p-amber" style={{ textTransform: "capitalize" }}>{i.role} · pending</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="card pad">
        <b style={{ fontSize: 14 }}>Invite a teammate</b>
        {!manage ? (
          <div className="note info" style={{ marginTop: 12 }}><i className="ti ti-info-circle" aria-hidden /><div>Only owners and admins can invite teammates. Ask an owner or admin on your team.</div></div>
        ) : (
          <form onSubmit={invite} style={{ marginTop: 4 }}>
            <label className="fl" htmlFor="v3-inv-email">Email</label>
            <input id="v3-inv-email" className="inp" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@company.com" />
            <label className="fl" htmlFor="v3-inv-role">Role</label>
            <select id="v3-inv-role" className="inp" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "admin" | "developer")}>
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn pri" type="submit" disabled={busy} style={{ marginTop: 16 }}><i className="ti ti-send" aria-hidden /> {busy ? "Sending…" : "Send invite"}</button>
            {err && <div className="note warn" style={{ marginTop: 12 }}><i className="ti ti-alert-triangle" aria-hidden /><div>{err}</div></div>}
            {link && (
              <div className="note good" style={{ marginTop: 12, display: "block" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}><i className="ti ti-check" aria-hidden /> Invite created — copy this link now</div>
                <div className="tiny" style={{ marginBottom: 8 }}>It&apos;s shown only once. Send it to your teammate; they join after signing in.</div>
                <CopyField value={link} copyLabel="Copy invite link" />
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function AccountSecurity() {
  return (
    <div className="card pad" style={{ maxWidth: 560 }}>
      <b style={{ fontSize: 14 }}>Password &amp; sign-in</b>
      <div className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
        Makoya uses Supabase for authentication. To change your password, head to the sign-in page and request a one-tap magic link, then set a new password from your account — or simply sign in again.
      </div>
      <a className="btn" href="/login" style={{ marginTop: 16, display: "inline-flex" }}><i className="ti ti-lock" aria-hidden /> Go to sign-in</a>
      <div className="note info" style={{ marginTop: 16 }}><i className="ti ti-info-circle" aria-hidden /><div>For any account-security questions, contact support.</div></div>
    </div>
  );
}

function AccountApiKeys({ role }: { role: OrgRole | null }) {
  const [reload, setReload] = useState(0);
  const { loading, error, data } = useApi<ApiKeysResponse>("/api/org/api-keys", reload);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const manage = canManageTeam(role);

  const refresh = () => {
    cache.delete("/api/org/api-keys");
    setReload((n) => n + 1);
  };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSecret(null);
    if (!name.trim()) {
      setErr("Give the key a name.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/org/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.status === 403) {
        setErr("Only owners and admins can create API keys.");
        return;
      }
      if (!res.ok) {
        setErr("Couldn't create that key — try again.");
        return;
      }
      const body = (await res.json()) as { secret?: string };
      if (body.secret) setSecret(body.secret);
      setName("");
      refresh();
    } catch {
      setErr("Network error — try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setErr(null);
    try {
      const res = await fetch("/api/org/api-keys", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.status === 403) {
        setErr("Only owners and admins can revoke API keys.");
        return;
      }
      if (!res.ok) {
        setErr("Couldn't revoke that key — try again.");
        return;
      }
      refresh();
    } catch {
      setErr("Network error — try again shortly.");
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      {manage && (
        <div className="card pad" style={{ marginBottom: 16 }}>
          <b style={{ fontSize: 14 }}>Create an API key</b>
          <div className="muted tiny" style={{ marginTop: 2 }}>For programmatic access. The secret is shown once — store it safely.</div>
          <form onSubmit={create} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="fl" htmlFor="v3-key-name" style={{ marginTop: 0 }}>Key name</label>
              <input id="v3-key-name" className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI pipeline" maxLength={80} />
            </div>
            <button className="btn pri" type="submit" disabled={busy}><i className="ti ti-plus" aria-hidden /> {busy ? "Creating…" : "Create key"}</button>
          </form>
          {err && <div className="note warn" style={{ marginTop: 12 }}><i className="ti ti-alert-triangle" aria-hidden /><div>{err}</div></div>}
          {secret && (
            <div className="note good" style={{ marginTop: 12, display: "block" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}><i className="ti ti-check" aria-hidden /> Key created — copy it now</div>
              <div className="tiny" style={{ marginBottom: 8 }}>This is the only time the full secret is shown. We store only a hashed prefix.</div>
              <CopyField value={secret} copyLabel="Copy secret" />
            </div>
          )}
        </div>
      )}
      <div className="card pad">
        <b style={{ fontSize: 14 }}>API keys</b>
        {loading && <Loading />}
        {error && !loading && <Failed label="Couldn't load API keys — try again shortly." />}
        {data && data.keys.length === 0 && <div className="muted tiny" style={{ marginTop: 12 }}>No API keys yet.</div>}
        {data && data.keys.length > 0 && (
          <div className="tcard" style={{ marginTop: 12 }}>
            <div className="thead" style={{ gridTemplateColumns: "1fr 150px 140px 120px" }}><div>Name</div><div>Prefix</div><div>Last used</div><div>Status</div></div>
            {data.keys.map((k) => (
              <div className="trow" style={{ gridTemplateColumns: "1fr 150px 140px 120px" }} key={k.id}>
                <div style={{ fontWeight: 600 }}>{k.name}</div>
                <div className="mono tiny">{k.prefix}…</div>
                <div className="tiny muted">{k.lastUsedAt ? shortDate(k.lastUsedAt) : "Never"}</div>
                <div>
                  {k.revokedAt ? (
                    <span className="pill p-gray">Revoked</span>
                  ) : manage ? (
                    <button className="btn" type="button" onClick={() => revoke(k.id)} style={{ padding: "5px 10px" }} aria-label={`Revoke ${k.name}`}><i className="ti ti-trash" aria-hidden /> Revoke</button>
                  ) : (
                    <span className="pill p-green">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * PARTNERS — pitch + enroll, or the enrolled partner dashboard.
 *   /api/partner              → { partner, clients?, summary? } (partner null ⇒ pitch)
 *   /api/partner/enroll       → POST (no body) to enroll (built in parallel)
 *   /api/partner/white-label  → GET / PATCH the cosmetic branding
 * Revenue is intentionally shown as $0 until billing/Stripe is live — never
 * fabricated from the summary.
 * ════════════════════════════════════════════════════════════════════════ */
function PartnersScreen() {
  const [reload, setReload] = useState(0);
  const { loading, error, data } = useApi<PartnerResponse>("/api/partner", reload);
  const refresh = () => {
    cache.delete("/api/partner");
    setReload((n) => n + 1);
  };

  return (
    <section className="screen on">
      <div className="h1" style={{ fontSize: 22, marginBottom: 4 }}>Partner program</div>
      <div className="muted" style={{ fontSize: 13.5, marginBottom: 18 }}>Manage accessibility for clients at scale — built for agencies and freelancers.</div>
      {loading && <Loading />}
      {error && !loading && <Failed label="Couldn't load the partner program — try again shortly." />}
      {data && !data.partner && <PartnerPitch onEnrolled={refresh} />}
      {data && data.partner && <PartnerDashboard clients={data.clients ?? []} summary={data.summary ?? null} />}
    </section>
  );
}

const PARTNER_BENEFITS: { icon: string; color: "blue" | "green"; title: string; sub: string }[] = [
  { icon: "ti-layout-grid", color: "blue", title: "One dashboard", sub: "Manage every client agent from a single login" },
  { icon: "ti-tag", color: "green", title: "Partner pricing", sub: "Wholesale rates + bundled billing" },
  { icon: "ti-brush", color: "blue", title: "White-label widget", sub: "Your branding on the widget and reports" },
  { icon: "ti-file-dollar", color: "green", title: "Co-branded reports", sub: "Audit + proof-of-effort packs in your name" },
  { icon: "ti-cash", color: "blue", title: "Recurring commission", sub: "Earn on every client plan, every month" },
  { icon: "ti-headset", color: "green", title: "Priority support", sub: "A dedicated partner success manager" },
];

function PartnerBenefits() {
  return (
    <div className="grid3">
      {PARTNER_BENEFITS.map((c) => (
        <div className="card pad" key={c.title}>
          <div className="fav" style={{ width: 38, height: 38, background: c.color === "blue" ? "var(--blue-bg)" : "var(--green-bg)", color: c.color === "blue" ? "var(--blue-d)" : "var(--green)", marginBottom: 10 }}><i className={`ti ${c.icon}`} aria-hidden /></div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.title}</div>
          <div className="tiny muted" style={{ marginTop: 3 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

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
      <div className="card pad between" style={{ marginBottom: 18, maxWidth: 980 }}>
        <div>
          <b style={{ fontSize: 14 }}>Become a partner</b>
          <div className="muted tiny" style={{ marginTop: 2 }}>Enroll your organization to manage client accounts, white-label the widget and earn recurring commission.</div>
        </div>
        <button className="btn pri" type="button" onClick={enroll} disabled={busy}><i className="ti ti-affiliate" aria-hidden /> {busy ? "Enrolling…" : "Become a partner"}</button>
      </div>
      {err && <div className="note warn" style={{ marginBottom: 18, maxWidth: 980 }}><i className="ti ti-alert-triangle" aria-hidden /><div>{err}</div></div>}
      <PartnerBenefits />
    </>
  );
}

function PartnerDashboard({ clients, summary }: { clients: PartnerClient[]; summary: PartnerSummary | null }) {
  return (
    <>
      <div className="grid3" style={{ marginBottom: 18 }}>
        <div className="mcard"><div className="l"><i className="ti ti-users" aria-hidden /> Client accounts</div><div className="big">{num(summary?.clientCount ?? clients.length)}</div></div>
        <div className="mcard grn"><div className="l"><i className="ti ti-robot" aria-hidden /> Agents managed</div><div className="big">{num(summary?.agentsManaged ?? 0)}</div></div>
        <div className="mcard"><div className="l"><i className="ti ti-businessplan" aria-hidden /> Monthly revenue</div><div className="big" style={{ fontSize: 21, paddingTop: 10 }}>$0</div><div className="d muted">available once billing/Stripe is live</div></div>
      </div>

      <PartnerWhiteLabel />

      <div className="card pad" style={{ marginTop: 18 }}>
        <b style={{ fontSize: 14 }}>Client accounts</b>
        <div className="muted tiny" style={{ marginTop: 2 }}>Organizations you manage under your partner account.</div>
        {clients.length === 0 ? (
          <div className="note info" style={{ marginTop: 12 }}><i className="ti ti-info-circle" aria-hidden /><div>No client accounts linked yet. Once you onboard clients they&apos;ll appear here.</div></div>
        ) : (
          <div className="tcard" style={{ marginTop: 12 }}>
            <div className="thead" style={{ gridTemplateColumns: "1fr 160px" }}><div>Client organization</div><div>Linked</div></div>
            {clients.map((c) => (
              <div className="trow" style={{ gridTemplateColumns: "1fr 160px" }} key={c.id}>
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

function PartnerWhiteLabel() {
  const [reload, setReload] = useState(0);
  const { loading, error, data } = useApi<WhiteLabelResponse>("/api/partner/white-label", reload);
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [hide, setHide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const c = data?.config;
    if (c) {
      setBrandName(c.brandName);
      setLogoUrl(c.logoUrl);
      setPrimaryColor(c.primaryColor);
      setSupportEmail(c.supportEmail);
      setHide(c.hideMakoyaBranding);
    }
  }, [data]);

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
      cache.delete("/api/partner/white-label");
      setReload((n) => n + 1);
      setMsg({ ok: true, text: "Branding saved." });
    } catch {
      setMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card pad">
      <b style={{ fontSize: 14 }}>White-label branding</b>
      <div className="muted tiny" style={{ marginTop: 2 }}>Cosmetic branding for the widget and reports — presentation only; it makes no accessibility-compliance claim.</div>
      {loading && <Loading />}
      {error && !loading && <Failed label="Couldn't load your branding — try again shortly." />}
      {!loading && !error && (
        <form onSubmit={save} style={{ marginTop: 8, maxWidth: 560 }}>
          <label className="fl" htmlFor="v3-wl-brand">Brand name</label>
          <input id="v3-wl-brand" className="inp" value={brandName} onChange={(e) => setBrandName(e.target.value)} maxLength={120} placeholder="Your agency" />
          <label className="fl" htmlFor="v3-wl-logo">Logo URL</label>
          <input id="v3-wl-logo" className="inp" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          <label className="fl" htmlFor="v3-wl-color">Primary color</label>
          <input id="v3-wl-color" className="inp" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#1E63FF" />
          <label className="fl" htmlFor="v3-wl-email">Support email</label>
          <input id="v3-wl-email" className="inp" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@youragency.com" />
          <div className="between" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "11px 13px", marginTop: 14 }}>
            <span style={{ fontSize: 13 }}>Hide &ldquo;Powered by Makoya&rdquo; branding</span>
            <button type="button" className={`toggle ${hide ? "on" : ""}`} role="switch" aria-checked={hide} aria-label="Hide Makoya branding" onClick={() => setHide((v) => !v)} />
          </div>
          <button className="btn pri" type="submit" disabled={busy} style={{ marginTop: 16 }}><i className="ti ti-check" aria-hidden /> {busy ? "Saving…" : "Save branding"}</button>
          {msg && <div className={`note ${msg.ok ? "good" : "warn"}`} style={{ marginTop: 12 }}><i className={`ti ${msg.ok ? "ti-check" : "ti-alert-triangle"}`} aria-hidden /><div>{msg.text}</div></div>}
        </form>
      )}
    </div>
  );
}

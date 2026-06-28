/**
 * Shell.tsx — client-side dashboard chrome (sidebar + topbar).
 *
 * Receives pre-loaded data from the RSC layout (sites, user) and manages:
 *  - Agent switcher: dropdown listing all sites, navigating to /dashboard/[id]
 *  - Nav group expand/collapse (Widget, Compliance, Insights) with aria-expanded
 *  - Active link highlighting derived from the current pathname
 *  - User menu (initials avatar, real name/email, sign-out via /auth/signout form)
 *  - Keyboard: Esc closes switcher, focus-visible preserved, skip-link wired
 *
 * Visual fidelity target: sidebar lines 363–393, topbar lines 395–401 of
 * docs/makoya_v7.html.
 */

"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Site } from "@/lib/sites";
import { Tour } from "./_components/Tour";
import { PageTransition } from "./_components/motion";
import { useT } from "@/lib/i18n/DashboardI18nProvider";
import { LANG_LABELS, type Lang, type DashboardStringKey } from "@/lib/i18n/dashboard";

interface ShellUser {
  name: string;
  email: string;
  initials: string;
}

interface ShellProps {
  sites: Site[];
  user: ShellUser;
  children: ReactNode;
}

// Nav item descriptors for the per-agent section.
// `labelKey` maps to the dashboard i18n dictionary — translated at render time
// via t(item.labelKey) so the module-level constant stays pure data.
const PER_AGENT_NAV: Array<{ href: string; icon: string; labelKey: DashboardStringKey }> = [
  { href: "", icon: "ti ti-layout-grid", labelKey: "nav_overview" },
  { href: "/mike", icon: "ti ti-robot", labelKey: "nav_mike" },
];

const WIDGET_ITEMS: Array<{ href: string; labelKey: DashboardStringKey }> = [
  { href: "/install", labelKey: "nav_install" },
  { href: "/customize", labelKey: "nav_customize" },
];

const COMPLIANCE_ITEMS: Array<{ href: string; labelKey: DashboardStringKey }> = [
  { href: "/statement", labelKey: "nav_statement" },
  { href: "/proof", labelKey: "nav_proof" },
];

const INSIGHTS_ITEMS: Array<{ href: string; labelKey: DashboardStringKey }> = [
  { href: "/reports", labelKey: "nav_reports" },
  { href: "/analytics", labelKey: "nav_analytics" },
];

export function Shell({ sites, user, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Dashboard i18n — `t` translates a key for the active language.
  // `lang` / `setLang` drive the language switcher in the topbar.
  const { t, lang, setLang } = useT();

  // Parse siteId from /dashboard/[siteId]/... — but NOT the reserved top-level
  // routes (which are also wrapped by this shell). Treating "account"/"partners"/
  // "agents" as an agent id would render a spurious per-agent nav with dead 404
  // sub-links on those screens.
  const RESERVED_SEGMENTS = ["agents", "account", "partners"];
  const siteIdMatch = pathname.match(/^\/dashboard\/([^/]+)/);
  const seg = siteIdMatch ? siteIdMatch[1] : null;
  const currentSiteId = seg && !RESERVED_SEGMENTS.includes(seg) ? seg : null;
  const currentSite = sites.find((s) => s.id === currentSiteId);

  // Switcher dropdown
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Mobile nav drawer — the sidebar becomes an off-canvas slide-in sheet under
  // 768px (most users are on phones). Open state drives a `data-nav-open` attr on
  // the .app root that the CSS uses to slide the <aside> in over a scrim.
  const [navOpen, setNavOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const closeNav = useCallback(() => setNavOpen(false), []);

  // Close the drawer whenever the route changes (a nav link was tapped).
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // While the drawer is open: Esc closes it, body scroll is locked, and focus
  // moves into the drawer; on close, focus returns to the toggle. This is the
  // accessibility contract for a modal-style sheet.
  useEffect(() => {
    if (!navOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeNav();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the drawer for keyboard + screen-reader users.
    asideRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
      navToggleRef.current?.focus();
    };
  }, [navOpen, closeNav]);

  // Nav group expand states
  const [widgetOpen, setWidgetOpen] = useState(
    () => pathname.includes("/install") || pathname.includes("/customize")
  );
  const [complianceOpen, setComplianceOpen] = useState(
    () => pathname.includes("/statement") || pathname.includes("/proof")
  );
  const [insightsOpen, setInsightsOpen] = useState(
    () => pathname.includes("/reports") || pathname.includes("/analytics")
  );

  // Close switcher on Esc or outside click
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);
  useEffect(() => {
    if (!switcherOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeSwitcher();
    }
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        closeSwitcher();
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [switcherOpen, closeSwitcher]);

  // Helper: is a given pathname segment active?
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function agentHref(siteId: string, screen = "") {
    return `/dashboard/${siteId}${screen}`;
  }

  function siteLabel(site: Site) {
    return site.domain || site.id;
  }

  // Sign-out: POST to existing /auth/signout
  const signOutRef = useRef<HTMLFormElement>(null);

  return (
    <div
      className="app"
      data-nav-open={navOpen ? "true" : undefined}
      style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}
    >
      {/* First-login product tour — renders as a portal-style fixed overlay */}
      <Tour />

      {/* Skip link */}
      <a href="#main" className="skip">
        {t("skip_to_content")}
      </a>

      {/* Mobile drawer scrim — tap to dismiss. Hidden on desktop via CSS. */}
      <div className="navscrim" hidden={!navOpen} onClick={closeNav} aria-hidden="true" />

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="side"
        id="dashboard-nav"
        ref={asideRef}
        tabIndex={-1}
        aria-label="Sidebar navigation"
      >
        {/* Mobile-only close button inside the drawer */}
        <button
          type="button"
          className="navclose"
          onClick={closeNav}
          aria-label={t("sidebar_close")}
        >
          <i className="ti ti-x" aria-hidden="true" />
        </button>

        {/* Brand gem */}
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M16 2.5L27.7 9.2L27.7 22.8L16 29.5L4.3 22.8L4.3 9.2Z"
              stroke="#0D1B4D"
              strokeWidth="2"
            />
            <path
              d="M14 11L9 16L14 21"
              stroke="#0D1B4D"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 11L23 16L18 21"
              stroke="#1E63FF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Makoya
        </div>

        {/* Agent switcher */}
        <div ref={switcherRef} style={{ position: "relative" }}>
          <button
            type="button"
            className="switch"
            onClick={() => setSwitcherOpen((o) => !o)}
            aria-expanded={switcherOpen}
            aria-haspopup="listbox"
            aria-label={`${t("nav_select_agent")}. ${t("nav_agents")}: ${currentSite ? siteLabel(currentSite) : t("nav_no_agents")}`}
          >
            <i
              className="ti ti-world"
              style={{ color: "var(--primary)", fontSize: 16 }}
              aria-hidden="true"
            />
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentSite
                ? siteLabel(currentSite)
                : sites.length > 0
                  ? t("nav_select_agent")
                  : t("nav_no_agents")}
            </span>
            <i
              className="ti ti-selector"
              style={{ marginLeft: "auto", color: "var(--t3)", fontSize: 15 }}
              aria-hidden="true"
            />
          </button>

          {switcherOpen && sites.length > 0 && (
            <div
              role="listbox"
              aria-label="Select agent"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "var(--sh-pop)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {sites.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  role="option"
                  aria-selected={site.id === currentSiteId}
                  onClick={() => {
                    closeSwitcher();
                    router.push(agentHref(site.id));
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 14px",
                    background: site.id === currentSiteId ? "var(--primary-soft)" : "transparent",
                    color: site.id === currentSiteId ? "var(--primary-hover)" : "var(--t1)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <i
                    className="ti ti-world"
                    aria-hidden="true"
                    style={{
                      fontSize: 15,
                      color: site.id === currentSiteId ? "var(--primary-hover)" : "var(--t3)",
                    }}
                  />
                  {siteLabel(site)}
                  {site.id === currentSiteId && (
                    <i
                      className="ti ti-check"
                      aria-hidden="true"
                      style={{ marginLeft: "auto", fontSize: 14 }}
                    />
                  )}
                </button>
              ))}
              <Link
                href="/dashboard/agents"
                onClick={closeSwitcher}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderTop: "1px solid var(--border)",
                  color: "var(--primary-hover)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 15 }} />
                {t("nav_manage_agents")}
              </Link>
            </div>
          )}
        </div>

        {/* Primary nav */}
        <nav aria-label="Primary">
          <ul className="nav">
            <li>
              <Link href="/dashboard" className={pathname === "/dashboard" ? "on" : ""}>
                <i className="ti ti-layout-dashboard" aria-hidden="true" />
                {t("nav_dashboard")}
              </Link>
            </li>
            <li>
              <Link href="/dashboard/agents" className={isActive("/dashboard/agents") ? "on" : ""}>
                <i className="ti ti-stack-2" aria-hidden="true" />
                {t("nav_agents")}
              </Link>
            </li>
          </ul>

          {/* Per-agent context — only shown when a site is active */}
          {currentSiteId && (
            <>
              <div className="agentctx">
                <h2>{currentSite ? siteLabel(currentSite) : currentSiteId}</h2>
              </div>
              <ul className="nav">
                {PER_AGENT_NAV.map((item) => {
                  const href = agentHref(currentSiteId, item.href);
                  return (
                    <li key={item.href}>
                      <Link href={href} className={pathname === href ? "on" : ""}>
                        <i className={item.icon} aria-hidden="true" />
                        {t(item.labelKey)}
                      </Link>
                    </li>
                  );
                })}

                {/* Widget group */}
                <li className={`grp${widgetOpen ? " [open]" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={widgetOpen}
                    onClick={() => setWidgetOpen((o) => !o)}
                  >
                    <i className="ti ti-browser" aria-hidden="true" />
                    {t("nav_widget")}
                    <i
                      className="ti ti-chevron-right ca"
                      aria-hidden="true"
                      style={{ transform: widgetOpen ? "rotate(90deg)" : undefined }}
                    />
                  </button>
                  <ul className="nav sub" hidden={!widgetOpen}>
                    {WIDGET_ITEMS.map((item) => {
                      const href = agentHref(currentSiteId, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={href}
                            className={pathname === href ? "on" : ""}
                            style={{ paddingLeft: 44 }}
                          >
                            {t(item.labelKey)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>

                {/* Compliance group */}
                <li className={`grp${complianceOpen ? " [open]" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={complianceOpen}
                    onClick={() => setComplianceOpen((o) => !o)}
                  >
                    <i className="ti ti-shield-check" aria-hidden="true" />
                    {t("nav_compliance")}
                    <i
                      className="ti ti-chevron-right ca"
                      aria-hidden="true"
                      style={{ transform: complianceOpen ? "rotate(90deg)" : undefined }}
                    />
                  </button>
                  <ul className="nav sub" hidden={!complianceOpen}>
                    {COMPLIANCE_ITEMS.map((item) => {
                      const href = agentHref(currentSiteId, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={href}
                            className={pathname === href ? "on" : ""}
                            style={{ paddingLeft: 44 }}
                          >
                            {t(item.labelKey)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>

                {/* Insights group */}
                <li className={`grp${insightsOpen ? " [open]" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={insightsOpen}
                    onClick={() => setInsightsOpen((o) => !o)}
                  >
                    <i className="ti ti-chart-dots" aria-hidden="true" />
                    {t("nav_insights")}
                    <i
                      className="ti ti-chevron-right ca"
                      aria-hidden="true"
                      style={{ transform: insightsOpen ? "rotate(90deg)" : undefined }}
                    />
                  </button>
                  <ul className="nav sub" hidden={!insightsOpen}>
                    {INSIGHTS_ITEMS.map((item) => {
                      const href = agentHref(currentSiteId, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={href}
                            className={pathname === href ? "on" : ""}
                            style={{ paddingLeft: 44 }}
                          >
                            {t(item.labelKey)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>

                <li>
                  <Link
                    href={agentHref(currentSiteId, "/settings")}
                    className={pathname.endsWith("/settings") ? "on" : ""}
                  >
                    <i className="ti ti-settings" aria-hidden="true" />
                    {t("nav_agent_settings")}
                  </Link>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* Footer nav */}
        <nav className="foot" aria-label="Account">
          <ul className="nav">
            <li>
              <Link
                href="/dashboard/account"
                className={isActive("/dashboard/account") ? "on" : ""}
              >
                <i className="ti ti-user" aria-hidden="true" />
                {t("nav_account")}
              </Link>
            </li>
            <li>
              <Link
                href={currentSiteId ? agentHref(currentSiteId, "/billing") : "/dashboard/agents"}
                className={pathname.endsWith("/billing") ? "on" : ""}
              >
                <i className="ti ti-credit-card" aria-hidden="true" />
                {t("nav_billing")}
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/partners"
                className={isActive("/dashboard/partners") ? "on" : ""}
              >
                <i className="ti ti-affiliate" aria-hidden="true" />
                {t("nav_partners")}
              </Link>
            </li>
            <li>
              <a href="mailto:support@makoya.io" rel="noopener noreferrer">
                <i className="ti ti-help-circle" aria-hidden="true" />
                {t("nav_help")}
              </a>
            </li>
          </ul>
          <div className="status">
            <span className="dot" aria-hidden="true" />
            <div>
              <b>{t("status_bar")}</b> <small>{t("status_ok")}</small>
            </div>
          </div>
        </nav>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      {/* inert makes the content wrapper non-interactive while the mobile drawer
          is open. This provides a focus trap (keyboard can't reach hidden content),
          prevents background scroll on iOS (no JS needed), and ensures screen
          readers cannot wander into the page behind the drawer scrim. */}
      <div className="main" inert={navOpen || undefined}>
        {/* Glass topbar */}
        <header className="topbar mk-glass" role="banner">
          {/* Mobile hamburger — opens the off-canvas nav drawer. Hidden ≥768px. */}
          <button
            type="button"
            className="navtoggle"
            ref={navToggleRef}
            onClick={() => setNavOpen(true)}
            aria-label={t("sidebar_open")}
            aria-expanded={navOpen}
            aria-controls="dashboard-nav"
          >
            <i className="ti ti-menu-2" aria-hidden="true" />
          </button>
          <div className="search" role="search">
            <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 18 }} />
            <span style={{ color: "var(--t3)" }}>{t("topbar_search")}</span>
          </div>
          <div className="tcluster">
            {/* Language switcher — compact native <select> styled to match the
                topbar chrome. Keyboard-accessible: arrow keys cycle options,
                Enter/Space confirms. Screen readers announce the label. */}
            <label className="sr-only" htmlFor="dash-lang-sel">
              {t("language")}
            </label>
            <select
              id="dash-lang-sel"
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              style={{
                height: 40,
                borderRadius: 11,
                background: "rgba(255,255,255,.85)",
                border: "1px solid var(--border)",
                color: "var(--t2)",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "inherit",
                padding: "0 10px",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                minWidth: 54,
                textAlign: "center",
              }}
              aria-label={t("language")}
            >
              {(Object.entries(LANG_LABELS) as Array<[Lang, string]>).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            <button type="button" className="iconbtn" aria-label={t("topbar_notifications")}>
              <i className="ti ti-bell" aria-hidden="true" />
            </button>

            {/* User menu: shows name + initials, sign-out on click */}
            <div style={{ position: "relative" }}>
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        {/* Page content — PageTransition gives every screen a consistent,
            reduced-motion-safe entrance (fade + rise + child stagger). The
            `key` ties the animation to the route so it replays on navigation. */}
        <main className="wrap" id="main">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

/**
 * UserMenu — avatar + name chip with a sign-out dropdown.
 * Isolated component to keep Shell readable.
 * Calls useT() directly — it is always rendered inside DashboardI18nProvider.
 */
function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useT();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref}>
      <button
        className="user"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`User menu for ${user.name}`}
      >
        <span className="av" aria-hidden="true">
          {user.initials}
        </span>
        <span>
          <span className="nm">{user.name}</span>
          <span className="rl">{user.email}</span>
        </span>
        <i
          className="ti ti-chevron-down"
          aria-hidden="true"
          style={{ fontSize: 15, color: "var(--t3)" }}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 180,
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--sh-pop)",
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "11px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--deep)" }}>{user.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--t3)", marginTop: 2 }}>{user.email}</div>
          </div>
          <Link
            href="/dashboard/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              color: "var(--t1)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <i
              className="ti ti-user"
              aria-hidden="true"
              style={{ fontSize: 15, color: "var(--t3)" }}
            />
            {t("user_account")}
          </Link>
          {/* Sign-out: POST to /auth/signout */}
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              role="menuitem"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: "none",
                border: "none",
                color: "var(--danger)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                borderTop: "1px solid var(--border)",
              }}
            >
              <i className="ti ti-logout" aria-hidden="true" style={{ fontSize: 15 }} />
              {t("user_sign_out")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

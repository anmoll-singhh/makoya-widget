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

// Nav item descriptors for the per-agent section
const PER_AGENT_NAV = [
  { href: "", icon: "ti ti-layout-grid", label: "Overview" },
  { href: "/mike", icon: "ti ti-robot", label: "Mike — audit" },
];

const WIDGET_ITEMS = [
  { href: "/install", label: "Install" },
  { href: "/customize", label: "Customize" },
];

const COMPLIANCE_ITEMS = [
  { href: "/statement", label: "Accessibility statement" },
  { href: "/proof", label: "Proof of effort" },
];

const INSIGHTS_ITEMS = [
  { href: "/reports", label: "Reports" },
  { href: "/analytics", label: "Analytics" },
];

export function Shell({ sites, user, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();

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

  // Nav group expand states
  const [widgetOpen, setWidgetOpen] = useState(() =>
    pathname.includes("/install") || pathname.includes("/customize")
  );
  const [complianceOpen, setComplianceOpen] = useState(() =>
    pathname.includes("/statement") || pathname.includes("/proof")
  );
  const [insightsOpen, setInsightsOpen] = useState(() =>
    pathname.includes("/reports") || pathname.includes("/analytics")
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
    <div className="app" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      {/* First-login product tour — renders as a portal-style fixed overlay */}
      <Tour />

      {/* Skip link */}
      <a href="#main" className="skip">
        Skip to main content
      </a>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="side">
        {/* Brand gem */}
        <div className="brand">
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 2.5L27.7 9.2L27.7 22.8L16 29.5L4.3 22.8L4.3 9.2Z" stroke="#0D1B4D" strokeWidth="2" />
            <path d="M14 11L9 16L14 21" stroke="#0D1B4D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 11L23 16L18 21" stroke="#1E63FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
            aria-label={`Switch agent. Current: ${currentSite ? siteLabel(currentSite) : "None"}`}
          >
            <i className="ti ti-world" style={{ color: "var(--primary)", fontSize: 16 }} aria-hidden="true" />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {currentSite ? siteLabel(currentSite) : sites.length > 0 ? "Select agent" : "No agents"}
            </span>
            <i className="ti ti-selector" style={{ marginLeft: "auto", color: "var(--t3)", fontSize: 15 }} aria-hidden="true" />
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
                  <i className="ti ti-world" aria-hidden="true" style={{ fontSize: 15, color: site.id === currentSiteId ? "var(--primary-hover)" : "var(--t3)" }} />
                  {siteLabel(site)}
                  {site.id === currentSiteId && (
                    <i className="ti ti-check" aria-hidden="true" style={{ marginLeft: "auto", fontSize: 14 }} />
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
                Manage agents
              </Link>
            </div>
          )}
        </div>

        {/* Primary nav */}
        <nav aria-label="Primary">
          <ul className="nav">
            <li>
              <Link
                href="/dashboard"
                className={pathname === "/dashboard" ? "on" : ""}
              >
                <i className="ti ti-layout-dashboard" aria-hidden="true" />
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/agents"
                className={isActive("/dashboard/agents") ? "on" : ""}
              >
                <i className="ti ti-stack-2" aria-hidden="true" />
                Agents
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
                        {item.label}
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
                    Widget
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
                          <Link href={href} className={pathname === href ? "on" : ""} style={{ paddingLeft: 44 }}>
                            {item.label}
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
                    Compliance
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
                          <Link href={href} className={pathname === href ? "on" : ""} style={{ paddingLeft: 44 }}>
                            {item.label}
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
                    Insights
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
                          <Link href={href} className={pathname === href ? "on" : ""} style={{ paddingLeft: 44 }}>
                            {item.label}
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
                    Agent settings
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
              <Link href="/dashboard/account" className={isActive("/dashboard/account") ? "on" : ""}>
                <i className="ti ti-user" aria-hidden="true" />
                Account
              </Link>
            </li>
            <li>
              <Link
                href={currentSiteId ? agentHref(currentSiteId, "/billing") : "/dashboard/agents"}
                className={pathname.endsWith("/billing") ? "on" : ""}
              >
                <i className="ti ti-credit-card" aria-hidden="true" />
                Plan &amp; billing
              </Link>
            </li>
            <li>
              <Link href="/dashboard/partners" className={isActive("/dashboard/partners") ? "on" : ""}>
                <i className="ti ti-affiliate" aria-hidden="true" />
                Partners
              </Link>
            </li>
            <li>
              <a href="mailto:support@makoya.io" rel="noopener noreferrer">
                <i className="ti ti-help-circle" aria-hidden="true" />
                Help
              </a>
            </li>
          </ul>
          <div className="status">
            <span className="dot" aria-hidden="true" />
            <div>
              <b>Status</b> <small>All systems operational</small>
            </div>
          </div>
        </nav>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="main">
        {/* Glass topbar */}
        <header className="topbar mk-glass" role="banner">
          <div className="search" role="search">
            <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 18 }} />
            <span style={{ color: "var(--t3)" }}>Search…</span>
          </div>
          <div className="tcluster">
            <button type="button" className="iconbtn" aria-label="Notifications">
              <i className="ti ti-bell" aria-hidden="true" />
            </button>

            {/* User menu: shows name + initials, sign-out on click */}
            <div style={{ position: "relative" }}>
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="wrap" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * UserMenu — avatar + name chip with a sign-out dropdown.
 * Isolated component to keep Shell readable.
 */
function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        <span className="av" aria-hidden="true">{user.initials}</span>
        <span>
          <span className="nm">{user.name}</span>
          <span className="rl">{user.email}</span>
        </span>
        <i className="ti ti-chevron-down" aria-hidden="true" style={{ fontSize: 15, color: "var(--t3)" }} />
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
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", color: "var(--t1)", fontSize: 13, fontWeight: 600 }}
          >
            <i className="ti ti-user" aria-hidden="true" style={{ fontSize: 15, color: "var(--t3)" }} />
            Account
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
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

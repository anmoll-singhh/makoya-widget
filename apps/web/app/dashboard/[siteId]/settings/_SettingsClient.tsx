"use client";
/**
 * app/dashboard/[siteId]/settings/_SettingsClient.tsx — v7 Agent settings (CLIENT).
 *
 * Wired to:
 *   GET   /api/sites/[siteId]/settings → SiteSettings (owner name/email/phone + notif prefs)
 *   PATCH /api/sites/[siteId]/settings → save owner info (body: { ownerName, ownerEmail, ownerPhone })
 *   GET   /api/sites/[siteId]/config   → SiteConfig (for advanced widget fields)
 *   PATCH /api/sites/[siteId]/config   → save advanced widget config
 *
 * Tabs: Owner info | Advanced | Notifications
 *
 * HARD RULES:
 *   - Input values seeded from real API data — never "Vikram Kandoriya" / "+1 (415) 555-0142"
 *   - Toggles are real <button role="switch" aria-checked> (keyboard-operable, not divs)
 *   - Seg tabs are real <button> with proper aria-selected on tablist
 *   - Save buttons call real PATCH endpoints; success/error shown inline (role=status/alert)
 *   - Info note verbatim: "No automated code-fixing here, by design…"
 */

import { useState, useEffect } from "react";
import { LoadingButton } from "../../_components";

/* ── API shapes ───────────────────────────────────────────────────────────────── */
interface SiteSettings {
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  notificationPrefs?: {
    scoreDropAlert?: boolean;
    weeklyDigest?: boolean;
    newIssueAlert?: boolean;
  };
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

type SettingsTab = "owner" | "advanced" | "notifications";

/* ── Props ─────────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    />
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────────── */
export function SettingsClient({ siteId }: Props) {
  const base = `/api/sites/${siteId}`;
  const [tab, setTab] = useState<SettingsTab>("owner");

  // Owner info
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Advanced config
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [triggerSelector, setTriggerSelector] = useState("");
  const [language, setLanguage] = useState("en");
  const [domObserver, setDomObserver] = useState(false);
  const [inheritFonts, setInheritFonts] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Notification prefs (from settings)
  const [scoreDropAlert, setScoreDropAlert] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [newIssueAlert, setNewIssueAlert] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Load owner settings
  useEffect(() => {
    let live = true;
    setSettingsLoading(true);
    setSettingsError(false);
    fetch(`${base}/settings`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<SiteSettings>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setSettings(d);
        setOwnerName(d.ownerName ?? "");
        setOwnerEmail(d.ownerEmail ?? "");
        setOwnerPhone(d.ownerPhone ?? "");
        setScoreDropAlert(d.notificationPrefs?.scoreDropAlert ?? false);
        setWeeklyDigest(d.notificationPrefs?.weeklyDigest ?? false);
        setNewIssueAlert(d.notificationPrefs?.newIssueAlert ?? false);
        setSettingsLoading(false);
      })
      .catch(() => {
        if (live) {
          setSettingsError(true);
          setSettingsLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [base]);

  // Load config
  useEffect(() => {
    let live = true;
    setConfigLoading(true);
    setConfigError(false);
    fetch(`${base}/config`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<SiteConfig>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setConfig(d);
        setTriggerSelector(d.customTriggerSelector ?? "");
        setLanguage(d.defaultLanguage ?? "en");
        setDomObserver(d.domObserverEnabled ?? false);
        setInheritFonts(d.inheritFonts ?? false);
        setConfigLoading(false);
      })
      .catch(() => {
        if (live) {
          setConfigError(true);
          setConfigLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, [base]);

  async function saveOwner(e: React.FormEvent) {
    e.preventDefault();
    setOwnerMsg(null);
    setSavingOwner(true);
    try {
      const res = await fetch(`${base}/settings`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerName, ownerEmail, ownerPhone }),
      });
      if (!res.ok) {
        setOwnerMsg({ ok: false, text: "Couldn't save owner info — please try again." });
        return;
      }
      setOwnerMsg({ ok: true, text: "Owner info saved." });
    } catch {
      setOwnerMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setSavingOwner(false);
    }
  }

  async function saveAdvanced(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setConfigMsg(null);
    setSavingConfig(true);
    try {
      const res = await fetch(`${base}/config`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customTriggerSelector: triggerSelector,
          defaultLanguage: language,
          domObserverEnabled: domObserver,
          inheritFonts,
        }),
      });
      if (!res.ok) {
        setConfigMsg({ ok: false, text: "Couldn't save config — please try again." });
        return;
      }
      setConfigMsg({ ok: true, text: "Advanced config saved." });
    } catch {
      setConfigMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setSavingConfig(false);
    }
  }

  async function saveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setNotifMsg(null);
    setSavingNotif(true);
    try {
      const res = await fetch(`${base}/settings`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationPrefs: { scoreDropAlert, weeklyDigest, newIssueAlert },
        }),
      });
      if (!res.ok) {
        setNotifMsg({
          ok: false,
          text: "Couldn't save notification preferences — please try again.",
        });
        return;
      }
      setNotifMsg({ ok: true, text: "Notification preferences saved." });
    } catch {
      setNotifMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setSavingNotif(false);
    }
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "owner", label: "Owner info" },
    { id: "advanced", label: "Advanced" },
    { id: "notifications", label: "Notifications" },
  ];

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Agent <b>Agent settings</b>
      </div>

      {/* Tab bar */}
      <div
        className="seg"
        role="tablist"
        aria-label="Settings sections"
        style={{ margin: "-4px 0 18px" }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`settings-tab-${t.id}`}
            aria-controls={`settings-panel-${t.id}`}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Owner info */}
      {tab === "owner" && (
        <div
          id="settings-panel-owner"
          role="tabpanel"
          aria-labelledby="settings-tab-owner"
          className="grid2"
          style={{ alignItems: "start", maxWidth: 980 }}
        >
          <section className="card cpad">
            <h3 style={{ fontSize: 14 }}>Agent owner</h3>
            <p className="tiny muted" style={{ marginTop: 2 }}>
              Used in the accessibility statement and for alerts.
            </p>
            {settingsLoading && (
              <div
                role="status"
                aria-live="polite"
                style={{ padding: "20px 0", color: "var(--t3)" }}
              >
                Loading owner info…
              </div>
            )}
            {settingsError && !settingsLoading && (
              <div className="note warn" role="alert" style={{ marginTop: 12 }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <div>Couldn&apos;t load owner info — try again shortly.</div>
              </div>
            )}
            {settings && !settingsLoading && (
              <form onSubmit={saveOwner}>
                <label className="fl" htmlFor="s-owner-name">
                  Owner name
                </label>
                <input
                  id="s-owner-name"
                  className="inp"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Not set"
                />
                <label className="fl" htmlFor="s-owner-email">
                  Email
                </label>
                <input
                  id="s-owner-email"
                  className="inp"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="Not set"
                />
                <label className="fl" htmlFor="s-owner-phone">
                  Phone
                </label>
                <input
                  id="s-owner-phone"
                  className="inp"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="Not set"
                />
                <LoadingButton
                  className="btn pri"
                  type="submit"
                  loading={savingOwner}
                  icon={<i className="ti ti-check" aria-hidden="true" />}
                  style={{ marginTop: 16 }}
                >
                  Save
                </LoadingButton>
                {ownerMsg && (
                  <div
                    className={`note ${ownerMsg.ok ? "good" : "warn"}`}
                    role={ownerMsg.ok ? "status" : "alert"}
                    style={{ marginTop: 12 }}
                  >
                    <i
                      className={`ti ${ownerMsg.ok ? "ti-check" : "ti-alert-triangle"}`}
                      aria-hidden="true"
                    />
                    <div>{ownerMsg.text}</div>
                  </div>
                )}
              </form>
            )}
          </section>

          {/* Placeholder second column for grid layout */}
          <div />
        </div>
      )}

      {/* Advanced */}
      {tab === "advanced" && (
        <div
          id="settings-panel-advanced"
          role="tabpanel"
          aria-labelledby="settings-tab-advanced"
          className="grid2"
          style={{ alignItems: "start", maxWidth: 980 }}
        >
          <section className="card cpad">
            <h3 style={{ fontSize: 14 }}>Advanced widget config</h3>
            <p className="tiny muted" style={{ marginTop: 2 }}>
              Optional. Some items require a developer.
            </p>
            {configLoading && (
              <div
                role="status"
                aria-live="polite"
                style={{ padding: "20px 0", color: "var(--t3)" }}
              >
                Loading config…
              </div>
            )}
            {configError && !configLoading && (
              <div className="note warn" role="alert" style={{ marginTop: 12 }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <div>Couldn&apos;t load widget config — try again shortly.</div>
              </div>
            )}
            {config && !configLoading && (
              <form onSubmit={saveAdvanced}>
                <label className="fl" htmlFor="s-trigger">
                  Custom trigger element (desktop)
                </label>
                <input
                  id="s-trigger"
                  className="inp"
                  value={triggerSelector}
                  onChange={(e) => setTriggerSelector(e.target.value)}
                  placeholder="Default launcher button"
                />
                <label className="fl" htmlFor="s-lang">
                  Widget language
                </label>
                <select
                  id="s-lang"
                  className="inp"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    className="between"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 13px",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>Re-apply on dynamic content (DOM observer)</span>
                    <Toggle
                      on={domObserver}
                      onToggle={() => setDomObserver((v) => !v)}
                      label={`DOM observer ${domObserver ? "on" : "off"}`}
                    />
                  </div>
                  <div
                    className="between"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 13px",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>Inherit your site fonts</span>
                    <Toggle
                      on={inheritFonts}
                      onToggle={() => setInheritFonts((v) => !v)}
                      label={`Inherit fonts ${inheritFonts ? "on" : "off"}`}
                    />
                  </div>
                </div>
                <div className="note info" style={{ marginTop: 14, fontSize: 12 }}>
                  <i className="ti ti-info-circle" style={{ fontSize: 16 }} aria-hidden="true" />
                  <div>
                    No automated code-fixing here, by design — Makoya monitors and audits; fixes are
                    on the record.
                  </div>
                </div>
                <LoadingButton
                  className="btn pri"
                  type="submit"
                  loading={savingConfig}
                  icon={<i className="ti ti-check" aria-hidden="true" />}
                  style={{ marginTop: 16 }}
                >
                  Save
                </LoadingButton>
                {configMsg && (
                  <div
                    className={`note ${configMsg.ok ? "good" : "warn"}`}
                    role={configMsg.ok ? "status" : "alert"}
                    style={{ marginTop: 12 }}
                  >
                    <i
                      className={`ti ${configMsg.ok ? "ti-check" : "ti-alert-triangle"}`}
                      aria-hidden="true"
                    />
                    <div>{configMsg.text}</div>
                  </div>
                )}
              </form>
            )}
          </section>
          <div />
        </div>
      )}

      {/* Notifications */}
      {tab === "notifications" && (
        <div
          id="settings-panel-notifications"
          role="tabpanel"
          aria-labelledby="settings-tab-notifications"
          style={{ maxWidth: 560 }}
        >
          {settingsLoading && (
            <div role="status" aria-live="polite" style={{ padding: "20px 0", color: "var(--t3)" }}>
              Loading notification preferences…
            </div>
          )}
          {settingsError && !settingsLoading && (
            <div className="note warn" role="alert">
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <div>Couldn&apos;t load preferences — try again shortly.</div>
            </div>
          )}
          {settings && !settingsLoading && (
            <form onSubmit={saveNotifications}>
              <section className="card cpad">
                <h3 style={{ fontSize: 14 }}>Notification preferences</h3>
                <p className="tiny muted" style={{ marginTop: 2 }}>
                  When to receive emails about this agent.
                </p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    className="between"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 13px",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>Score drop alert</span>
                    <Toggle
                      on={scoreDropAlert}
                      onToggle={() => setScoreDropAlert((v) => !v)}
                      label={`Score drop alert ${scoreDropAlert ? "on" : "off"}`}
                    />
                  </div>
                  <div
                    className="between"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 13px",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>Weekly digest</span>
                    <Toggle
                      on={weeklyDigest}
                      onToggle={() => setWeeklyDigest((v) => !v)}
                      label={`Weekly digest ${weeklyDigest ? "on" : "off"}`}
                    />
                  </div>
                  <div
                    className="between"
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "11px 13px",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>New issue alert</span>
                    <Toggle
                      on={newIssueAlert}
                      onToggle={() => setNewIssueAlert((v) => !v)}
                      label={`New issue alert ${newIssueAlert ? "on" : "off"}`}
                    />
                  </div>
                </div>
                <LoadingButton
                  className="btn pri"
                  type="submit"
                  loading={savingNotif}
                  icon={<i className="ti ti-check" aria-hidden="true" />}
                  style={{ marginTop: 16 }}
                >
                  Save preferences
                </LoadingButton>
                {notifMsg && (
                  <div
                    className={`note ${notifMsg.ok ? "good" : "warn"}`}
                    role={notifMsg.ok ? "status" : "alert"}
                    style={{ marginTop: 12 }}
                  >
                    <i
                      className={`ti ${notifMsg.ok ? "ti-check" : "ti-alert-triangle"}`}
                      aria-hidden="true"
                    />
                    <div>{notifMsg.text}</div>
                  </div>
                )}
              </section>
            </form>
          )}
        </div>
      )}
    </>
  );
}

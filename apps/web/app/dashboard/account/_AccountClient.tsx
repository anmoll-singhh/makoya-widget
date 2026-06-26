"use client";
/**
 * app/dashboard/account/_AccountClient.tsx — v7 Account settings (CLIENT).
 *
 * Wired to:
 *   GET/POST      /api/org           → org name + caller role
 *   GET/POST      /api/team          → roster (+ invites); POST creates invite w/ one-time token
 *   GET/POST/DEL  /api/org/api-keys  → list / create (secret once) / revoke
 *   POST          /api/team/accept   → redeem invite (invite-accept flow)
 *
 * Tabs: Profile | Team | Security | API
 *
 * HARD RULES (per plan + global constraints):
 *   - Org name and email come from /api/org — never hard-coded ("Waves MVMNT" etc.)
 *   - Team roster from /api/team — real members + pending invites
 *   - Invite token is one-time: shown once via CopyField, never in cache
 *   - API key secret shown once; clearly labelled "shown only once"
 *   - Role-gated: only owner/admin can invite or manage API keys
 *   - Tabs: real <button role="tab" aria-selected> inside role="tablist"
 *   - Escape closes any open dropdown (handled by the Shell, not here)
 *   - Loading role=status / error role=alert / empty states honest
 */

import { useState, useEffect, useCallback } from "react";

/* ── API shapes (client-local; mirrors lib/org.ts + lib/api-keys.ts) ─────────── */
type OrgRole = "owner" | "admin" | "developer";

interface Organization {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
}
interface OrgResponse {
  org: Organization;
  role: OrgRole;
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
interface TeamResponse {
  team: TeamMember[];
  invites?: TeamInvite[];
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
interface ApiKeysResponse {
  keys: ApiKeyRecord[];
}

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function canManageTeam(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}
function initials(s: string): string {
  const at = s.split("@")[0] ?? "";
  const parts = at.split(/[.\-_+\s]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? s[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  developer: "Developer",
};
const ROLE_PILL_CLS: Record<OrgRole, string> = {
  owner: "b-blue",
  admin: "b-green",
  developer: "gray",
};

/** Show a one-time secret with a copy button — never cached or refetched. */
function CopyField({ value, copyLabel = "Copy" }: { value: string; copyLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 13px",
          fontFamily: "monospace",
          fontSize: 12.5,
          wordBreak: "break-all",
          color: "var(--deep)",
        }}
      >
        {value}
      </div>
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
        <i className="ti ti-copy" aria-hidden="true" /> {copied ? "Copied!" : copyLabel}
      </button>
    </div>
  );
}

type AccountTab = "profile" | "team" | "security" | "api";

/* ── Props ─────────────────────────────────────────────────────────────────────── */
interface Props {
  email: string;
}

/* ── Main ─────────────────────────────────────────────────────────────────────── */
export function AccountClient({ email }: Props) {
  const [tab, setTab] = useState<AccountTab>("profile");
  const [orgData, setOrgData] = useState<OrgResponse | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/org", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<OrgResponse>) : Promise.reject(r.status)))
      .then((d) => { if (live) { setOrgData(d); setOrgLoading(false); } })
      .catch(() => { if (live) { setOrgError(true); setOrgLoading(false); } });
    return () => { live = false; };
  }, []);

  const role = orgData?.role ?? null;

  const tabs: { id: AccountTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "team", label: "Team" },
    { id: "security", label: "Security" },
    { id: "api", label: "API" },
  ];

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Account settings{" "}
        <b>Account settings</b>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          Organization, team and security for your Makoya account.
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="seg"
        role="tablist"
        aria-label="Account sections"
        style={{ marginBottom: 18 }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            id={`acct-tab-${t.id}`}
            aria-controls={`acct-panel-${t.id}`}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div
          id="acct-panel-profile"
          role="tabpanel"
          aria-labelledby="acct-tab-profile"
        >
          <ProfileTab
            orgData={orgData}
            orgLoading={orgLoading}
            orgError={orgError}
            email={email}
            role={role}
          />
        </div>
      )}

      {/* Team tab */}
      {tab === "team" && (
        <div
          id="acct-panel-team"
          role="tabpanel"
          aria-labelledby="acct-tab-team"
        >
          <TeamTab role={role} />
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div
          id="acct-panel-security"
          role="tabpanel"
          aria-labelledby="acct-tab-security"
        >
          <SecurityTab />
        </div>
      )}

      {/* API tab */}
      {tab === "api" && (
        <div
          id="acct-panel-api"
          role="tabpanel"
          aria-labelledby="acct-tab-api"
        >
          <ApiTab role={role} />
        </div>
      )}
    </>
  );
}

/* ── Profile tab ──────────────────────────────────────────────────────────────── */
function ProfileTab({
  orgData,
  orgLoading,
  orgError,
  email,
  role,
}: {
  orgData: OrgResponse | null;
  orgLoading: boolean;
  orgError: boolean;
  email: string;
  role: OrgRole | null;
}) {
  const [orgName, setOrgName] = useState(orgData?.org.name ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (orgData?.org.name) setOrgName(orgData.org.name);
  }, [orgData]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });
      if (res.status === 403) {
        setMsg({ ok: false, text: "Only the owner can change the organization name." });
        return;
      }
      if (!res.ok) {
        setMsg({ ok: false, text: "Couldn't save — please try again." });
        return;
      }
      setMsg({ ok: true, text: "Organization saved." });
    } catch {
      setMsg({ ok: false, text: "Network error — try again shortly." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid2" style={{ maxWidth: 980 }}>
      <section className="card">
        <div className="ch"><h3>Organization</h3></div>
        <div className="cpad">
          {orgLoading && (
            <div role="status" aria-live="polite" style={{ color: "var(--t3)", padding: "14px 0" }}>
              Loading organization…
            </div>
          )}
          {orgError && !orgLoading && (
            <div className="note warn" role="alert">
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <div>Couldn&apos;t load organization — try again shortly.</div>
            </div>
          )}
          {orgData && !orgLoading && (
            <form onSubmit={save}>
              <label className="fl" htmlFor="acct-org-name">Organization name</label>
              <input
                id="acct-org-name"
                className="inp"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              <label className="fl" htmlFor="acct-org-email" style={{ marginTop: 16 }}>Account email</label>
              <input
                id="acct-org-email"
                className="inp"
                type="email"
                value={email}
                readOnly
                aria-describedby="acct-email-note"
              />
              <p id="acct-email-note" className="tiny muted" style={{ marginTop: 4 }}>
                To change your account email, contact support.
              </p>
              {canManageTeam(role) && (
                <div style={{ marginTop: 20 }}>
                  <button className="btn pri" type="submit" disabled={saving}>
                    <i className="ti ti-device-floppy" aria-hidden="true" />{" "}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
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
      </section>

      {orgData && (
        <section className="card">
          <div className="ch"><h3>Your role</h3></div>
          <div className="cpad">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className={`pill ${ROLE_PILL_CLS[orgData.role]}`}>
                {ROLE_LABEL[orgData.role]}
              </span>
              <span className="tiny muted">
                {canManageTeam(orgData.role)
                  ? "You can invite teammates and manage API keys."
                  : "Ask an owner or admin to manage the team or API keys."}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Team tab ─────────────────────────────────────────────────────────────────── */
function TeamTab({ role }: { role: OrgRole | null }) {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "developer">("developer");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const manage = canManageTeam(role);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch("/api/team", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<TeamResponse>) : Promise.reject(r.status)))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) { setError(true); setLoading(false); } });
    return () => { live = false; };
  }, [reload]);

  const pendingInvites = (data?.invites ?? []).filter((i) => !i.acceptedAt);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLink(null);
    if (!inviteEmail.trim()) { setErr("Enter an email address."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.status === 403) { setErr("Only owners and admins can invite teammates."); return; }
      if (!res.ok) { setErr("Couldn't create that invite — check the email and try again."); return; }
      const body = (await res.json()) as { token?: string };
      if (body.token) {
        setLink(`${window.location.origin}/accept-invite?token=${encodeURIComponent(body.token)}`);
      }
      setInviteEmail("");
      refresh();
    } catch {
      setErr("Network error — try again shortly.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 22, alignItems: "start", maxWidth: 980 }}>
      <section className="card">
        <div className="ch">
          <h3>Team members</h3>
          {manage && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => { /* scroll to invite form */ }}
            >
              <i className="ti ti-user-plus" aria-hidden="true" /> Invite
            </button>
          )}
        </div>
        {loading && (
          <div role="status" aria-live="polite" style={{ padding: "20px", color: "var(--t3)" }}>
            Loading team…
          </div>
        )}
        {error && !loading && (
          <div className="note warn" role="alert" style={{ margin: 16 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div>Couldn&apos;t load your team — try again shortly.</div>
          </div>
        )}
        {data && !loading && (
          <>
            {data.team.length === 0 && (
              <div style={{ padding: "14px 20px" }} className="tiny muted">No team members yet.</div>
            )}
            {data.team.map((m) => (
              <div
                key={m.id}
                className="trow"
                style={{
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 14,
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  className="av"
                  style={{
                    width: 38,
                    height: 38,
                    background: "var(--primary-soft)",
                    color: "var(--primary-hover)",
                  }}
                >
                  {initials(m.email)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--deep)" }}>{m.email}</div>
                  <div className="tiny muted">{m.userId ? "Active" : "Invited"}</div>
                </div>
                <span className={`pill ${ROLE_PILL_CLS[m.role]}`}>
                  {ROLE_LABEL[m.role]}
                </span>
              </div>
            ))}

            {pendingInvites.length > 0 && (
              <>
                <div
                  className="tiny muted"
                  style={{
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    padding: "12px 20px 4px",
                  }}
                >
                  Pending invites
                </div>
                {pendingInvites.map((i) => (
                  <div
                    key={i.id}
                    className="trow"
                    style={{
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      padding: "14px 20px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="av"
                      style={{
                        width: 38,
                        height: 38,
                        background: "var(--warn-soft)",
                        color: "var(--warn)",
                      }}
                    >
                      {initials(i.email)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: "var(--deep)" }}>{i.email}</div>
                      <div className="tiny muted">Invited {shortDate(i.createdAt)}</div>
                    </div>
                    <span className="pill b-amber" style={{ textTransform: "capitalize" }}>
                      {i.role} · pending
                    </span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </section>

      <section className="card cpad">
        <h3 style={{ fontSize: 14 }}>Invite a teammate</h3>
        {!manage ? (
          <div className="note info" style={{ marginTop: 12 }}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <div>Only owners and admins can invite teammates.</div>
          </div>
        ) : (
          <form onSubmit={invite} style={{ marginTop: 4 }}>
            <label className="fl" htmlFor="team-inv-email">Email</label>
            <input
              id="team-inv-email"
              className="inp"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
            />
            <label className="fl" htmlFor="team-inv-role">Role</label>
            <select
              id="team-inv-role"
              className="inp"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "developer")}
            >
              <option value="developer">Developer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="btn pri"
              type="submit"
              disabled={busy}
              style={{ marginTop: 16 }}
            >
              <i className="ti ti-send" aria-hidden="true" />{" "}
              {busy ? "Sending…" : "Send invite"}
            </button>
            {err && (
              <div className="note warn" role="alert" style={{ marginTop: 12 }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" />
                <div>{err}</div>
              </div>
            )}
            {link && (
              <div className="note good" role="status" style={{ marginTop: 12, display: "block" }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  <i className="ti ti-check" aria-hidden="true" /> Invite created — copy this link now
                </div>
                <div className="tiny" style={{ marginBottom: 8 }}>
                  It&apos;s shown only once. Send it to your teammate; they join after signing in.
                </div>
                <CopyField value={link} copyLabel="Copy invite link" />
              </div>
            )}
          </form>
        )}
      </section>
    </div>
  );
}

/* ── Security tab ─────────────────────────────────────────────────────────────── */
function SecurityTab() {
  return (
    <div className="card cpad" style={{ maxWidth: 560 }}>
      <h3 style={{ fontSize: 14 }}>Password &amp; sign-in</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
        Makoya uses Supabase for authentication. To change your password, head to the
        sign-in page and request a reset link, then set a new password from your account.
      </p>
      <a
        className="btn"
        href="/login"
        style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <i className="ti ti-lock" aria-hidden="true" /> Go to sign-in
      </a>
      <div className="note info" style={{ marginTop: 16 }}>
        <i className="ti ti-info-circle" aria-hidden="true" />
        <div>For any account-security questions, contact support.</div>
      </div>
    </div>
  );
}

/* ── API keys tab ─────────────────────────────────────────────────────────────── */
function ApiTab({ role }: { role: OrgRole | null }) {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<ApiKeysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const manage = canManageTeam(role);

  const refresh = useCallback(() => {
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch("/api/org/api-keys", { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<ApiKeysResponse>) : Promise.reject(r.status)))
      .then((d) => { if (live) { setData(d); setLoading(false); } })
      .catch(() => { if (live) { setError(true); setLoading(false); } });
    return () => { live = false; };
  }, [reload]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSecret(null);
    if (!keyName.trim()) { setErr("Give the key a name."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/org/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName.trim() }),
      });
      if (res.status === 403) { setErr("Only owners and admins can create API keys."); return; }
      if (!res.ok) { setErr("Couldn't create that key — try again."); return; }
      const body = (await res.json()) as { secret?: string };
      if (body.secret) setSecret(body.secret);
      setKeyName("");
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
      if (res.status === 403) { setErr("Only owners and admins can revoke API keys."); return; }
      if (!res.ok) { setErr("Couldn't revoke that key — try again."); return; }
      refresh();
    } catch {
      setErr("Network error — try again shortly.");
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      {err && (
        <div className="note warn" role="alert" style={{ marginBottom: 16 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{err}</div>
        </div>
      )}

      {manage && (
        <div className="card cpad" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14 }}>Create an API key</h3>
          <p className="tiny muted" style={{ marginTop: 2 }}>
            For programmatic access. The secret is shown exactly once — copy and store it safely.
          </p>
          <form onSubmit={create} style={{ marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="fl" htmlFor="api-key-name" style={{ marginTop: 0 }}>Key name</label>
                <input
                  id="api-key-name"
                  className="inp"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. CI pipeline"
                  maxLength={80}
                />
              </div>
              <button className="btn pri" type="submit" disabled={busy}>
                <i className="ti ti-plus" aria-hidden="true" /> {busy ? "Creating…" : "Create key"}
              </button>
            </div>
          </form>
          {secret && (
            <div className="note good" role="status" style={{ marginTop: 12, display: "block" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                <i className="ti ti-check" aria-hidden="true" /> Key created — copy it now
              </div>
              <div className="tiny" style={{ marginBottom: 8 }}>
                This is the only time the full secret is shown. We store only a hashed prefix.
              </div>
              <CopyField value={secret} copyLabel="Copy secret" />
            </div>
          )}
        </div>
      )}

      <div className="card cpad">
        <h3 style={{ fontSize: 14 }}>API keys</h3>
        {loading && (
          <div role="status" aria-live="polite" style={{ padding: "14px 0", color: "var(--t3)" }}>
            Loading API keys…
          </div>
        )}
        {error && !loading && (
          <div className="note warn" role="alert" style={{ marginTop: 12 }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <div>Couldn&apos;t load API keys — try again shortly.</div>
          </div>
        )}
        {data && data.keys.length === 0 && (
          <div className="muted tiny" style={{ marginTop: 12 }}>No API keys yet.</div>
        )}
        {data && data.keys.length > 0 && (
          <div className="tcard" style={{ marginTop: 12 }}>
            <div className="thead" style={{ gridTemplateColumns: "1fr 150px 140px 120px" }}>
              <div>Name</div>
              <div>Prefix</div>
              <div>Last used</div>
              <div>Status</div>
            </div>
            {data.keys.map((k) => (
              <div
                className="trow"
                key={k.id}
                style={{ gridTemplateColumns: "1fr 150px 140px 120px" }}
              >
                <div style={{ fontWeight: 600 }}>{k.name}</div>
                <div className="mono tiny">{k.prefix}…</div>
                <div className="tiny muted">{k.lastUsedAt ? shortDate(k.lastUsedAt) : "Never"}</div>
                <div>
                  {k.revokedAt ? (
                    <span className="pill gray">Revoked</span>
                  ) : manage ? (
                    <button
                      className="btn"
                      type="button"
                      style={{ padding: "5px 10px" }}
                      aria-label={`Revoke ${k.name}`}
                      onClick={() => revoke(k.id)}
                    >
                      <i className="ti ti-trash" aria-hidden="true" /> Revoke
                    </button>
                  ) : (
                    <span className="pill b-green">Active</span>
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

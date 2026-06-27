"use client";
/**
 * AddCustomerForm — the operator's one-click customer onboarding.
 *
 * Posts { email, domain, plan } to POST /api/admin/customers, which creates the
 * client's auth user (with a temp password) + a site for the domain, and returns
 * the handover payload (email, tempPassword, siteId, token, created). The form
 * then shows everything the operator needs to hand over — including the ready-to-
 * paste install snippet — with copy buttons, and refreshes the customer table.
 *
 * No secret ever reaches this component: the token arrives already minted from
 * the server route.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type Plan } from "@/lib/admin-constants";
import { LoadingButton } from "@/components/motion/LoadingButton";

const LOADER_URL = "https://makoya-gamma.vercel.app/widget/loader.js";

interface Handover {
  email: string;
  tempPassword: string;
  siteId: string;
  token: string;
  created: boolean;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — value stays selectable */
        }
      }}
      className="transition-colors shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-signal-600 hover:bg-signal-50"
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function HandoverField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">{label}</span>
        <CopyButton value={value} label={label} />
      </div>
      <code className="block overflow-x-auto rounded-lg bg-[var(--surface-2)] px-3 py-2 text-[12px] leading-relaxed text-[var(--ink-900)] ring-1 ring-[var(--border)]">
        {value}
      </code>
    </div>
  );
}

const inputCls =
  "transition-colors w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:border-signal-500 focus:outline-none focus:ring-2 focus:ring-signal-500/30";

export function AddCustomerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [domain, setDomain] = useState("");
  const [plan, setPlan] = useState<Plan>("free");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Handover | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), domain: domain.trim(), plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't create the customer.");
        return;
      }
      setResult(data as Handover);
      router.refresh(); // re-fetch the RSC customer table so the new site appears
    } catch {
      setError("Something went wrong reaching the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setEmail("");
    setDomain("");
    setPlan("free");
    setError(null);
  }

  // ── Success: the handover ─────────────────────────────────────────────────
  if (result) {
    const snippet = `<script src="${LOADER_URL}" data-site="${result.siteId}" data-token="${result.token}" defer></script>`;
    return (
      <div
        className="rounded-2xl border p-5"
        style={{
          borderColor: "color-mix(in oklch, var(--color-sev-passed) 30%, transparent)",
          background: "var(--color-sev-passed-bg)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-base font-bold" style={{ color: "var(--color-sev-passed)" }}>
            Customer ready ✓
          </h2>
          <button
            type="button"
            onClick={reset}
            className="transition-colors rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-900)] hover:border-[var(--border-strong)]"
          >
            Add another
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--ink-900)]">
          Send the client their email + temporary password. They sign in at <code className="rounded bg-[var(--surface-2)] px-1">/login</code>,
          change their password under Account, and paste the snippet (or the Site ID + Token into the WordPress / Shopify plugin) on their site.
        </p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <HandoverField label="Email" value={result.email} />
            <HandoverField
              label="Temporary password"
              value={result.created ? result.tempPassword : "(existing user — password unchanged)"}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <HandoverField label="Site ID" value={result.siteId} />
            <HandoverField label="Token" value={result.token} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">Install snippet</span>
              <CopyButton value={snippet} label="install snippet" />
            </div>
            <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-3.5 text-[11px] leading-relaxed text-neutral-300 ring-1 ring-neutral-800">
              {snippet}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // ── The form ──────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
    >
      <h2 className="font-sans text-base font-bold text-[var(--ink-900)]">Add a customer</h2>
      <p className="mt-1 text-sm text-[var(--ink-600)]">
        Creates their account + a site for the domain, and gives you the login + install snippet to hand over.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label htmlFor="ac-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">
            Client email
          </label>
          <input
            id="ac-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@theircompany.com"
            autoComplete="off"
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="ac-domain" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">
            Site domain
          </label>
          <input
            id="ac-domain"
            type="text"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="theircompany.com"
            autoComplete="off"
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="ac-plan" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--ink-600)]">
            Plan
          </label>
          <select
            id="ac-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan)}
            className={`${inputCls} capitalize`}
          >
            {PLANS.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--color-sev-critical)" }}>
          {error}
        </p>
      )}

      <div className="mt-4">
        {/* Creative async button: instead of a 3-dot spinner the label morphs
            into the brand "scan" loader while the customer is created. Uses the
            dashboard .btn.pri styling for visual parity with the rest of admin.
            LoadingButton renders a real <button> and is reduced-motion safe. */}
        <LoadingButton
          type="submit"
          loading={busy}
          busyLabel="Creating…"
          disabled={busy || !email.trim() || !domain.trim()}
          className="btn pri"
        >
          <i className="ti ti-user-plus" aria-hidden="true" />
          Create customer
        </LoadingButton>
      </div>
    </form>
  );
}

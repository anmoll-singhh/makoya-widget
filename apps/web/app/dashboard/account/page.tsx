import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import { AccountForm } from "@/components/AccountForm";
import { SignOutButton } from "@/components/SignOutButton";

function fmt(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function AccountPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = isAdmin(user.email, env.ADMIN_EMAILS);
  const initial = (user.email?.[0] ?? "?").toUpperCase();

  // Each row carries an optional `mono` flag so the long UUID renders in a
  // tabular, copy-friendly way instead of being truncated into uselessness.
  const rows: { k: string; v: string; mono?: boolean }[] = [
    { k: "Email", v: user.email ?? "—" },
    { k: "Role", v: admin ? "Operator (admin)" : "Client" },
    { k: "Member since", v: fmt(user.created_at) },
    { k: "Last sign-in", v: fmt(user.last_sign_in_at ?? undefined) },
    { k: "Account ID", v: user.id, mono: true },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="transition-base inline-flex items-center gap-1 rounded-md text-sm font-medium text-neutral-500 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
        <h1 className="font-display mt-3 text-2xl font-bold tracking-tight text-neutral-900">Your account</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your sign-in details and account information.</p>
      </div>

      {/* Profile card */}
      <section aria-labelledby="acct-profile" className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <h2 id="acct-profile" className="sr-only">Profile</h2>
        <div className="flex items-center gap-4 border-b border-neutral-100 bg-gradient-to-br from-brand-50 to-white p-6">
          <span
            aria-hidden="true"
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl font-bold text-white shadow-sm shadow-brand-600/30"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-900">{user.email}</p>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                admin ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${admin ? "bg-brand-600" : "bg-neutral-400"}`} aria-hidden="true" />
              {admin ? "Operator" : "Client"}
            </span>
          </div>
        </div>
        <dl className="divide-y divide-neutral-100">
          {rows.map(({ k, v, mono }) => (
            <div key={k} className="flex items-center justify-between gap-4 px-6 py-3.5">
              <dt className="text-sm text-neutral-500">{k}</dt>
              <dd
                className={
                  mono
                    ? "max-w-[60%] truncate rounded-md bg-neutral-50 px-2 py-0.5 font-mono text-xs text-neutral-600 ring-1 ring-neutral-200"
                    : "max-w-[60%] truncate text-sm font-medium text-neutral-900"
                }
                title={mono ? v : undefined}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Change password */}
      <section aria-labelledby="acct-password" className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 id="acct-password" className="font-display text-lg font-bold tracking-tight text-neutral-900">Change password</h2>
        <p className="mt-1 mb-4 text-sm text-neutral-500">
          Pick a new password — it takes effect on your next sign-in.
        </p>
        <AccountForm email={user.email ?? ""} />
      </section>

      {/* Sign out */}
      <section aria-labelledby="acct-signout" className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 id="acct-signout" className="text-sm font-semibold text-neutral-900">Sign out</h2>
          <p className="text-sm text-neutral-500">End your session on this device.</p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}

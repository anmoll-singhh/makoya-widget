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

  const rows: [string, string][] = [
    ["Email", user.email ?? "—"],
    ["Role", admin ? "Operator (admin)" : "Client"],
    ["Member since", fmt(user.created_at)],
    ["Last sign-in", fmt(user.last_sign_in_at ?? undefined)],
    ["Account ID", user.id],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="transition-base inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900"
        >
          <span aria-hidden>←</span> Dashboard
        </Link>
        <h1 className="font-display mt-3 text-2xl font-bold tracking-tight text-neutral-900">Your account</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your sign-in details and account information.</p>
      </div>

      {/* Profile card */}
      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 border-b border-neutral-100 bg-gradient-to-br from-brand-50 to-white p-6">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl font-bold text-white shadow-sm shadow-brand-600/30">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-neutral-900">{user.email}</p>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                admin ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {admin ? "Operator" : "Client"}
            </span>
          </div>
        </div>
        <dl className="divide-y divide-neutral-100">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-6 py-3.5">
              <dt className="text-sm text-neutral-500">{k}</dt>
              <dd className="max-w-[60%] truncate text-sm font-medium text-neutral-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Change password */}
      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold tracking-tight text-neutral-900">Change password</h2>
        <p className="mt-1 mb-4 text-sm text-neutral-500">
          Pick a new password — it takes effect on your next sign-in.
        </p>
        <AccountForm email={user.email ?? ""} />
      </section>

      {/* Sign out */}
      <section className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Sign out</p>
          <p className="text-sm text-neutral-500">End your session on this device.</p>
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}

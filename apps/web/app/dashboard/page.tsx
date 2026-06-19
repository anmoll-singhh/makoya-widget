import { getServerSupabase } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/roles";
import { env } from "@/lib/env";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = isAdmin(user?.email, env.ADMIN_EMAILS);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{user?.email ? `, ${user.email}` : ""}</h1>
      <p className="text-neutral-600">Your dashboard foundation is live. Widget customization, your accessibility report, and billing arrive in the next phases.</p>
      {admin && <Link href="/admin" className="inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">Go to Admin CRM →</Link>}
    </div>
  );
}

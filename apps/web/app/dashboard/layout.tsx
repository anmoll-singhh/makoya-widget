/**
 * app/dashboard/layout.tsx  (RSC)
 *
 * v7 Shell layout for all /dashboard/* routes.
 *
 * Responsibilities:
 *  1. Require a valid Supabase session — unauthenticated requests are
 *     redirected to /login?next=/dashboard before any data is fetched.
 *  2. Load the user's sites via listSites (RLS-scoped by owner).
 *  3. Derive user display info (name, email, initials) from the session.
 *  4. Read the `makoya_lang` cookie and pass `initialLang` to the i18n
 *     provider so SSR and first hydration agree on the active language
 *     (no hydration mismatch).
 *  5. Render the client <Shell> with sites + user, wrapping {children} inside
 *     <DashboardI18nProvider>.
 *
 * The shell's active siteId / active route highlighting is derived
 * client-side from usePathname() inside Shell.tsx.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getServerSupabase } from "@/lib/supabase/server";
import { listSites } from "@/lib/sites";
import { Shell } from "./Shell";
import { DashboardI18nProvider } from "@/lib/i18n/DashboardI18nProvider";
import type { Lang } from "@/lib/i18n/dashboard";
import "./dashboard.css";

const VALID_LANGS = new Set(["en", "es", "fr", "de"]);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const sites = await listSites(supabase, user.id);

  // Derive a human-readable name from email or user metadata
  const rawName: string =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email?.split("@")[0] ||
    "User";

  const name = rawName
    .split(/[\s._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const email = user.email ?? "";

  // Two-letter initials from the name parts
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  // Read the language preference cookie written by DashboardI18nProvider's
  // setLang(). Passing it as initialLang means the server-rendered HTML and
  // the first client render use the same language — no hydration mismatch.
  const cookieStore = await cookies();
  const rawLang = cookieStore.get("makoya_lang")?.value ?? "en";
  const initialLang: Lang = VALID_LANGS.has(rawLang) ? (rawLang as Lang) : "en";

  return (
    <DashboardI18nProvider initialLang={initialLang}>
      <Shell sites={sites} user={{ name, email, initials }}>
        {children}
      </Shell>
    </DashboardI18nProvider>
  );
}

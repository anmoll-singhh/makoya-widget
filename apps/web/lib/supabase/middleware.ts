import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env.server";
import { isAdmin } from "@/lib/auth/roles";

/** Refreshes the session cookie and enforces route protection. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options: CookieOptions }[]) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const needsAuth = path.startsWith("/dashboard") || path.startsWith("/admin");

  if (needsAuth && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (path.startsWith("/admin") && !isAdmin(user?.email, env.ADMIN_EMAILS)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

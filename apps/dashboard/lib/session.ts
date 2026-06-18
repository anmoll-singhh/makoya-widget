import { cookies } from "next/headers";
const COOKIE = "mky_session";
/** Mock auth: the cookie just holds an email. Real auth = swap for Supabase Auth. */
export async function getSession(): Promise<{ email: string } | null> {
  const c = (await cookies()).get(COOKIE);
  return c?.value ? { email: c.value } : null;
}
export async function setSession(email: string) {
  (await cookies()).set(COOKIE, email, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

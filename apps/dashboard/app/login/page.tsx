import { redirect } from "next/navigation";
import { setSession, clearSession } from "@/lib/session";

/**
 * Mock login. In real mode, replace with Supabase Auth (magic link).
 * REQUIRED_MANUAL_SETUP (real auth): wire @supabase/supabase-js auth here.
 */
export default async function Login({ searchParams }: { searchParams: Promise<{ logout?: string }> }) {
  const sp = await searchParams;
  if (sp.logout) { await clearSession(); }

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "demo@makoya.dev");
    await setSession(email);
    redirect("/dashboard");
  }

  return (
    <div className="wrap" style={{ maxWidth: 420 }}>
      <h1>Sign in</h1>
      <div className="card">
        <form action={login}>
          <p className="stat-label">Mock login — any email works. Try the seeded account:</p>
          <input className="input" name="email" defaultValue="demo@makoya.dev" />
          <div style={{ height: 10 }} />
          <button className="btn" type="submit">Continue</button>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "password" | "link";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = () => getBrowserSupabase();
  const reset = () => {
    setError(null);
    setInfo(null);
  };

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError("Wrong email or password. New here? Use “Create account” below.");
      return;
    }
    window.location.href = "/dashboard";
  }

  async function createAccount() {
    reset();
    if (!email || password.length < 6) {
      setError("Enter your email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase().auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      window.location.href = "/dashboard";
    } else {
      setInfo("Account created. If email confirmation is on, check your inbox — otherwise just sign in.");
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setBusy(true);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent)
    return (
      <div
        role="status"
        className="mt-6 rounded-xl border p-4"
        style={{
          borderColor: "color-mix(in oklch, var(--color-sev-passed) 30%, transparent)",
          background: "var(--color-sev-passed-bg)",
        }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--color-sev-passed)" }}>
          Check your inbox ✓
        </p>
        <p className="mt-1 text-sm text-[var(--ink-900)]">
          We sent a secure sign-in link to <span className="font-medium">{email}</span>.
        </p>
      </div>
    );

  const inputCls =
    "transition-colors w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:border-signal-500 focus:outline-none focus:ring-2 focus:ring-signal-500/30";

  return (
    <form onSubmit={mode === "password" ? signIn : sendLink} className="mt-6 space-y-3">
      <input
        type="email"
        required
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        className={inputCls}
      />

      {mode === "password" && (
        <input
          type="password"
          required
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className={inputCls}
        />
      )}

      <button
        type="submit"
        disabled={busy}
        className="transition-colors w-full rounded-xl bg-signal-600 px-4 py-3 text-[15px] font-semibold text-white hover:bg-signal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40 disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </button>

      {mode === "password" && (
        <button
          type="button"
          onClick={createAccount}
          disabled={busy}
          className="transition-colors w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[15px] font-semibold text-[var(--ink-900)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)] disabled:opacity-60"
        >
          Create account
        </button>
      )}

      {error && (
        <p className="text-sm font-medium" style={{ color: "var(--color-sev-critical)" }}>
          {error}
        </p>
      )}
      {info && (
        <p className="text-sm font-medium" style={{ color: "var(--color-sev-passed)" }}>
          {info}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          reset();
          setMode(mode === "password" ? "link" : "password");
        }}
        className="transition-colors w-full pt-1 text-center text-sm font-medium text-signal-600 hover:text-signal-700"
      >
        {mode === "password"
          ? "Prefer a magic link? Email me one instead"
          : "Use email + password instead"}
      </button>
    </form>
  );
}

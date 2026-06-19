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
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Check your inbox ✓</p>
        <p className="mt-1 text-sm text-emerald-700">
          We sent a secure sign-in link to <span className="font-medium">{email}</span>.
        </p>
      </div>
    );

  const inputCls =
    "transition-base w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

  return (
    <form onSubmit={mode === "password" ? signIn : sendLink} className="mt-6 space-y-3">
      <input
        type="email"
        required
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
        className="transition-base w-full rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-xl disabled:opacity-60"
      >
        {busy ? "Working…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </button>

      {mode === "password" && (
        <button
          type="button"
          onClick={createAccount}
          disabled={busy}
          className="transition-base w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          Create account
        </button>
      )}

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {info && <p className="text-sm font-medium text-emerald-700">{info}</p>}

      <button
        type="button"
        onClick={() => {
          reset();
          setMode(mode === "password" ? "link" : "password");
        }}
        className="transition-base w-full pt-1 text-center text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        {mode === "password" ? "Prefer a magic link? Email me one instead" : "Use email + password instead"}
      </button>
    </form>
  );
}

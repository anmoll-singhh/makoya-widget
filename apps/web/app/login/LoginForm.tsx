"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent)
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-semibold text-emerald-800">Check your inbox ✓</p>
        <p className="mt-1 text-sm text-emerald-700">
          We sent a secure sign-in link to <span className="font-medium">{email}</span>. Click it and you&apos;re in.
        </p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        className="transition-base w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <button
        type="submit"
        disabled={sending}
        className="transition-base w-full rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-xl disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send my sign-in link"}
      </button>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function AccountForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 6) return setMsg({ type: "err", text: "New password must be at least 6 characters." });
    if (next !== confirm) return setMsg({ type: "err", text: "The new passwords don't match." });

    setBusy(true);
    const sb = getBrowserSupabase();
    // Re-verify the current password before changing it (defense against an open session).
    const { error: verErr } = await sb.auth.signInWithPassword({ email, password: current });
    if (verErr) {
      setBusy(false);
      return setMsg({ type: "err", text: "Your current password is incorrect." });
    }
    const { error } = await sb.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return setMsg({ type: "err", text: error.message });
    setCurrent("");
    setNext("");
    setConfirm("");
    setMsg({ type: "ok", text: "Password updated ✓ — use it next time you sign in." });
  }

  const cls =
    "transition-base w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Current password</label>
        <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={cls} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">New password</label>
        <input type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 6 characters" className={cls} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Confirm new password</label>
        <input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className={cls} />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="transition-base rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {busy ? "Updating…" : "Update password"}
      </button>
      {msg && (
        <p className={`text-sm font-medium ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSiteForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError((res && (await res.json())?.error) || "Couldn't add that — check the domain and try again.");
      return;
    }
    setDomain("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <input
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        required
        placeholder="yourdomain.com"
        className="transition-base min-w-0 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <button
        disabled={busy}
        className="transition-base inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 px-5 py-3 text-[15px] font-semibold text-white shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30 disabled:opacity-60"
      >
        {busy ? "Scanning…" : "Scan my site free"}
        {!busy && <span aria-hidden>→</span>}
      </button>
      {error && <p className="w-full text-sm font-medium text-red-600 sm:basis-full">{error}</p>}
    </form>
  );
}

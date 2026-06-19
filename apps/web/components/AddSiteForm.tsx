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
    setBusy(true); setError(null);
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
    setDomain("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={domain} onChange={(e) => setDomain(e.target.value)} required
        placeholder="yourdomain.com"
        className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      <button disabled={busy} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Adding…" : "Add site"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REQUEST_STATUSES } from "@/lib/admin-constants";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  async function change(next: string) {
    const prev = value;
    setValue(next); setSaving(true); setError(false);
    const res = await fetch(`/api/admin/consultations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) }).catch(() => null);
    setSaving(false);
    if (!res || !res.ok) { setValue(prev); setError(true); return; }
    router.refresh();
  }
  return (
    <div className="flex items-center gap-2">
      <select value={value} disabled={saving} onChange={(e) => change(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--ink-900)] focus:outline-none focus:ring-2 focus:ring-signal-500">
        {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {error && <span className="text-xs text-[var(--color-sev-critical)]">failed</span>}
    </div>
  );
}

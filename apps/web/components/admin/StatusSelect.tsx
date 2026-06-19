"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { REQUEST_STATUSES } from "@/lib/admin-constants";

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  async function change(next: string) {
    setValue(next); setSaving(true);
    await fetch(`/api/admin/consultations/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    setSaving(false); router.refresh();
  }
  return (
    <select value={value} disabled={saving} onChange={(e) => change(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100">
      {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

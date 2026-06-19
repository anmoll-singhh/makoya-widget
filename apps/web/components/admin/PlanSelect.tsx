"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS } from "@/lib/admin-constants";

export function PlanSelect({ siteId, plan }: { siteId: string; plan: string }) {
  const router = useRouter();
  const [value, setValue] = useState(plan);
  const [saving, setSaving] = useState(false);
  async function change(next: string) {
    setValue(next); setSaving(true);
    await fetch(`/api/admin/sites/${siteId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: next }) });
    setSaving(false); router.refresh();
  }
  return (
    <select value={value} disabled={saving} onChange={(e) => change(e.target.value)}
      className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100">
      {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
    </select>
  );
}

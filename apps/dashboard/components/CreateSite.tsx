"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateSite() {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function add() {
    if (!domain) return;
    setBusy(true);
    await fetch("/api/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ domain }) });
    setBusy(false); setDomain(""); router.refresh();
  }
  return (
    <div className="card">
      <h2>Add a site</h2>
      <div className="row">
        <input className="input" style={{ maxWidth: 320 }} placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <button className="btn" onClick={add} disabled={busy}>{busy ? "Adding…" : "Add site"}</button>
      </div>
    </div>
  );
}

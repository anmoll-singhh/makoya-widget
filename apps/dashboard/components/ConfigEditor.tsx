"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ALL_FEATURES = ["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor"];
const POSITIONS = ["bottom-right","bottom-left","top-right","top-left"];

export function ConfigEditor({ siteId, initial, plan }: {
  siteId: string;
  initial: { primaryColor: string; position: string; featuresEnabled: string[]; hideBranding: boolean };
  plan: string;
}) {
  const [color, setColor] = useState(initial.primaryColor);
  const [position, setPosition] = useState(initial.position);
  const [features, setFeatures] = useState<string[]>(initial.featuresEnabled);
  const [hideBranding, setHideBranding] = useState(initial.hideBranding);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const canHideBranding = plan !== "free";

  function toggleFeature(f: string) {
    setFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  }
  async function save() {
    await fetch(`/api/sites?id=${siteId}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ primaryColor: color, position, featuresEnabled: features, hideBranding: canHideBranding ? hideBranding : false }),
    });
    setSaved(true); router.refresh();
  }
  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <label>Color <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setSaved(false); }} /></label>
        <label>Position{" "}
          <select className="input" style={{ width: "auto" }} value={position} onChange={(e) => { setPosition(e.target.value); setSaved(false); }}>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <strong>Features shown</strong>
      {ALL_FEATURES.map((f) => (
        <label className="chk" key={f}>
          <input type="checkbox" checked={features.includes(f)} onChange={() => { toggleFeature(f); setSaved(false); }} /> {f}
        </label>
      ))}
      <label className="chk">
        <input type="checkbox" checked={hideBranding} disabled={!canHideBranding} onChange={(e) => { setHideBranding(e.target.checked); setSaved(false); }} />
        Hide "Powered by Makoya" {canHideBranding ? "" : "(Pro plan only)"}
      </label>
      <div style={{ height: 10 }} />
      <button className="btn" onClick={save}>{saved ? "Saved ✓" : "Save settings"}</button>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LAUNCHER_ICONS, type LauncherIconKey, type WidgetPosition, type FeatureKey,
} from "@makoya/shared";
import { WidgetPreview } from "./WidgetPreview";
import type { SiteConfig } from "@/lib/sites-mappers";

const POSITIONS: WidgetPosition[] = ["bottom-right", "bottom-left", "top-right", "top-left"];
const ICONS = Object.keys(LAUNCHER_ICONS) as LauncherIconKey[];
const ALL_FEATURES: { key: FeatureKey; label: string }[] = [
  { key: "textSize", label: "Text size" },
  { key: "lineSpacing", label: "Line spacing" },
  { key: "contrast", label: "Contrast" },
  { key: "stopMotion", label: "Stop motion" },
  { key: "readingRuler", label: "Reading ruler" },
  { key: "highlightLinks", label: "Highlight links" },
  { key: "bigCursor", label: "Big cursor" },
];

export function ConfigEditor({ siteId, plan, initial }: { siteId: string; plan: string; initial: SiteConfig }) {
  const router = useRouter();
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const canHideBranding = plan !== "free";

  function set<K extends keyof SiteConfig>(k: K, v: SiteConfig[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
    setSaved(false); setSaveError(false);
  }
  function toggleFeature(k: FeatureKey) {
    setCfg((c) => ({
      ...c,
      featuresEnabled: c.featuresEnabled.includes(k)
        ? c.featuresEnabled.filter((f) => f !== k)
        : [...c.featuresEnabled, k],
    }));
    setSaved(false); setSaveError(false);
  }
  async function save() {
    setSaving(true); setSaveError(false);
    const res = await fetch(`/api/sites/${siteId}/config`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cfg),
    }).catch(() => null);
    setSaving(false);
    if (res && res.ok) { setSaved(true); router.refresh(); }
    else setSaveError(true);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium text-neutral-700">Appearance</h3>
          <div className="mt-3 space-y-4">
            <label className="flex items-center justify-between gap-4">
              <span className="text-sm">Primary color</span>
              <input type="color" value={cfg.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-neutral-300" />
            </label>
            <div>
              <span className="text-sm">Position</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {POSITIONS.map((p) => (
                  <button key={p} onClick={() => set("position", p)}
                    className={`rounded-lg border px-3 py-2 text-sm ${cfg.position === p ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 hover:bg-neutral-50"}`}>
                    {p.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm">Launcher icon</span>
              <div className="mt-2 flex gap-2">
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => set("launcherIcon", ic)} aria-label={ic}
                    className={`grid h-11 w-11 place-items-center rounded-lg border ${cfg.launcherIcon === ic ? "border-neutral-900 ring-2 ring-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
                    dangerouslySetInnerHTML={{ __html: LAUNCHER_ICONS[ic].replace("<svg ", '<svg width="22" height="22" ') }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-neutral-700">Features shown</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {ALL_FEATURES.map((f) => {
              const on = cfg.featuresEnabled.includes(f.key);
              return (
                <button key={f.key} onClick={() => toggleFeature(f.key)} aria-pressed={on}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${on ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 text-neutral-500"}`}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-neutral-700">Branding</h3>
          <label className="mt-3 flex items-center gap-3">
            <input type="checkbox" checked={cfg.hideBranding} disabled={!canHideBranding}
              onChange={(e) => set("hideBranding", e.target.checked)} />
            <span className={`text-sm ${canHideBranding ? "" : "text-neutral-400"}`}>
              Hide &quot;Powered by Makoya&quot;{!canHideBranding && " (paid plans only)"}
            </span>
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
          {saveError && <span className="text-sm text-red-600">Save failed — please try again</span>}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <WidgetPreview color={cfg.primaryColor} position={cfg.position} icon={cfg.launcherIcon} />
        <p className="mt-2 text-center text-xs text-neutral-400">Live preview</p>
      </div>
    </div>
  );
}

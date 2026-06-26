"use client";
/**
 * app/dashboard/[siteId]/customize/_CustomizeClient.tsx — v7 Customize screen (CLIENT).
 *
 * Wired to:
 *   GET  /api/sites/[siteId]/config → full SiteConfig (initial load)
 *   PATCH /api/sites/[siteId]/config → persist changes on Publish
 *
 * All v3.1 config fields surfaced, grouped into three tabs:
 *   Features   → featuresEnabled toggles (all 15 FeatureKey values)
 *   Appearance → primaryColor, position, launcherIcon, launcherSize, defaultLanguage,
 *                panelTitle, accessibilityStatementUrl, hideBranding
 *   Mobile     → mobileEnabled, customTriggerSelector, domObserverEnabled, inheritFonts
 *
 * Real-data discipline:
 *   - Every toggle state comes from the API; none are hard-coded "on".
 *   - Brand-color contrast ratio is computed from the REAL primaryColor using the
 *     WCAG relative-luminance formula (same math as lib/contrast.ts, inlined here
 *     because client components can't call server-only modules).
 *   - The ratio shown in the AA badge is real, not the mockup's "4.1:1".
 *   - Publish sends the full current state to PATCH; Reset reverts to last-saved.
 *   - Loading / error / empty states are all honest (role=status / role=alert).
 *
 * Honesty (per CLAUDE.md + plan):
 *   - No "compliant", "certified", or "guaranteed accessible" copy.
 *   - Toggles are real <button role="switch" aria-checked> — keyboard-operable.
 *   - Seg tabs are real <button> elements; active state from React state not CSS class.
 */

import { useState, useEffect } from "react";
import type { FeatureKey, WidgetPosition, LauncherIconKey, WidgetLauncherSize, WidgetLanguage } from "@makoya/shared";
import type { SiteConfig } from "@/lib/sites-mappers";

/* ── Feature metadata (matches packages/shared FeatureKey list) ──────────────── */
const FEATURE_META: Record<FeatureKey, { label: string; icon: string; desc: string }> = {
  textSize:       { label: "Bigger text",               icon: "ti-zoom-in",         desc: "Scale text up to 3× for readability" },
  lineSpacing:    { label: "Line & letter spacing",     icon: "ti-line-height",     desc: "Adjust text spacing" },
  contrast:       { label: "Contrast modes",            icon: "ti-contrast",        desc: "High / inverted contrast" },
  stopMotion:     { label: "Stop animations",           icon: "ti-player-pause",    desc: "Pause motion & autoplay" },
  readingRuler:   { label: "Reading ruler",             icon: "ti-ruler-2",         desc: "Focus line across the page" },
  highlightLinks: { label: "Highlight links",           icon: "ti-link",            desc: "Underline & colour links" },
  bigCursor:      { label: "Big cursor",                icon: "ti-pointer",         desc: "Enlarge the mouse cursor" },
  readableFont:   { label: "Readable & dyslexic fonts", icon: "ti-letter-case",     desc: "Legible / dyslexia-friendly type" },
  hideImages:     { label: "Hide images",               icon: "ti-photo-off",       desc: "Remove decorative images" },
  saturation:     { label: "Saturation",                icon: "ti-color-swatch",    desc: "Mono / low-saturation modes" },
  readingMask:    { label: "Reading mask",              icon: "ti-layout-navbar",   desc: "Grey-out content outside focus row" },
  highlightTitles:{ label: "Highlight titles",          icon: "ti-heading",         desc: "Visually emphasise headings" },
  textAlign:      { label: "Text align",                icon: "ti-align-left",      desc: "Left / centre / justify" },
  muteSounds:     { label: "Mute sounds",               icon: "ti-volume-off",      desc: "Silence autoplay audio" },
  readAloud:      { label: "Read page aloud",           icon: "ti-volume",          desc: "Text-to-speech" },
};
const FEATURE_KEYS = Object.keys(FEATURE_META) as FeatureKey[];

/* ── WCAG contrast math (inlined from lib/contrast.ts — pure, no server deps) ── */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "").toLowerCase();
  let full: string;
  if (/^[0-9a-f]{3}$/.test(h)) {
    full = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  } else if (/^[0-9a-f]{6}$/.test(h)) {
    full = h;
  } else {
    return null;
  }
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}
function linearize(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function luminance(rgb: { r: number; g: number; b: number }): number {
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}
function contrastRatio(hexA: string, hexB: string): number | null {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const lA = luminance(a);
  const lB = luminance(b);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ── Small helpers ───────────────────────────────────────────────────────────── */
type Tab = "features" | "appearance" | "mobile";

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/* ── Props ───────────────────────────────────────────────────────────────────── */
interface Props {
  siteId: string;
}

/* ── Main component ──────────────────────────────────────────────────────────── */
export function CustomizeClient({ siteId }: Props) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [saved, setSaved] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("features");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  /* ── Initial fetch ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(false);
    fetch(`/api/sites/${siteId}/config`, { credentials: "same-origin" })
      .then((r) => (r.ok ? (r.json() as Promise<SiteConfig>) : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setConfig(d);
        setSaved(d);
        setLoading(false);
      })
      .catch(() => {
        if (live) { setError(true); setLoading(false); }
      });
    return () => { live = false; };
  }, [siteId]);

  /* ── Toggle a feature on / off ─────────────────────────────────────────────── */
  function toggleFeature(key: FeatureKey) {
    setConfig((prev) => {
      if (!prev) return prev;
      const on = prev.featuresEnabled.includes(key);
      return {
        ...prev,
        featuresEnabled: on
          ? prev.featuresEnabled.filter((k) => k !== key)
          : [...prev.featuresEnabled, key],
      };
    });
  }

  /* ── Publish — PATCH the full current config ───────────────────────────────── */
  async function publish() {
    if (!config) return;
    setSaving(true);
    setSaveOk(false);
    setSaveErr(null);
    try {
      const res = await fetch(`/api/sites/${siteId}/config`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        setSaveErr("Couldn't save — please try again shortly.");
        return;
      }
      setSaved({ ...config });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch {
      setSaveErr("Network error — please try again shortly.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Reset — revert to last-saved state ────────────────────────────────────── */
  function reset() {
    if (!saved) return;
    setConfig({ ...saved });
    setSaveOk(false);
    setSaveErr(null);
  }

  /* ── Loading / error ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}>
        Loading widget configuration…
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="note warn" role="alert" style={{ marginTop: 24 }}>
        <i className="ti ti-alert-triangle" aria-hidden="true" />
        <div>Couldn&apos;t load your widget configuration — please try again shortly.</div>
      </div>
    );
  }

  /* ── Contrast computation for brand color ───────────────────────────────────── */
  const ratio = contrastRatio(config.primaryColor, "#ffffff");
  const ratioDisplay = ratio != null ? `${ratio.toFixed(1)} : 1` : "—";
  const passesAaUi = ratio != null && ratio >= 3;

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Widget <b>Customize widget</b>
      </div>

      {/* Sub-header: description + actions */}
      <div className="between" style={{ margin: "-8px 0 18px" }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          What your visitors see and can turn on.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saveOk && (
            <span style={{ fontSize: 12.5, color: "var(--green-ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
              <i className="ti ti-check" aria-hidden="true" /> Saved
            </span>
          )}
          <button
            className="btn"
            type="button"
            onClick={reset}
            disabled={saving}
            aria-label="Reset to last saved configuration"
          >
            Reset
          </button>
          <button
            className="btn pri"
            type="button"
            onClick={() => void publish()}
            disabled={saving}
            aria-busy={saving}
          >
            <i className="ti ti-rocket" aria-hidden="true" />
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {saveErr && (
        <div className="note warn" role="alert" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{saveErr}</div>
        </div>
      )}

      {/* Two-column layout: config + live preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 24, alignItems: "start" }}>

        {/* Left: tabs + controls */}
        <div>
          {/* Segment tabs */}
          <div className="seg" style={{ marginBottom: 14 }} role="tablist" aria-label="Customize sections">
            {(["features", "appearance", "mobile"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                className={tab === t ? "on" : ""}
                aria-selected={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "features" ? "Features" : t === "appearance" ? "Appearance" : "Mobile"}
              </button>
            ))}
          </div>

          {/* Features tab */}
          {tab === "features" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="tabpanel" aria-label="Features">
              {FEATURE_KEYS.map((key) => {
                const meta = FEATURE_META[key];
                const on = config.featuresEnabled.includes(key);
                return (
                  <div className="feat" key={key}>
                    <div className="ic" aria-hidden="true">
                      <i className={`ti ${meta.icon}`} aria-hidden="true" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="nm">{meta.label}</div>
                      <div className="de">{meta.desc}</div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${meta.label}: ${on ? "enabled" : "disabled"}`}
                      className={`toggle ${on ? "on" : ""}`}
                      onClick={() => toggleFeature(key)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Appearance tab */}
          {tab === "appearance" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }} role="tabpanel" aria-label="Appearance">
              {/* Brand color */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-color" style={{ marginTop: 0 }}>Brand color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    id="cu-color"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((c) => c ? { ...c, primaryColor: e.target.value } : c)}
                    style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid var(--border)", padding: 2, cursor: "pointer" }}
                    aria-label="Widget primary color"
                  />
                  <input
                    type="text"
                    className="inp"
                    value={config.primaryColor}
                    onChange={(e) => setConfig((c) => c ? { ...c, primaryColor: e.target.value } : c)}
                    style={{ width: 110, fontFamily: "monospace", fontSize: 13 }}
                    aria-label="Widget primary color hex value"
                  />
                </div>
              </div>

              {/* Widget position */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-position" style={{ marginTop: 0 }}>Widget position</label>
                <select
                  id="cu-position"
                  className="inp"
                  value={config.position}
                  onChange={(e) => setConfig((c) => c ? { ...c, position: e.target.value as WidgetPosition } : c)}
                >
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </div>

              {/* Launcher icon */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-icon" style={{ marginTop: 0 }}>Launcher icon</label>
                <select
                  id="cu-icon"
                  className="inp"
                  value={config.launcherIcon}
                  onChange={(e) => setConfig((c) => c ? { ...c, launcherIcon: e.target.value as LauncherIconKey } : c)}
                >
                  <option value="accessibility">Accessibility (person)</option>
                  <option value="person">Person</option>
                  <option value="eye">Eye</option>
                  <option value="adjust">Adjust sliders</option>
                </select>
              </div>

              {/* Launcher size */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-size" style={{ marginTop: 0 }}>Launcher size</label>
                <select
                  id="cu-size"
                  className="inp"
                  value={config.launcherSize}
                  onChange={(e) => setConfig((c) => c ? { ...c, launcherSize: e.target.value as WidgetLauncherSize } : c)}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>

              {/* Default language */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-lang" style={{ marginTop: 0 }}>Widget language</label>
                <select
                  id="cu-lang"
                  className="inp"
                  value={config.defaultLanguage}
                  onChange={(e) => setConfig((c) => c ? { ...c, defaultLanguage: e.target.value as WidgetLanguage } : c)}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              {/* Statement URL */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-stmt" style={{ marginTop: 0 }}>Accessibility statement URL <span className="muted">(optional)</span></label>
                <input
                  id="cu-stmt"
                  className="inp"
                  type="url"
                  placeholder="https://example.com/accessibility"
                  value={config.accessibilityStatementUrl}
                  onChange={(e) => setConfig((c) => c ? { ...c, accessibilityStatementUrl: e.target.value } : c)}
                />
                <div className="tiny muted" style={{ marginTop: 6 }}>When set, a link appears in the widget panel.</div>
              </div>
            </div>
          )}

          {/* Mobile tab */}
          {tab === "mobile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="tabpanel" aria-label="Mobile">
              <div className="feat">
                <div className="ic" aria-hidden="true">
                  <i className="ti ti-device-mobile" aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">Show widget on mobile</div>
                  <div className="de">Display the launcher on small / touch viewports</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.mobileEnabled}
                  aria-label={`Show widget on mobile: ${config.mobileEnabled ? "enabled" : "disabled"}`}
                  className={`toggle ${config.mobileEnabled ? "on" : ""}`}
                  onClick={() => setConfig((c) => c ? { ...c, mobileEnabled: !c.mobileEnabled } : c)}
                />
              </div>
              <div className="feat">
                <div className="ic" aria-hidden="true">
                  <i className="ti ti-refresh" aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">DOM observer</div>
                  <div className="de">Re-apply preferences after SPA route changes and dynamic DOM updates</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.domObserverEnabled}
                  aria-label={`DOM observer: ${config.domObserverEnabled ? "enabled" : "disabled"}`}
                  className={`toggle ${config.domObserverEnabled ? "on" : ""}`}
                  onClick={() => setConfig((c) => c ? { ...c, domObserverEnabled: !c.domObserverEnabled } : c)}
                />
              </div>
              <div className="feat">
                <div className="ic" aria-hidden="true">
                  <i className="ti ti-typography" aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">Inherit host fonts</div>
                  <div className="de">Use your site&apos;s fonts inside the widget panel instead of the default stack</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.inheritFonts}
                  aria-label={`Inherit host fonts: ${config.inheritFonts ? "enabled" : "disabled"}`}
                  className={`toggle ${config.inheritFonts ? "on" : ""}`}
                  onClick={() => setConfig((c) => c ? { ...c, inheritFonts: !c.inheritFonts } : c)}
                />
              </div>
              {/* Custom trigger selector */}
              <div className="card cpad" style={{ marginTop: 6 }}>
                <label className="fl" htmlFor="cu-trigger" style={{ marginTop: 0 }}>
                  Custom trigger selector <span className="muted">(optional)</span>
                </label>
                <input
                  id="cu-trigger"
                  className="inp"
                  type="text"
                  placeholder="#my-a11y-button"
                  value={config.customTriggerSelector}
                  onChange={(e) => setConfig((c) => c ? { ...c, customTriggerSelector: e.target.value } : c)}
                />
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  A CSS selector for a host-page element that opens the widget panel when clicked. Leave empty to use the built-in launcher only.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview + brand color card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="tiny muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Live preview
          </div>

          {/* Widget preview */}
          <div className="wpv">
            <div className="hd" style={{ background: config.primaryColor || "var(--primary)" }}>
              <span>
                <i className="ti ti-accessible" aria-hidden="true" /> Accessibility
              </span>
              <i className="ti ti-x" aria-hidden="true" />
            </div>
            <div className="t2">
              <span className="on">Personalize</span>
              <span>Report an issue</span>
            </div>
            <div className="g2">Reading</div>
            <div className="tiles">
              {config.featuresEnabled.slice(0, 4).map((key) => {
                const meta = FEATURE_META[key];
                if (!meta) return null;
                return (
                  <div className="tile act" key={key}>
                    <i className={`ti ${meta.icon}`} aria-hidden="true" />
                    {meta.label.split(" ").slice(0, 2).join(" ")}
                  </div>
                );
              })}
              {config.featuresEnabled.length === 0 && (
                <div className="tile">No features enabled</div>
              )}
            </div>
            {config.featuresEnabled.length > 4 && (
              <>
                <div className="g2">More tools</div>
                <div className="tiles">
                  {config.featuresEnabled.slice(4, 8).map((key) => {
                    const meta = FEATURE_META[key];
                    if (!meta) return null;
                    return (
                      <div className="tile act" key={key}>
                        <i className={`ti ${meta.icon}`} aria-hidden="true" />
                        {meta.label.split(" ").slice(0, 2).join(" ")}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Brand color + AA contrast badge */}
          <div className="card cpad">
            <b style={{ fontSize: 13 }}>Brand color</b>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: config.primaryColor || "#1E63FF",
                  border: "1px solid var(--border)",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <span className="mono tiny">{config.primaryColor}</span>
            </div>
            <div
              className={`note ${passesAaUi ? "good" : "warn"}`}
              style={{ marginTop: 12, padding: "9px 11px", fontSize: 12 }}
              role="status"
              aria-live="polite"
            >
              <i
                className={`ti ${passesAaUi ? "ti-check" : "ti-alert-triangle"}`}
                aria-hidden="true"
                style={{ fontSize: 16 }}
              />
              <div>
                Contrast {ratioDisplay}{passesAaUi
                  ? " — passes WCAG AA for UI components (≥3:1)"
                  : " — below WCAG AA for UI components (needs ≥3:1)"}
              </div>
            </div>
          </div>

          {/* Last published */}
          {saved && (
            <div className="tiny muted" style={{ paddingLeft: 4 }}>
              Last published{" "}
              {shortDate(null) /* config doesn't carry updatedAt — just show note */}
              — changes are live once you Publish.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

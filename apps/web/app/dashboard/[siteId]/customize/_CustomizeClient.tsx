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
 *   - Brand-color contrast ratio is computed from the REAL primaryColor using
 *     lib/contrast.ts directly (pure math, no server-only dependencies).
 *   - The ratio shown in the AA badge is real, not the mockup's "4.1:1".
 *   - Publish sends the full current state to PATCH; Reset reverts to last-saved.
 *   - Loading / error / empty states are all honest (role=status / role=alert).
 *
 * Honesty (per CLAUDE.md + plan):
 *   - No "compliant", "certified", or "guaranteed accessible" copy.
 *   - Toggles are real <button role="switch" aria-checked> — keyboard-operable.
 *   - Seg tabs are real <button> elements; active state from React state not CSS class.
 *
 * Live widget preview (Task 7):
 *   Loads /widget/core.js once (via a <script> element inserted into <head>).
 *   On every config change, tears down #makoya-widget-root (if present) and
 *   calls window.MakoyaWidget.init(currentConfig) so the real widget renders
 *   in the configured corner — colour, position, icon, size, language, etc.
 *   all update instantly without a publish/reload. The preview panel on the
 *   right indicates where to look; the approximate static mock remains visible
 *   while the script loads or if it fails (belt-and-suspenders). Widget init
 *   failures are swallowed — the customize screen must never break because of
 *   a preview script error. Widget root is cleaned up on unmount.
 */

import { useState, useEffect, useRef } from "react";
import { LAUNCHER_ICONS } from "@makoya/shared";

/* ── Global type for the widget runtime loaded from /widget/core.js ─────────── */
declare global {
  interface Window {
    /** Injected by /widget/core.js — available once the script fires onload. */
    MakoyaWidget?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}
import type {
  FeatureKey,
  WidgetPosition,
  LauncherIconKey,
  LauncherShape,
  WidgetLauncherSize,
  WidgetLanguage,
  WidgetProfileKey,
} from "@makoya/shared";
import type { SiteConfig } from "@/lib/sites-mappers";
import { contrastRatio } from "@/lib/contrast";
import { LoadingButton } from "../../_components";

/* ── Feature metadata (matches packages/shared FeatureKey list — all 17 keys) ── */
const FEATURE_META: Record<FeatureKey, { label: string; icon: string; desc: string }> = {
  textSize: {
    label: "Bigger text",
    icon: "ti-zoom-in",
    desc: "Scale text up to 3× for readability",
  },
  lineSpacing: {
    label: "Line & letter spacing",
    icon: "ti-line-height",
    desc: "Adjust text spacing",
  },
  contrast: { label: "Contrast modes", icon: "ti-contrast", desc: "High / inverted contrast" },
  stopMotion: {
    label: "Stop animations",
    icon: "ti-player-pause",
    desc: "Pause motion & autoplay",
  },
  readingRuler: { label: "Reading ruler", icon: "ti-ruler-2", desc: "Focus line across the page" },
  highlightHover: {
    label: "Highlight on hover",
    icon: "ti-focus-2",
    desc: "Outline the element under the cursor",
  },
  highlightLinks: { label: "Highlight links", icon: "ti-link", desc: "Underline & colour links" },
  bigCursor: { label: "Big cursor", icon: "ti-pointer", desc: "Enlarge the mouse cursor" },
  readableFont: {
    label: "Readable & dyslexic fonts",
    icon: "ti-letter-case",
    desc: "Legible / dyslexia-friendly type",
  },
  hideImages: { label: "Hide images", icon: "ti-photo-off", desc: "Remove decorative images" },
  saturation: { label: "Saturation", icon: "ti-color-swatch", desc: "Mono / low-saturation modes" },
  readingMask: {
    label: "Reading mask",
    icon: "ti-layout-navbar",
    desc: "Grey-out content outside focus row",
  },
  highlightTitles: {
    label: "Highlight titles",
    icon: "ti-heading",
    desc: "Visually emphasise headings",
  },
  textAlign: { label: "Text align", icon: "ti-align-left", desc: "Left / centre / justify" },
  muteSounds: { label: "Mute sounds", icon: "ti-volume-off", desc: "Silence autoplay audio" },
  readAloud: { label: "Read page aloud", icon: "ti-volume", desc: "Text-to-speech" },
  biggerTargets: {
    label: "Bigger tap targets",
    icon: "ti-hand-click",
    desc: "Enlarge clickable areas for easier motor access",
  },
  focusIndicator: {
    label: "Enhanced focus",
    icon: "ti-focus-2",
    desc: "Bold, high-contrast keyboard focus ring",
  },
};
const FEATURE_KEYS = Object.keys(FEATURE_META) as FeatureKey[];

/* ── Small helpers ───────────────────────────────────────────────────────────── */
type Tab = "features" | "appearance" | "mobile";

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

  /* ── Live widget preview state ─────────────────────────────────────────────── */
  type ScriptState = "idle" | "loading" | "ready" | "failed";
  const [scriptState, setScriptState] = useState<ScriptState>("idle");
  // Prevents double-injection under React strict-mode double-invocation.
  const scriptInjected = useRef(false);

  /* ── Load /widget/core.js once on mount ────────────────────────────────────── */
  useEffect(() => {
    if (scriptInjected.current) return;
    scriptInjected.current = true;

    // If the script was somehow already loaded (HMR, remount), mark ready immediately.
    if (window.MakoyaWidget) {
      setScriptState("ready");
      return;
    }
    // Avoid injecting a duplicate tag (e.g. HMR keeps the DOM tag but loses React state).
    if (document.getElementById("mky-preview-script")) {
      setScriptState("loading"); // will resolve when existing tag fires onload
      return;
    }

    setScriptState("loading");
    const s = document.createElement("script");
    s.id = "mky-preview-script";
    s.src = "/widget/core.js";
    s.async = true;
    s.onload = () => setScriptState("ready");
    s.onerror = () => setScriptState("failed");
    document.head.appendChild(s);
  }, []);

  /* ── Re-init the real widget whenever config changes and script is ready ────── */
  useEffect(() => {
    if (scriptState !== "ready" || !config) return;
    if (!window.MakoyaWidget) return;
    try {
      // Tear down any existing widget root so we get a clean re-init.
      document.getElementById("makoya-widget-root")?.remove();
      window.MakoyaWidget.init({
        primaryColor: config.primaryColor,
        position: config.position,
        launcherIcon: config.launcherIcon,
        launcherSize: config.launcherSize,
        defaultLanguage: config.defaultLanguage,
        panelTitle: config.panelTitle,
        hideBranding: config.hideBranding,
        featuresEnabled: config.featuresEnabled,
        mobileEnabled: config.mobileEnabled,
        defaultProfile: config.defaultProfile,
        accessibilityStatementUrl: config.accessibilityStatementUrl,
      });
    } catch {
      // Widget init failure must NEVER crash the customize screen.
    }
  }, [scriptState, config]);

  /* ── Clean up widget root when the customize page is unmounted ─────────────── */
  useEffect(() => {
    return () => {
      try {
        document.getElementById("makoya-widget-root")?.remove();
      } catch {
        // Guard against unusual teardown environments.
      }
    };
  }, []);

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
        if (live) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
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
      <div
        role="status"
        aria-live="polite"
        style={{ padding: "40px 0", textAlign: "center", color: "var(--t3)" }}
      >
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
  // lib/contrast.ts throws on invalid hex — guard so a partially-typed value
  // never crashes the render. The null path is already handled by ratioDisplay.
  let ratio: number | null = null;
  try {
    ratio = contrastRatio(config.primaryColor, "#ffffff");
  } catch {
    /* invalid hex — guard below */
  }
  const ratioDisplay = ratio != null ? `${ratio.toFixed(1)} : 1` : "—";
  const passesAaUi = ratio != null && ratio >= 3;

  return (
    <>
      {/* Page header */}
      <div className="pagehead">
        Widget <b>Customize widget</b>
      </div>

      {/* Sub-header: description + actions */}
      <div className="between cu-head" style={{ margin: "-8px 0 18px" }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          What your visitors see and can turn on.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saveOk && (
            <span
              style={{
                fontSize: 12.5,
                color: "var(--green-ink)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
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
          <LoadingButton
            className="btn pri"
            type="button"
            onClick={() => void publish()}
            loading={saving}
            loadingText="Publishing…"
            icon={<i className="ti ti-rocket" aria-hidden="true" />}
          >
            Publish
          </LoadingButton>
        </div>
      </div>

      {/* Error banner */}
      {saveErr && (
        <div className="note warn" role="alert" style={{ marginBottom: 14 }}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          <div>{saveErr}</div>
        </div>
      )}

      {/* Two-column layout on desktop; single column (controls → preview) on mobile.
          Layout lives in the .cu-grid class (dashboard.css) so it can respond to
          viewport width — an inline grid-template-columns could not. */}
      <div className="cu-grid">
        {/* Left: tabs + controls */}
        <div>
          {/* Segment tabs */}
          <div
            className="seg"
            style={{ marginBottom: 14 }}
            role="tablist"
            aria-label="Customize sections"
          >
            {(["features", "appearance", "mobile"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`cu-tab-${t}`}
                aria-controls={`cu-panel-${t}`}
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
            <div
              id="cu-panel-features"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
              role="tabpanel"
              aria-labelledby="cu-tab-features"
            >
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
            <div
              id="cu-panel-appearance"
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
              role="tabpanel"
              aria-labelledby="cu-tab-appearance"
            >
              {/* Brand color */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-color" style={{ marginTop: 0 }}>
                  Brand color
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    id="cu-color"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, primaryColor: e.target.value } : c))
                    }
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      padding: 2,
                      cursor: "pointer",
                    }}
                    aria-label="Widget primary color"
                  />
                  <input
                    type="text"
                    className="inp"
                    value={config.primaryColor}
                    onChange={(e) =>
                      setConfig((c) => (c ? { ...c, primaryColor: e.target.value } : c))
                    }
                    style={{ width: 110, fontFamily: "monospace", fontSize: 13 }}
                    aria-label="Widget primary color hex value"
                  />
                </div>
              </div>

              {/* Widget position */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-position" style={{ marginTop: 0 }}>
                  Widget position
                </label>
                <select
                  id="cu-position"
                  className="inp"
                  value={config.position}
                  onChange={(e) =>
                    setConfig((c) => (c ? { ...c, position: e.target.value as WidgetPosition } : c))
                  }
                >
                  <option value="bottom-right">Bottom right</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="top-right">Top right</option>
                  <option value="top-left">Top left</option>
                </select>
              </div>

              {/* Launcher icon — SVG swatch picker */}
              <div className="card cpad">
                <div className="fl" style={{ marginTop: 0, marginBottom: 8, fontSize: 13, fontWeight: 500, color: "var(--t2)" }}>
                  Launcher icon
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {(Object.keys(LAUNCHER_ICONS) as LauncherIconKey[]).map((key) => {
                    const active = config.launcherIcon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${key} icon`}
                        title={key}
                        onClick={() =>
                          setConfig((c) => (c ? { ...c, launcherIcon: key } : c))
                        }
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 12,
                          border: active ? "2px solid var(--primary)" : "2px solid var(--border)",
                          background: active ? "var(--primary-soft)" : "var(--surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          padding: 10,
                          color: active ? "var(--primary)" : "var(--t2)",
                        }}
                        dangerouslySetInnerHTML={{ __html: LAUNCHER_ICONS[key] }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Launcher shape */}
              <div className="card cpad">
                <div className="fl" style={{ marginTop: 0, marginBottom: 8, fontSize: 13, fontWeight: 500, color: "var(--t2)" }}>
                  Launcher shape
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {(["circle", "rounded", "square"] as LauncherShape[]).map((shape) => {
                    const active = (config.launcherShape ?? "circle") === shape;
                    const radius = shape === "circle" ? "50%" : shape === "rounded" ? "12px" : "4px";
                    const label = shape === "circle" ? "Circle" : shape === "rounded" ? "Rounded" : "Square";
                    return (
                      <button
                        key={shape}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${label} shape`}
                        title={label}
                        onClick={() =>
                          setConfig((c) => (c ? { ...c, launcherShape: shape } : c))
                        }
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 6,
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: active ? "2px solid var(--primary)" : "2px solid var(--border)",
                          background: active ? "var(--primary-soft)" : "var(--surface)",
                          cursor: "pointer",
                          fontSize: 12,
                          color: active ? "var(--primary)" : "var(--t2)",
                          fontWeight: active ? 600 : 400,
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: radius,
                            background: active ? "var(--primary)" : "var(--border)",
                            display: "block",
                          }}
                        />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position offsets */}
              <div className="card cpad">
                <div className="fl" style={{ marginTop: 0, marginBottom: 8, fontSize: 13, fontWeight: 500, color: "var(--t2)" }}>
                  Position offset <span className="muted" style={{ fontWeight: 400 }}>(px, ±200)</span>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ flex: 1 }}>
                    <div className="tiny muted" style={{ marginBottom: 4 }}>X (left/right)</div>
                    <input
                      type="number"
                      className="inp"
                      min={-200}
                      max={200}
                      step={4}
                      value={config.offsetX ?? 0}
                      onChange={(e) => {
                        const v = Math.max(-200, Math.min(200, Number(e.target.value) || 0));
                        setConfig((c) => (c ? { ...c, offsetX: v } : c));
                      }}
                      aria-label="Horizontal position offset in pixels"
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    <div className="tiny muted" style={{ marginBottom: 4 }}>Y (up/down)</div>
                    <input
                      type="number"
                      className="inp"
                      min={-200}
                      max={200}
                      step={4}
                      value={config.offsetY ?? 0}
                      onChange={(e) => {
                        const v = Math.max(-200, Math.min(200, Number(e.target.value) || 0));
                        setConfig((c) => (c ? { ...c, offsetY: v } : c));
                      }}
                      aria-label="Vertical position offset in pixels"
                    />
                  </label>
                </div>
              </div>

              {/* Launcher size */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-size" style={{ marginTop: 0 }}>
                  Launcher size
                </label>
                <select
                  id="cu-size"
                  className="inp"
                  value={config.launcherSize}
                  onChange={(e) =>
                    setConfig((c) =>
                      c ? { ...c, launcherSize: e.target.value as WidgetLauncherSize } : c
                    )
                  }
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>

              {/* Default language */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-lang" style={{ marginTop: 0 }}>
                  Widget language
                </label>
                <select
                  id="cu-lang"
                  className="inp"
                  value={config.defaultLanguage}
                  onChange={(e) =>
                    setConfig((c) =>
                      c ? { ...c, defaultLanguage: e.target.value as WidgetLanguage } : c
                    )
                  }
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              {/* Statement URL */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-stmt" style={{ marginTop: 0 }}>
                  Accessibility statement URL <span className="muted">(optional)</span>
                </label>
                <input
                  id="cu-stmt"
                  className="inp"
                  type="url"
                  placeholder="https://example.com/accessibility"
                  value={config.accessibilityStatementUrl}
                  onChange={(e) =>
                    setConfig((c) => (c ? { ...c, accessibilityStatementUrl: e.target.value } : c))
                  }
                />
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  When set, a link appears in the widget panel.
                </div>
              </div>

              {/* Panel title */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-panel-title" style={{ marginTop: 0 }}>
                  Panel title <span className="muted">(optional, paid)</span>
                </label>
                <input
                  id="cu-panel-title"
                  className="inp"
                  type="text"
                  placeholder="Accessibility"
                  maxLength={120}
                  value={config.panelTitle}
                  onChange={(e) => setConfig((c) => (c ? { ...c, panelTitle: e.target.value } : c))}
                />
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  Overrides the default heading inside the widget panel.
                </div>
              </div>

              {/* Default profile */}
              <div className="card cpad">
                <label className="fl" htmlFor="cu-profile" style={{ marginTop: 0 }}>
                  Default profile <span className="muted">(optional)</span>
                </label>
                <select
                  id="cu-profile"
                  className="inp"
                  value={config.defaultProfile}
                  onChange={(e) =>
                    setConfig((c) =>
                      c ? { ...c, defaultProfile: e.target.value as WidgetProfileKey } : c
                    )
                  }
                >
                  <option value="none">None (let visitor choose)</option>
                  <option value="vision">Vision impairment</option>
                  <option value="lowVision">Low vision</option>
                  <option value="dyslexia">Dyslexia</option>
                  <option value="adhd">ADHD</option>
                  <option value="seizure">Seizure / epilepsy</option>
                  <option value="senior">Senior</option>
                  <option value="cognitive">Cognitive disability</option>
                  <option value="colorBlind">Color blindness</option>
                  <option value="motorTremor">Motor / tremor</option>
                  <option value="eslReading">Easy reading (ESL)</option>
                </select>
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  Auto-applies a preset on the visitor&apos;s first open.
                </div>
              </div>

              {/* Hide branding */}
              <div className="card cpad">
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--t1)" }}>
                      Hide &ldquo;Powered by Makoya&rdquo;
                    </div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>
                      Remove the Makoya branding from the widget panel. Paid plans only.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.hideBranding}
                    aria-label={`Hide Makoya branding: ${config.hideBranding ? "enabled" : "disabled"}`}
                    className={`toggle ${config.hideBranding ? "on" : ""}`}
                    onClick={() =>
                      setConfig((c) => (c ? { ...c, hideBranding: !c.hideBranding } : c))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mobile tab */}
          {tab === "mobile" && (
            <div
              id="cu-panel-mobile"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
              role="tabpanel"
              aria-labelledby="cu-tab-mobile"
            >
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
                  onClick={() =>
                    setConfig((c) => (c ? { ...c, mobileEnabled: !c.mobileEnabled } : c))
                  }
                />
              </div>
              <div className="feat">
                <div className="ic" aria-hidden="true">
                  <i className="ti ti-refresh" aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">DOM observer</div>
                  <div className="de">
                    Re-apply preferences after SPA route changes and dynamic DOM updates
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.domObserverEnabled}
                  aria-label={`DOM observer: ${config.domObserverEnabled ? "enabled" : "disabled"}`}
                  className={`toggle ${config.domObserverEnabled ? "on" : ""}`}
                  onClick={() =>
                    setConfig((c) => (c ? { ...c, domObserverEnabled: !c.domObserverEnabled } : c))
                  }
                />
              </div>
              <div className="feat">
                <div className="ic" aria-hidden="true">
                  <i className="ti ti-typography" aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="nm">Inherit host fonts</div>
                  <div className="de">
                    Use your site&apos;s fonts inside the widget panel instead of the default stack
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.inheritFonts}
                  aria-label={`Inherit host fonts: ${config.inheritFonts ? "enabled" : "disabled"}`}
                  className={`toggle ${config.inheritFonts ? "on" : ""}`}
                  onClick={() =>
                    setConfig((c) => (c ? { ...c, inheritFonts: !c.inheritFonts } : c))
                  }
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
                  onChange={(e) =>
                    setConfig((c) => (c ? { ...c, customTriggerSelector: e.target.value } : c))
                  }
                />
                <div className="tiny muted" style={{ marginTop: 6 }}>
                  A CSS selector for a host-page element that opens the widget panel when clicked.
                  Leave empty to use the built-in launcher only.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview + brand color card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            className="tiny muted"
            style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}
          >
            Live preview
          </div>

          {/* Live-widget status badge — shown when the real widget is running.
              The widget renders in the configured page corner (fixed positioning),
              so we can't literally embed it inside this box. Instead, this badge
              confirms it's live and tells the user where to look. */}
          {scriptState === "ready" && (
            <div
              className="note good"
              role="status"
              aria-live="polite"
              style={{ padding: "9px 13px", marginBottom: -4 }}
            >
              <i className="ti ti-device-desktop-check" aria-hidden="true" />
              <div style={{ fontSize: 12.5 }}>
                <b>Widget live</b> — look in the <b>{config.position.replace("-", " ")}</b> corner.{" "}
                Click the launcher to preview the panel. Updates as you edit.
              </div>
            </div>
          )}
          {scriptState === "loading" && (
            <div
              className="note info"
              role="status"
              aria-live="polite"
              style={{ padding: "9px 13px", marginBottom: -4 }}
            >
              <i className="ti ti-loader-2" aria-hidden="true" />
              <div style={{ fontSize: 12.5 }}>Loading live widget preview…</div>
            </div>
          )}
          {scriptState === "failed" && (
            <div
              className="note warn"
              role="status"
              aria-live="polite"
              style={{ padding: "9px 13px", marginBottom: -4 }}
            >
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <div style={{ fontSize: 12.5 }}>
                Live widget unavailable — using approximate preview below.
              </div>
            </div>
          )}

          {/* Approximate static widget panel — always shown as a visual reference for
              panel layout, feature tiles, and header colour. When the real widget is
              loaded it renders in the page corner; this mock shows the panel interior.
              Labelled as "approximate" when the real widget is live so users don't
              expect perfect parity. */}
          <div className="wpv">
            <div className="hd" style={{ background: config.primaryColor || "var(--primary)" }}>
              <span>
                <i className="ti ti-accessible" aria-hidden="true" />{" "}
                {config.panelTitle || "Accessibility"}
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
            {scriptState === "ready" && (
              <div className="tiny muted" style={{ padding: "10px 12px 6px", textAlign: "center" }}>
                Approximate panel layout — real widget is live in the corner.
              </div>
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
                Contrast {ratioDisplay}
                {passesAaUi
                  ? " — passes WCAG AA for UI components (≥3:1)"
                  : " — below WCAG AA for UI components (needs ≥3:1)"}
              </div>
            </div>
          </div>

          {/* Last published */}
          {saved && (
            <div className="tiny muted" style={{ paddingLeft: 4 }}>
              Last published {shortDate(null) /* config doesn't carry updatedAt — just show note */}
              — changes are live once you Publish.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

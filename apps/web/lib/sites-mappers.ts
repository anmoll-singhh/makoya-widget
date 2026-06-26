import type { WidgetPosition, FeatureKey, LauncherIconKey, WidgetLauncherSize, WidgetLanguage, WidgetProfileKey } from "@makoya/shared";

export interface SiteConfig {
  siteId: string;
  primaryColor: string;
  position: WidgetPosition;
  launcherIcon: LauncherIconKey;
  featuresEnabled: FeatureKey[];
  hideBranding: boolean;
  launcherSize: WidgetLauncherSize;
  defaultProfile: WidgetProfileKey;
  accessibilityStatementUrl: string;
  defaultLanguage: WidgetLanguage;
  panelTitle: string;
  // v3.1 widget-runtime extras (served in the public config — safe display fields).
  customTriggerSelector: string;
  domObserverEnabled: boolean;
  inheritFonts: boolean;
  mobileEnabled: boolean;
}

export function rowToConfig(row: any): SiteConfig {
  return {
    siteId: row.site_id,
    primaryColor: row.primary_color,
    position: row.position,
    launcherIcon: row.launcher_icon,
    featuresEnabled: row.features_enabled,
    hideBranding: row.hide_branding,
    launcherSize: row.launcher_size ?? "md",
    defaultProfile: row.default_profile ?? "none",
    accessibilityStatementUrl: row.accessibility_statement_url ?? "",
    defaultLanguage: row.default_language ?? "en",
    panelTitle: row.panel_title ?? "",
    customTriggerSelector: row.custom_trigger_selector ?? "",
    domObserverEnabled: row.dom_observer_enabled ?? true,
    inheritFonts: row.inherit_fonts ?? false,
    mobileEnabled: row.mobile_enabled ?? true,
  };
}

export function configToRow(patch: Partial<SiteConfig>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.primaryColor !== undefined) out.primary_color = patch.primaryColor;
  if (patch.position !== undefined) out.position = patch.position;
  if (patch.launcherIcon !== undefined) out.launcher_icon = patch.launcherIcon;
  if (patch.featuresEnabled !== undefined) out.features_enabled = patch.featuresEnabled;
  if (patch.hideBranding !== undefined) out.hide_branding = patch.hideBranding;
  if (patch.launcherSize !== undefined) out.launcher_size = patch.launcherSize;
  if (patch.defaultProfile !== undefined) out.default_profile = patch.defaultProfile;
  if (patch.accessibilityStatementUrl !== undefined) out.accessibility_statement_url = patch.accessibilityStatementUrl;
  if (patch.defaultLanguage !== undefined) out.default_language = patch.defaultLanguage;
  if (patch.panelTitle !== undefined) out.panel_title = patch.panelTitle;
  if (patch.customTriggerSelector !== undefined) out.custom_trigger_selector = patch.customTriggerSelector;
  if (patch.domObserverEnabled !== undefined) out.dom_observer_enabled = patch.domObserverEnabled;
  if (patch.inheritFonts !== undefined) out.inherit_fonts = patch.inheritFonts;
  if (patch.mobileEnabled !== undefined) out.mobile_enabled = patch.mobileEnabled;
  return out;
}

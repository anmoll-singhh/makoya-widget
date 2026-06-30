import type {
  WidgetPosition,
  FeatureKey,
  LauncherIconKey,
  WidgetLauncherSize,
  WidgetLanguage,
  WidgetProfileKey,
  LauncherShape,
} from "@makoya/shared";

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
  // Task 1 + Task 3: launcher shape + position offsets.
  launcherShape: LauncherShape;
  offsetX: number;
  offsetY: number;
  /**
   * accessiBe-parity: enables the AI Text Simplification tool for this site.
   * Defaults false (ships OFF); the `/api/widget-simplify` route refuses unless
   * this is true. Safe even before the DB column exists — rowToConfig defaults
   * it to false.
   */
  aiSimplifyEnabled: boolean;
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
    launcherShape: row.launcher_shape ?? "circle",
    offsetX: row.offset_x ?? 0,
    offsetY: row.offset_y ?? 0,
    aiSimplifyEnabled: row.ai_simplify_enabled ?? false,
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
  if (patch.accessibilityStatementUrl !== undefined)
    out.accessibility_statement_url = patch.accessibilityStatementUrl;
  if (patch.defaultLanguage !== undefined) out.default_language = patch.defaultLanguage;
  if (patch.panelTitle !== undefined) out.panel_title = patch.panelTitle;
  if (patch.customTriggerSelector !== undefined)
    out.custom_trigger_selector = patch.customTriggerSelector;
  if (patch.domObserverEnabled !== undefined) out.dom_observer_enabled = patch.domObserverEnabled;
  if (patch.inheritFonts !== undefined) out.inherit_fonts = patch.inheritFonts;
  if (patch.mobileEnabled !== undefined) out.mobile_enabled = patch.mobileEnabled;
  if (patch.launcherShape !== undefined) out.launcher_shape = patch.launcherShape;
  if (patch.offsetX !== undefined) out.offset_x = patch.offsetX;
  if (patch.offsetY !== undefined) out.offset_y = patch.offsetY;
  if (patch.aiSimplifyEnabled !== undefined) out.ai_simplify_enabled = patch.aiSimplifyEnabled;
  return out;
}

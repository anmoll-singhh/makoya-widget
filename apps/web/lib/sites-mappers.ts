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
  return out;
}

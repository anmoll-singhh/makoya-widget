import type { WidgetPosition, FeatureKey, LauncherIconKey } from "@makoya/shared";

export interface SiteConfig {
  siteId: string;
  primaryColor: string;
  position: WidgetPosition;
  launcherIcon: LauncherIconKey;
  featuresEnabled: FeatureKey[];
  hideBranding: boolean;
}

export function rowToConfig(row: any): SiteConfig {
  return {
    siteId: row.site_id,
    primaryColor: row.primary_color,
    position: row.position,
    launcherIcon: row.launcher_icon,
    featuresEnabled: row.features_enabled,
    hideBranding: row.hide_branding,
  };
}

export function configToRow(patch: Partial<SiteConfig>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.primaryColor !== undefined) out.primary_color = patch.primaryColor;
  if (patch.position !== undefined) out.position = patch.position;
  if (patch.launcherIcon !== undefined) out.launcher_icon = patch.launcherIcon;
  if (patch.featuresEnabled !== undefined) out.features_enabled = patch.featuresEnabled;
  if (patch.hideBranding !== undefined) out.hide_branding = patch.hideBranding;
  return out;
}

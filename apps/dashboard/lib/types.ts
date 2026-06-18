// Re-export the shared widget config + dashboard-only types.
export type {
  WidgetConfig, FeatureKey, WidgetPosition,
} from "@makoya/shared";
export { DEFAULT_CONFIG, resolveConfig } from "@makoya/shared";

export interface Site {
  id: string;
  ownerEmail: string;
  domain: string;
  plan: "free" | "pro" | "managed";
  createdAt: string;
}
export interface SiteConfigRow {
  siteId: string;
  primaryColor: string;
  position: string;
  featuresEnabled: string[];
  hideBranding: boolean;
}
export interface Scan {
  id: string;
  siteId: string | null;
  url: string;
  score: number;
  totals: { critical: number; serious: number; moderate: number; minor: number };
  scannedAt: string;
}
export interface Lead {
  id: string;
  email: string;
  url: string;
  scanId: string | null;
  status: "new" | "contacted" | "audit" | "won" | "lost";
  createdAt: string;
}

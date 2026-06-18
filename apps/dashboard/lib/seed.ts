// Demo data so the dashboard looks alive in mock mode.
import type { Site, SiteConfigRow, Scan, Lead } from "./types";

export const seedSites: Site[] = [
  { id: "11111111-1111-4111-8111-111111111111", ownerEmail: "demo@makoya.dev", domain: "joes-pizza.example", plan: "free", createdAt: "2026-05-01T10:00:00Z" },
  { id: "22222222-2222-4222-8222-222222222222", ownerEmail: "demo@makoya.dev", domain: "blue-spa.example", plan: "pro", createdAt: "2026-05-10T10:00:00Z" },
];

export const seedConfigs: SiteConfigRow[] = [
  { siteId: "11111111-1111-4111-8111-111111111111", primaryColor: "#2563eb", position: "bottom-right", featuresEnabled: ["textSize","lineSpacing","contrast","stopMotion","readingRuler","highlightLinks","bigCursor"], hideBranding: false },
  { siteId: "22222222-2222-4222-8222-222222222222", primaryColor: "#0ea5a4", position: "bottom-left", featuresEnabled: ["textSize","contrast","stopMotion","readingRuler"], hideBranding: true },
];

export const seedScans: Scan[] = [
  { id: "aaaa1111-0000-4000-8000-000000000001", siteId: "11111111-1111-4111-8111-111111111111", url: "https://joes-pizza.example", score: 41, totals: { critical: 6, serious: 9, moderate: 5, minor: 3 }, scannedAt: "2026-05-02T09:00:00Z" },
  { id: "aaaa1111-0000-4000-8000-000000000002", siteId: "22222222-2222-4222-8222-222222222222", url: "https://blue-spa.example", score: 78, totals: { critical: 0, serious: 3, moderate: 4, minor: 6 }, scannedAt: "2026-05-11T09:00:00Z" },
];

export const seedLeads: Lead[] = [
  { id: "bbbb1111-0000-4000-8000-000000000001", email: "owner@joes-pizza.example", url: "https://joes-pizza.example", scanId: "aaaa1111-0000-4000-8000-000000000001", status: "new", createdAt: "2026-05-02T09:05:00Z" },
  { id: "bbbb1111-0000-4000-8000-000000000002", email: "hi@green-cafe.example", url: "https://green-cafe.example", scanId: null, status: "contacted", createdAt: "2026-05-03T11:00:00Z" },
  { id: "bbbb1111-0000-4000-8000-000000000003", email: "team@loud-gym.example", url: "https://loud-gym.example", scanId: null, status: "audit", createdAt: "2026-05-04T14:00:00Z" },
];

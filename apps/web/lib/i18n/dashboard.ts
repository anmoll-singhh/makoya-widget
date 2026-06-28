/**
 * lib/i18n/dashboard.ts
 *
 * Internationalisation dictionary for the Makoya client dashboard UI.
 * Mirrors the widget's i18n pattern (packages/widget/src/ui/i18n.ts) but is
 * kept SEPARATE — the widget bundle must not import from apps/web, and this
 * module must not import from the widget package. Both share the same 4-lang
 * design; the implementations are independent.
 *
 * Design decisions:
 *   - `DASHBOARD_STRINGS` is typed as `Record<Lang, Record<DashboardStringKey, string>>`
 *     so any missing key in any language is a compile-time error. Completeness
 *     is enforced by the type system, not by runtime checks.
 *   - `t()` has a runtime fallback to English for unknown lang values at runtime
 *     (e.g. a corrupted cookie) even though the type system prevents it at
 *     compile time.
 *   - Coverage is intentionally incremental: shell/nav chrome + common action
 *     labels + page headings. Individual per-screen strings can be added here
 *     and consumed via `useT()` from DashboardI18nProvider in a follow-up pass.
 *     A comment at the bottom marks where to extend.
 *   - No "WCAG/ADA/compliant/guaranteed accessible" copy anywhere.
 *   - Translations are kept short and UI-appropriate (nav labels, not prose).
 */

// ---------------------------------------------------------------------------
// Lang — same four values as the widget, but NOT imported from it.
// ---------------------------------------------------------------------------

export type Lang = "en" | "es" | "fr" | "de";

/** Human-readable name for each language, shown in the language selector. */
export const LANG_LABELS: Record<Lang, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

// ---------------------------------------------------------------------------
// DashboardStringKey — every UI string the dashboard currently translates.
// Add new keys here + corresponding strings in DASHBOARD_STRINGS below.
// ---------------------------------------------------------------------------

export type DashboardStringKey =
  // Sidebar navigation labels
  | "nav_dashboard"
  | "nav_agents"
  | "nav_overview"
  | "nav_mike"
  | "nav_widget"
  | "nav_install"
  | "nav_customize"
  | "nav_compliance"
  | "nav_statement"
  | "nav_proof"
  | "nav_insights"
  | "nav_reports"
  | "nav_analytics"
  | "nav_agent_settings"
  | "nav_account"
  | "nav_billing"
  | "nav_partners"
  | "nav_help"
  | "nav_manage_agents"
  | "nav_select_agent"
  | "nav_no_agents"

  // Topbar / shell chrome
  | "topbar_search"
  | "topbar_notifications"
  | "language"
  | "skip_to_content"
  | "sidebar_open"
  | "sidebar_close"

  // User menu
  | "user_account"
  | "user_sign_out"

  // Status bar
  | "status_bar"
  | "status_ok"

  // Common action labels (reusable across screens)
  | "action_save"
  | "action_publish"
  | "action_reset"
  | "action_cancel"
  | "action_download"
  | "action_download_pdf"
  | "action_verify"
  | "action_loading"
  | "action_back"
  | "action_edit"
  | "action_delete"
  | "action_retry"
  | "action_close"
  | "action_copy"
  | "action_rescan"
  | "action_scan"

  // Page headings
  | "page_overview"
  | "page_install"
  | "page_customize"
  | "page_reports"
  | "page_account"
  | "page_billing"
  | "page_agents"
  | "page_statement";

// ---------------------------------------------------------------------------
// DASHBOARD_STRINGS — full translations for all four languages.
// Record<Lang, Record<DashboardStringKey, string>> guarantees every Lang
// covers every DashboardStringKey at compile time.
// ---------------------------------------------------------------------------

export const DASHBOARD_STRINGS: Record<Lang, Record<DashboardStringKey, string>> = {
  // -------------------------------------------------------------------------
  // English
  // -------------------------------------------------------------------------
  en: {
    nav_dashboard: "Dashboard",
    nav_agents: "Agents",
    nav_overview: "Overview",
    nav_mike: "Mike — audit",
    nav_widget: "Widget",
    nav_install: "Install",
    nav_customize: "Customize",
    nav_compliance: "Compliance",
    nav_statement: "Accessibility statement",
    nav_proof: "Proof of effort",
    nav_insights: "Insights",
    nav_reports: "Reports",
    nav_analytics: "Analytics",
    nav_agent_settings: "Agent settings",
    nav_account: "Account",
    nav_billing: "Plan & billing",
    nav_partners: "Partners",
    nav_help: "Help",
    nav_manage_agents: "Manage agents",
    nav_select_agent: "Select agent",
    nav_no_agents: "No agents",
    topbar_search: "Search…",
    topbar_notifications: "Notifications",
    language: "Language",
    skip_to_content: "Skip to main content",
    sidebar_open: "Open navigation menu",
    sidebar_close: "Close navigation menu",
    user_account: "Account",
    user_sign_out: "Sign out",
    status_bar: "Status",
    status_ok: "All systems operational",
    action_save: "Save",
    action_publish: "Publish",
    action_reset: "Reset",
    action_cancel: "Cancel",
    action_download: "Download",
    action_download_pdf: "Download PDF",
    action_verify: "Verify",
    action_loading: "Loading…",
    action_back: "Back",
    action_edit: "Edit",
    action_delete: "Delete",
    action_retry: "Retry",
    action_close: "Close",
    action_copy: "Copy",
    action_rescan: "Re-scan",
    action_scan: "Scan",
    page_overview: "Overview",
    page_install: "Install",
    page_customize: "Customize",
    page_reports: "Reports",
    page_account: "Account",
    page_billing: "Plan & billing",
    page_agents: "Agents",
    page_statement: "Accessibility statement",
  },

  // -------------------------------------------------------------------------
  // Spanish
  // -------------------------------------------------------------------------
  es: {
    nav_dashboard: "Panel",
    nav_agents: "Agentes",
    nav_overview: "Resumen",
    nav_mike: "Mike — auditoría",
    nav_widget: "Widget",
    nav_install: "Instalar",
    nav_customize: "Personalizar",
    nav_compliance: "Cumplimiento",
    nav_statement: "Declaración de accesibilidad",
    nav_proof: "Prueba de esfuerzo",
    nav_insights: "Análisis",
    nav_reports: "Informes",
    nav_analytics: "Estadísticas",
    nav_agent_settings: "Ajustes del agente",
    nav_account: "Cuenta",
    nav_billing: "Plan y facturación",
    nav_partners: "Socios",
    nav_help: "Ayuda",
    nav_manage_agents: "Gestionar agentes",
    nav_select_agent: "Seleccionar agente",
    nav_no_agents: "Sin agentes",
    topbar_search: "Buscar…",
    topbar_notifications: "Notificaciones",
    language: "Idioma",
    skip_to_content: "Ir al contenido principal",
    sidebar_open: "Abrir menú de navegación",
    sidebar_close: "Cerrar menú de navegación",
    user_account: "Cuenta",
    user_sign_out: "Cerrar sesión",
    status_bar: "Estado",
    status_ok: "Todos los sistemas operativos",
    action_save: "Guardar",
    action_publish: "Publicar",
    action_reset: "Restablecer",
    action_cancel: "Cancelar",
    action_download: "Descargar",
    action_download_pdf: "Descargar PDF",
    action_verify: "Verificar",
    action_loading: "Cargando…",
    action_back: "Volver",
    action_edit: "Editar",
    action_delete: "Eliminar",
    action_retry: "Reintentar",
    action_close: "Cerrar",
    action_copy: "Copiar",
    action_rescan: "Re-escanear",
    action_scan: "Escanear",
    page_overview: "Resumen",
    page_install: "Instalación",
    page_customize: "Personalización",
    page_reports: "Informes",
    page_account: "Cuenta",
    page_billing: "Plan y facturación",
    page_agents: "Agentes",
    page_statement: "Declaración de accesibilidad",
  },

  // -------------------------------------------------------------------------
  // French
  // -------------------------------------------------------------------------
  fr: {
    nav_dashboard: "Tableau de bord",
    nav_agents: "Agents",
    nav_overview: "Vue d’ensemble",
    nav_mike: "Mike — audit",
    nav_widget: "Widget",
    nav_install: "Installer",
    nav_customize: "Personnaliser",
    nav_compliance: "Conformité",
    nav_statement: "Déclaration d’accessibilité",
    nav_proof: "Preuve d’effort",
    nav_insights: "Analyses",
    nav_reports: "Rapports",
    nav_analytics: "Statistiques",
    nav_agent_settings: "Paramètres de l’agent",
    nav_account: "Compte",
    nav_billing: "Forfait & facturation",
    nav_partners: "Partenaires",
    nav_help: "Aide",
    nav_manage_agents: "Gérer les agents",
    nav_select_agent: "Sélectionner un agent",
    nav_no_agents: "Aucun agent",
    topbar_search: "Rechercher…",
    topbar_notifications: "Notifications",
    language: "Langue",
    skip_to_content: "Aller au contenu principal",
    sidebar_open: "Ouvrir le menu de navigation",
    sidebar_close: "Fermer le menu de navigation",
    user_account: "Compte",
    user_sign_out: "Se déconnecter",
    status_bar: "Statut",
    status_ok: "Tous les systèmes opérationnels",
    action_save: "Enregistrer",
    action_publish: "Publier",
    action_reset: "Réinitialiser",
    action_cancel: "Annuler",
    action_download: "Télécharger",
    action_download_pdf: "Télécharger PDF",
    action_verify: "Vérifier",
    action_loading: "Chargement…",
    action_back: "Retour",
    action_edit: "Modifier",
    action_delete: "Supprimer",
    action_retry: "Réessayer",
    action_close: "Fermer",
    action_copy: "Copier",
    action_rescan: "Re-scanner",
    action_scan: "Scanner",
    page_overview: "Vue d’ensemble",
    page_install: "Installation",
    page_customize: "Personnalisation",
    page_reports: "Rapports",
    page_account: "Compte",
    page_billing: "Forfait & facturation",
    page_agents: "Agents",
    page_statement: "Déclaration d’accessibilité",
  },

  // -------------------------------------------------------------------------
  // German
  // -------------------------------------------------------------------------
  de: {
    nav_dashboard: "Dashboard",
    nav_agents: "Agenten",
    nav_overview: "Übersicht",
    nav_mike: "Mike — Prüfung",
    nav_widget: "Widget",
    nav_install: "Installieren",
    nav_customize: "Anpassen",
    nav_compliance: "Konformität",
    nav_statement: "Barrierefreiheitserklärung",
    nav_proof: "Nachweisdokumentation",
    nav_insights: "Analysen",
    nav_reports: "Berichte",
    nav_analytics: "Statistiken",
    nav_agent_settings: "Agenteneinstellungen",
    nav_account: "Konto",
    nav_billing: "Plan & Abrechnung",
    nav_partners: "Partner",
    nav_help: "Hilfe",
    nav_manage_agents: "Agenten verwalten",
    nav_select_agent: "Agent auswählen",
    nav_no_agents: "Keine Agenten",
    topbar_search: "Suchen…",
    topbar_notifications: "Benachrichtigungen",
    language: "Sprache",
    skip_to_content: "Zum Hauptinhalt springen",
    sidebar_open: "Navigationsmenü öffnen",
    sidebar_close: "Navigationsmenü schließen",
    user_account: "Konto",
    user_sign_out: "Abmelden",
    status_bar: "Status",
    status_ok: "Alle Systeme betriebsbereit",
    action_save: "Speichern",
    action_publish: "Veröffentlichen",
    action_reset: "Zurücksetzen",
    action_cancel: "Abbrechen",
    action_download: "Herunterladen",
    action_download_pdf: "PDF herunterladen",
    action_verify: "Überprüfen",
    action_loading: "Wird geladen…",
    action_back: "Zurück",
    action_edit: "Bearbeiten",
    action_delete: "Löschen",
    action_retry: "Erneut versuchen",
    action_close: "Schließen",
    action_copy: "Kopieren",
    action_rescan: "Erneut scannen",
    action_scan: "Scannen",
    page_overview: "Übersicht",
    page_install: "Installation",
    page_customize: "Anpassung",
    page_reports: "Berichte",
    page_account: "Konto",
    page_billing: "Plan & Abrechnung",
    page_agents: "Agenten",
    page_statement: "Barrierefreiheitserklärung",
  },
};

// ---------------------------------------------------------------------------
// t() — translate a key for the given language, falling back to English.
// ---------------------------------------------------------------------------

/**
 * Returns the translated dashboard string for `key` in `lang`.
 * Falls back to the English string if the language entry is missing at runtime
 * (though the type system enforces completeness at compile time).
 */
export function t(lang: Lang, key: DashboardStringKey): string {
  return DASHBOARD_STRINGS[lang]?.[key] ?? DASHBOARD_STRINGS.en[key];
}

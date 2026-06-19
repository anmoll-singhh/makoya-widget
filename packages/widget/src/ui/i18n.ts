/**
 * ui/i18n.ts
 *
 * Internationalisation for the widget's own UI labels.
 * Supports English, Spanish, French, and German.
 *
 * Design decisions:
 *   - `STRINGS` is typed as `Record<Lang, Record<StringKey, string>>` so that
 *     any missing key in any language is a compile-time error — completeness is
 *     enforced by the type system, not by runtime checks.
 *   - `t()` still has a runtime fallback to `STRINGS.en[key]` for cases where
 *     an unknown lang value slips in at runtime (e.g. from user localStorage).
 *   - No WCAG / ADA / "guaranteed accessible" language anywhere — these strings
 *     describe accessibility *tools and preferences*, not compliance claims.
 *   - Translations are kept short and UI-appropriate (panel labels, not prose).
 */

// ---------------------------------------------------------------------------
// Lang
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
// StringKey — every UI string the widget needs.
// ---------------------------------------------------------------------------

export type StringKey =
  // Panel header
  | "title"
  | "subtitle"

  // Quick profiles section heading
  | "quickProfiles"

  // Profile chip labels (8 profiles)
  | "profile_vision"
  | "profile_lowVision"
  | "profile_dyslexia"
  | "profile_adhd"
  | "profile_seizure"
  | "profile_senior"
  | "profile_cognitive"
  | "profile_colorBlind"

  // Section headers (5)
  | "sec_content"
  | "sec_color"
  | "sec_nav"
  | "sec_audio"
  | "sec_about"

  // Feature labels (15 — one per FeatureKey)
  | "f_textSize"
  | "f_lineSpacing"
  | "f_contrast"
  | "f_stopMotion"
  | "f_readingRuler"
  | "f_highlightLinks"
  | "f_bigCursor"
  | "f_readableFont"
  | "f_hideImages"
  | "f_saturation"
  | "f_readingMask"
  | "f_highlightTitles"
  | "f_textAlign"
  | "f_muteSounds"
  | "f_readAloud"

  // Segmented-control option labels (10)
  | "opt_off"
  | "opt_on"
  | "opt_dark"
  | "opt_grayscale"
  | "opt_low"
  | "opt_high"
  | "opt_dim"
  | "opt_tint"
  | "opt_black"
  | "opt_white"

  // Footer / misc
  | "reset"
  | "note"
  | "poweredBy"
  | "statement"
  | "language"
  | "close"
  | "readAloudHint";

// ---------------------------------------------------------------------------
// STRINGS — full translations for all four languages.
// The Record<Lang, Record<StringKey, string>> type guarantees every Lang
// covers every StringKey at compile time.
// ---------------------------------------------------------------------------

export const STRINGS: Record<Lang, Record<StringKey, string>> = {
  // -------------------------------------------------------------------------
  // English
  // -------------------------------------------------------------------------
  en: {
    title: "Accessibility",
    subtitle: "Adjust this page to your needs",

    quickProfiles: "Quick profiles",

    profile_vision: "Vision impaired",
    profile_lowVision: "Low vision",
    profile_dyslexia: "Dyslexia",
    profile_adhd: "ADHD / Focus",
    profile_seizure: "Seizure safe",
    profile_senior: "Senior",
    profile_cognitive: "Cognitive",
    profile_colorBlind: "Color blind",

    sec_content: "Content",
    sec_color: "Color",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "About",

    f_textSize: "Text size",
    f_lineSpacing: "Line spacing",
    f_contrast: "Contrast",
    f_stopMotion: "Pause animations",
    f_readingRuler: "Reading ruler",
    f_highlightLinks: "Highlight links",
    f_bigCursor: "Cursor size",
    f_readableFont: "Readable font",
    f_hideImages: "Hide images",
    f_saturation: "Color saturation",
    f_readingMask: "Reading mask",
    f_highlightTitles: "Highlight titles",
    f_textAlign: "Left-align text",
    f_muteSounds: "Mute sounds",
    f_readAloud: "Read aloud",

    opt_off: "Off",
    opt_on: "On",
    opt_dark: "Dark",
    opt_grayscale: "Grayscale",
    opt_low: "Low",
    opt_high: "High",
    opt_dim: "Dim",
    opt_tint: "Tint",
    opt_black: "Black",
    opt_white: "White",

    reset: "Reset all",
    note: "Changes affect your view only — they don't alter the website.",
    poweredBy: "Powered by",
    statement: "Accessibility statement",
    language: "Language",
    close: "Close",
    readAloudHint: "Click any text on the page to hear it read aloud.",
  },

  // -------------------------------------------------------------------------
  // Spanish
  // -------------------------------------------------------------------------
  es: {
    title: "Accesibilidad",
    subtitle: "Ajusta esta página a tus necesidades",

    quickProfiles: "Perfiles rápidos",

    profile_vision: "Visión reducida",
    profile_lowVision: "Baja visión",
    profile_dyslexia: "Dislexia",
    profile_adhd: "TDAH / Enfoque",
    profile_seizure: "Seguro para epilepsia",
    profile_senior: "Adulto mayor",
    profile_cognitive: "Cognitivo",
    profile_colorBlind: "Daltonismo",

    sec_content: "Contenido",
    sec_color: "Color",
    sec_nav: "Navegación",
    sec_audio: "Audio",
    sec_about: "Acerca de",

    f_textSize: "Tamaño de texto",
    f_lineSpacing: "Interlineado",
    f_contrast: "Contraste",
    f_stopMotion: "Pausar animaciones",
    f_readingRuler: "Regla de lectura",
    f_highlightLinks: "Resaltar enlaces",
    f_bigCursor: "Tamaño del cursor",
    f_readableFont: "Fuente legible",
    f_hideImages: "Ocultar imágenes",
    f_saturation: "Saturación de color",
    f_readingMask: "Máscara de lectura",
    f_highlightTitles: "Resaltar títulos",
    f_textAlign: "Alinear texto a la izquierda",
    f_muteSounds: "Silenciar sonidos",
    f_readAloud: "Leer en voz alta",

    opt_off: "Apagado",
    opt_on: "Encendido",
    opt_dark: "Oscuro",
    opt_grayscale: "Escala de grises",
    opt_low: "Bajo",
    opt_high: "Alto",
    opt_dim: "Tenue",
    opt_tint: "Tinte",
    opt_black: "Negro",
    opt_white: "Blanco",

    reset: "Restablecer todo",
    note: "Los cambios solo afectan tu vista — no modifican el sitio web.",
    poweredBy: "Desarrollado por",
    statement: "Declaración de accesibilidad",
    language: "Idioma",
    close: "Cerrar",
    readAloudHint: "Haz clic en cualquier texto de la página para escucharlo.",
  },

  // -------------------------------------------------------------------------
  // French
  // -------------------------------------------------------------------------
  fr: {
    title: "Accessibilité",
    subtitle: "Adaptez cette page à vos besoins",

    quickProfiles: "Profils rapides",

    profile_vision: "Déficience visuelle",
    profile_lowVision: "Basse vision",
    profile_dyslexia: "Dyslexie",
    profile_adhd: "TDAH / Concentration",
    profile_seizure: "Épilepsie",
    profile_senior: "Senior",
    profile_cognitive: "Cognitif",
    profile_colorBlind: "Daltonisme",

    sec_content: "Contenu",
    sec_color: "Couleur",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "À propos",

    f_textSize: "Taille du texte",
    f_lineSpacing: "Interligne",
    f_contrast: "Contraste",
    f_stopMotion: "Pause animations",
    f_readingRuler: "Règle de lecture",
    f_highlightLinks: "Surligner les liens",
    f_bigCursor: "Taille du curseur",
    f_readableFont: "Police lisible",
    f_hideImages: "Masquer les images",
    f_saturation: "Saturation des couleurs",
    f_readingMask: "Masque de lecture",
    f_highlightTitles: "Surligner les titres",
    f_textAlign: "Aligner le texte à gauche",
    f_muteSounds: "Couper les sons",
    f_readAloud: "Lecture à voix haute",

    opt_off: "Désactivé",
    opt_on: "Activé",
    opt_dark: "Sombre",
    opt_grayscale: "Niveaux de gris",
    opt_low: "Faible",
    opt_high: "Élevé",
    opt_dim: "Tamisé",
    opt_tint: "Teinte",
    opt_black: "Noir",
    opt_white: "Blanc",

    reset: "Tout réinitialiser",
    note: "Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",
    poweredBy: "Propulsé par",
    statement: "Déclaration d'accessibilité",
    language: "Langue",
    close: "Fermer",
    readAloudHint: "Cliquez sur n'importe quel texte de la page pour l'entendre.",
  },

  // -------------------------------------------------------------------------
  // German
  // -------------------------------------------------------------------------
  de: {
    title: "Barrierefreiheit",
    subtitle: "Passen Sie diese Seite Ihren Bedürfnissen an",

    quickProfiles: "Schnellprofile",

    profile_vision: "Sehbeeinträchtigung",
    profile_lowVision: "Schwachsichtigkeit",
    profile_dyslexia: "Legasthenie",
    profile_adhd: "ADHS / Fokus",
    profile_seizure: "Epilepsiesicher",
    profile_senior: "Senioren",
    profile_cognitive: "Kognitiv",
    profile_colorBlind: "Farbenblindheit",

    sec_content: "Inhalt",
    sec_color: "Farbe",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "Über",

    f_textSize: "Textgröße",
    f_lineSpacing: "Zeilenabstand",
    f_contrast: "Kontrast",
    f_stopMotion: "Animationen anhalten",
    f_readingRuler: "Leselineal",
    f_highlightLinks: "Links hervorheben",
    f_bigCursor: "Zeigergröße",
    f_readableFont: "Lesbare Schrift",
    f_hideImages: "Bilder ausblenden",
    f_saturation: "Farbsättigung",
    f_readingMask: "Lesemaske",
    f_highlightTitles: "Überschriften hervorheben",
    f_textAlign: "Text linksbündig",
    f_muteSounds: "Töne stummschalten",
    f_readAloud: "Vorlesen",

    opt_off: "Aus",
    opt_on: "An",
    opt_dark: "Dunkel",
    opt_grayscale: "Graustufen",
    opt_low: "Niedrig",
    opt_high: "Hoch",
    opt_dim: "Gedämpft",
    opt_tint: "Tönung",
    opt_black: "Schwarz",
    opt_white: "Weiß",

    reset: "Alles zurücksetzen",
    note: "Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",
    poweredBy: "Bereitgestellt von",
    statement: "Barrierefreiheitserklärung",
    language: "Sprache",
    close: "Schließen",
    readAloudHint: "Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen.",
  },
};

// ---------------------------------------------------------------------------
// t() — translate a key for the given language, falling back to English.
// ---------------------------------------------------------------------------

/**
 * Returns the translated string for `key` in `lang`.
 * Falls back to the English string if the language entry is missing at runtime
 * (though the type system enforces completeness at compile time).
 */
export function t(lang: Lang, key: StringKey): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key];
}

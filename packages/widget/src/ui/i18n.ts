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

  // Profile chip labels (10 profiles)
  | "profile_vision"
  | "profile_lowVision"
  | "profile_dyslexia"
  | "profile_adhd"
  | "profile_seizure"
  | "profile_senior"
  | "profile_cognitive"
  | "profile_colorBlind"
  | "profile_motorTremor"
  | "profile_eslReading"
  | "profile_keyboardNav"
  | "profile_clearReading"

  // Section headers (5)
  | "sec_content"
  | "sec_color"
  | "sec_nav"
  | "sec_audio"
  | "sec_about"

  // Feature labels (one per rendered FeatureKey; more added in Wave 3)
  | "f_contentScale"
  | "f_textSize"
  | "f_lineSpacing"
  | "f_letterSpacing"
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
  | "f_highlightHover"
  | "f_biggerTargets"
  | "f_focusIndicator"
  | "f_readMode"
  | "readModeEmpty"
  | "rulerColor"

  // accessiBe-parity new feature labels + chrome strings (Wave 3)
  | "f_textColor"
  | "f_titleColor"
  | "f_bgColor"
  | "f_magnifier"
  | "f_usefulLinks"
  | "f_pageStructure"
  | "f_keyboardNav"
  | "f_virtualKeyboard"
  | "f_voiceNav"
  | "f_dictionary"
  | "f_feedbackForm"
  | "f_hideInterface"
  | "f_userGuide"
  | "f_aiSimplify"
  | "sec_tools"
  | "dict_loading"
  | "dict_none"
  | "nav_none"
  | "kn_hint"
  | "guide_body"
  | "fb_open"
  | "fb_msgLabel"
  | "fb_emailLabel"
  | "fb_send"
  | "fb_sending"
  | "fb_sent"
  | "fb_failed"
  | "as_action"
  | "as_loading"
  | "as_failed"

  // Segmented-control option labels
  | "opt_off"
  | "opt_on"
  | "opt_light"
  | "opt_dark"
  | "opt_grayscale"
  | "opt_low"
  | "opt_high"
  | "opt_dim"
  | "opt_tint"
  | "opt_black"
  | "opt_white"
  | "opt_left"
  | "opt_center"
  | "opt_right"
  | "opt_justify"
  | "opt_readable"
  | "opt_dyslexic"

  // Stepper button aria-labels
  | "decrease"
  | "increase"

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
    profile_motorTremor: "Motor / tremor",
    profile_eslReading: "Easy reading",
    profile_keyboardNav: "Keyboard nav",
    profile_clearReading: "Clear reading",

    sec_content: "Content",
    sec_color: "Color",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "About",

    f_contentScale: "Page zoom",
    f_textSize: "Text size",
    f_lineSpacing: "Line spacing",
    f_letterSpacing: "Letter spacing",
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
    f_highlightHover: "Highlight on hover",
    f_biggerTargets: "Bigger tap targets",
    f_focusIndicator: "Enhanced focus",
    f_readMode: "Reading mode",
    readModeEmpty: "We couldn't build a reading view for this page.",
    rulerColor: "Ruler color",

    opt_off: "Off",
    opt_on: "On",
    opt_light: "Light",
    opt_dark: "Dark",
    opt_grayscale: "Grayscale",
    opt_low: "Low",
    opt_high: "High",
    opt_dim: "Dim",
    opt_tint: "Tint",
    opt_black: "Black",
    opt_white: "White",
    opt_left: "Left",
    opt_center: "Center",
    opt_right: "Right",
    opt_justify: "Justify",
    opt_readable: "Readable",
    opt_dyslexic: "Dyslexic",

    decrease: "Decrease",
    increase: "Increase",

    reset: "Reset all",
    note: "Changes affect your view only — they don't alter the website.",
    poweredBy: "Powered by",
    statement: "Accessibility statement",
    language: "Language",
    close: "Close",
    readAloudHint: "Click any text on the page to hear it read aloud.",

    f_textColor: "Text color",
    f_titleColor: "Title color",
    f_bgColor: "Background color",
    f_magnifier: "Text magnifier",
    f_usefulLinks: "Useful links",
    f_pageStructure: "Page structure",
    f_keyboardNav: "Keyboard navigation",
    f_virtualKeyboard: "Virtual keyboard",
    f_voiceNav: "Voice navigation",
    f_dictionary: "Dictionary",
    f_feedbackForm: "Feedback",
    f_hideInterface: "Hide interface",
    f_userGuide: "User guide",
    f_aiSimplify: "Simplify text",
    sec_tools: "Tools",
    dict_loading: "Looking up…",
    dict_none: "No definition found.",
    nav_none: "Nothing found on this page.",
    kn_hint: "Use Alt + M / H / F / B / G to jump between regions.",
    guide_body: "Pick a quick profile, or turn on individual tools. Changes affect only your view of this page and are saved on your device. Press Esc to close any tool.",
    fb_open: "Report an issue",
    fb_msgLabel: "What's the problem?",
    fb_emailLabel: "Your email (optional)",
    fb_send: "Send",
    fb_sending: "Sending…",
    fb_sent: "Thanks — your feedback was sent.",
    fb_failed: "Couldn't send right now. Please try again later.",
    as_action: "Simplify",
    as_loading: "Simplifying…",
    as_failed: "Couldn't simplify this text.",
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
    profile_motorTremor: "Motor / temblor",
    profile_eslReading: "Lectura fácil",
    profile_keyboardNav: "Navegación teclado",
    profile_clearReading: "Lectura clara",

    sec_content: "Contenido",
    sec_color: "Color",
    sec_nav: "Navegación",
    sec_audio: "Audio",
    sec_about: "Acerca de",

    f_contentScale: "Zoom de página",
    f_textSize: "Tamaño de texto",
    f_lineSpacing: "Interlineado",
    f_letterSpacing: "Espaciado de letras",
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
    f_highlightHover: "Resaltar al pasar el cursor",
    f_biggerTargets: "Áreas táctiles más grandes",
    f_focusIndicator: "Foco mejorado",
    f_readMode: "Modo lectura",
    readModeEmpty: "No pudimos crear una vista de lectura para esta página.",
    rulerColor: "Color de la regla",

    opt_off: "Apagado",
    opt_on: "Encendido",
    opt_light: "Claro",
    opt_dark: "Oscuro",
    opt_grayscale: "Escala de grises",
    opt_low: "Bajo",
    opt_high: "Alto",
    opt_dim: "Tenue",
    opt_tint: "Tinte",
    opt_black: "Negro",
    opt_white: "Blanco",
    opt_left: "Izquierda",
    opt_center: "Centro",
    opt_right: "Derecha",
    opt_justify: "Justificado",
    opt_readable: "Legible",
    opt_dyslexic: "Disléxica",

    decrease: "Disminuir",
    increase: "Aumentar",

    reset: "Restablecer todo",
    note: "Los cambios solo afectan tu vista — no modifican el sitio web.",
    poweredBy: "Desarrollado por",
    statement: "Declaración de accesibilidad",
    language: "Idioma",
    close: "Cerrar",
    readAloudHint: "Haz clic en cualquier texto de la página para escucharlo.",

    f_textColor: "Color del texto",
    f_titleColor: "Color de títulos",
    f_bgColor: "Color de fondo",
    f_magnifier: "Lupa de texto",
    f_usefulLinks: "Enlaces útiles",
    f_pageStructure: "Estructura de la página",
    f_keyboardNav: "Navegación por teclado",
    f_virtualKeyboard: "Teclado virtual",
    f_voiceNav: "Navegación por voz",
    f_dictionary: "Diccionario",
    f_feedbackForm: "Comentarios",
    f_hideInterface: "Ocultar interfaz",
    f_userGuide: "Guía de uso",
    f_aiSimplify: "Simplificar texto",
    sec_tools: "Herramientas",
    dict_loading: "Buscando…",
    dict_none: "No se encontró definición.",
    nav_none: "No se encontró nada en esta página.",
    kn_hint: "Usa Alt + M / H / F / B / G para saltar entre regiones.",
    guide_body: "Elige un perfil rápido o activa herramientas individuales. Los cambios solo afectan a tu vista de esta página y se guardan en tu dispositivo. Pulsa Esc para cerrar cualquier herramienta.",
    fb_open: "Informar de un problema",
    fb_msgLabel: "¿Cuál es el problema?",
    fb_emailLabel: "Tu correo (opcional)",
    fb_send: "Enviar",
    fb_sending: "Enviando…",
    fb_sent: "Gracias — tus comentarios se enviaron.",
    fb_failed: "No se pudo enviar ahora. Inténtalo más tarde.",
    as_action: "Simplificar",
    as_loading: "Simplificando…",
    as_failed: "No se pudo simplificar este texto.",
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
    profile_motorTremor: "Moteur / tremblements",
    profile_eslReading: "Lecture facile",
    profile_keyboardNav: "Navigation clavier",
    profile_clearReading: "Lecture claire",

    sec_content: "Contenu",
    sec_color: "Couleur",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "À propos",

    f_contentScale: "Zoom de la page",
    f_textSize: "Taille du texte",
    f_lineSpacing: "Interligne",
    f_letterSpacing: "Espacement des lettres",
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
    f_highlightHover: "Surligner au survol",
    f_biggerTargets: "Zones tactiles agrandies",
    f_focusIndicator: "Focus amélioré",
    f_readMode: "Mode lecture",
    readModeEmpty: "Nous n'avons pas pu créer une vue de lecture pour cette page.",
    rulerColor: "Couleur de la règle",

    opt_off: "Désactivé",
    opt_on: "Activé",
    opt_light: "Clair",
    opt_dark: "Sombre",
    opt_grayscale: "Niveaux de gris",
    opt_low: "Faible",
    opt_high: "Élevé",
    opt_dim: "Tamisé",
    opt_tint: "Teinte",
    opt_black: "Noir",
    opt_white: "Blanc",
    opt_left: "Gauche",
    opt_center: "Centre",
    opt_right: "Droite",
    opt_justify: "Justifié",
    opt_readable: "Lisible",
    opt_dyslexic: "Dyslexique",

    decrease: "Diminuer",
    increase: "Augmenter",

    reset: "Tout réinitialiser",
    note: "Les modifications n'affectent que votre affichage — elles ne modifient pas le site.",
    poweredBy: "Propulsé par",
    statement: "Déclaration d'accessibilité",
    language: "Langue",
    close: "Fermer",
    readAloudHint: "Cliquez sur n'importe quel texte de la page pour l'entendre.",

    f_textColor: "Couleur du texte",
    f_titleColor: "Couleur des titres",
    f_bgColor: "Couleur de fond",
    f_magnifier: "Loupe de texte",
    f_usefulLinks: "Liens utiles",
    f_pageStructure: "Structure de la page",
    f_keyboardNav: "Navigation au clavier",
    f_virtualKeyboard: "Clavier virtuel",
    f_voiceNav: "Navigation vocale",
    f_dictionary: "Dictionnaire",
    f_feedbackForm: "Commentaires",
    f_hideInterface: "Masquer l'interface",
    f_userGuide: "Guide d'utilisation",
    f_aiSimplify: "Simplifier le texte",
    sec_tools: "Outils",
    dict_loading: "Recherche…",
    dict_none: "Aucune définition trouvée.",
    nav_none: "Rien trouvé sur cette page.",
    kn_hint: "Utilisez Alt + M / H / F / B / G pour passer d'une zone à l'autre.",
    guide_body: "Choisissez un profil rapide ou activez des outils individuels. Les changements n'affectent que votre affichage de cette page et sont enregistrés sur votre appareil. Appuyez sur Échap pour fermer un outil.",
    fb_open: "Signaler un problème",
    fb_msgLabel: "Quel est le problème ?",
    fb_emailLabel: "Votre e-mail (facultatif)",
    fb_send: "Envoyer",
    fb_sending: "Envoi…",
    fb_sent: "Merci — vos commentaires ont été envoyés.",
    fb_failed: "Envoi impossible pour le moment. Réessayez plus tard.",
    as_action: "Simplifier",
    as_loading: "Simplification…",
    as_failed: "Impossible de simplifier ce texte.",
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
    profile_motorTremor: "Motorik / Zittern",
    profile_eslReading: "Einfaches Lesen",
    profile_keyboardNav: "Tastaturnavigation",
    profile_clearReading: "Klares Lesen",

    sec_content: "Inhalt",
    sec_color: "Farbe",
    sec_nav: "Navigation",
    sec_audio: "Audio",
    sec_about: "Über",

    f_contentScale: "Seitenzoom",
    f_textSize: "Textgröße",
    f_lineSpacing: "Zeilenabstand",
    f_letterSpacing: "Zeichenabstand",
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
    f_highlightHover: "Beim Überfahren hervorheben",
    f_biggerTargets: "Größere Tippziele",
    f_focusIndicator: "Verbesserter Fokus",
    f_readMode: "Lesemodus",
    readModeEmpty: "Für diese Seite konnte keine Leseansicht erstellt werden.",
    rulerColor: "Linealfarbe",

    opt_off: "Aus",
    opt_on: "An",
    opt_light: "Hell",
    opt_dark: "Dunkel",
    opt_grayscale: "Graustufen",
    opt_low: "Niedrig",
    opt_high: "Hoch",
    opt_dim: "Gedämpft",
    opt_tint: "Tönung",
    opt_black: "Schwarz",
    opt_white: "Weiß",
    opt_left: "Links",
    opt_center: "Zentriert",
    opt_right: "Rechts",
    opt_justify: "Blocksatz",
    opt_readable: "Lesbar",
    opt_dyslexic: "Legasthenie",

    decrease: "Verringern",
    increase: "Erhöhen",

    reset: "Alles zurücksetzen",
    note: "Änderungen wirken sich nur auf Ihre Ansicht aus — die Website wird nicht verändert.",
    poweredBy: "Bereitgestellt von",
    statement: "Barrierefreiheitserklärung",
    language: "Sprache",
    close: "Schließen",
    readAloudHint: "Klicken Sie auf beliebigen Text auf der Seite, um ihn vorlesen zu lassen.",

    f_textColor: "Textfarbe",
    f_titleColor: "Titelfarbe",
    f_bgColor: "Hintergrundfarbe",
    f_magnifier: "Textlupe",
    f_usefulLinks: "Nützliche Links",
    f_pageStructure: "Seitenstruktur",
    f_keyboardNav: "Tastaturnavigation",
    f_virtualKeyboard: "Bildschirmtastatur",
    f_voiceNav: "Sprachnavigation",
    f_dictionary: "Wörterbuch",
    f_feedbackForm: "Feedback",
    f_hideInterface: "Oberfläche ausblenden",
    f_userGuide: "Anleitung",
    f_aiSimplify: "Text vereinfachen",
    sec_tools: "Werkzeuge",
    dict_loading: "Wird gesucht…",
    dict_none: "Keine Definition gefunden.",
    nav_none: "Auf dieser Seite nichts gefunden.",
    kn_hint: "Mit Alt + M / H / F / B / G zwischen Bereichen springen.",
    guide_body: "Wählen Sie ein Schnellprofil oder aktivieren Sie einzelne Werkzeuge. Änderungen betreffen nur Ihre Ansicht dieser Seite und werden auf Ihrem Gerät gespeichert. Drücken Sie Esc, um ein Werkzeug zu schließen.",
    fb_open: "Problem melden",
    fb_msgLabel: "Was ist das Problem?",
    fb_emailLabel: "Ihre E-Mail (optional)",
    fb_send: "Senden",
    fb_sending: "Wird gesendet…",
    fb_sent: "Danke — Ihr Feedback wurde gesendet.",
    fb_failed: "Senden derzeit nicht möglich. Bitte später erneut versuchen.",
    as_action: "Vereinfachen",
    as_loading: "Wird vereinfacht…",
    as_failed: "Dieser Text konnte nicht vereinfacht werden.",
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

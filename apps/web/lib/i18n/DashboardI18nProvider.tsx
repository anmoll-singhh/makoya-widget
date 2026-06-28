/**
 * lib/i18n/DashboardI18nProvider.tsx
 *
 * React context, client-side Provider, and `useT()` hook for dashboard i18n.
 *
 * SSR-safety contract:
 *   - The RSC layout (`app/dashboard/layout.tsx`) reads the `makoya_lang`
 *     cookie via `next/headers` and passes the value as `initialLang`. Server
 *     and client both start with the same language, so React hydration never
 *     sees a mismatch.
 *   - On first mount (a useEffect that runs only on the client, after
 *     hydration) we reconcile from localStorage in case the cookie was cleared
 *     between server render and client mount. Because this happens in an effect
 *     (not during render), React handles it as a controlled state update and
 *     does not throw a hydration error.
 *   - `setLang` always writes both localStorage AND a cookie so the next
 *     full-page navigation also hydrates with the correct language.
 *
 * Usage:
 *   // In a client component inside the dashboard
 *   const { t, lang, setLang } = useT();
 *   <span>{t("nav_dashboard")}</span>
 *   <select value={lang} onChange={e => setLang(e.target.value as Lang)}>…</select>
 */

"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Lang, type DashboardStringKey, t as tFn } from "./dashboard";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface I18nContextValue {
  /** Active language code. */
  lang: Lang;
  /** Update the active language (writes localStorage + cookie). */
  setLang: (l: Lang) => void;
  /** Translate a dashboard key for the current lang, falling back to English. */
  t: (key: DashboardStringKey) => string;
}

const VALID_LANGS: ReadonlySet<string> = new Set(["en", "es", "fr", "de"]);
const STORAGE_KEY = "makoya_dashboard_lang";
const COOKIE_NAME = "makoya_lang";
/** 1-year max-age keeps the preference across sessions. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const I18nCtx = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// DashboardI18nProvider — mount once in the dashboard RSC layout.
// ---------------------------------------------------------------------------

interface DashboardI18nProviderProps {
  children: ReactNode;
  /**
   * Initial language, derived from the `makoya_lang` cookie by the RSC layout.
   * Defaults to "en" when no valid cookie is found.
   */
  initialLang?: Lang;
}

export function DashboardI18nProvider({
  children,
  initialLang = "en",
}: DashboardI18nProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Reconcile with localStorage after hydration. This handles the edge case
  // where the cookie was cleared but localStorage still has a stored preference.
  // Running in a useEffect ensures we never produce a hydration mismatch.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_LANGS.has(stored)) {
        setLangState(stored as Lang);
      }
    } catch {
      // Private-browsing / storage-denied environments — fail silently.
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Fail silently when localStorage is unavailable.
    }
    // Write a cookie so the RSC layout reads the right `initialLang` on the
    // next full-page request, preventing the en→stored-lang flash.
    document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  }, []);

  // Memoise the translate function so child components only re-render when
  // `lang` actually changes, not on every parent re-render.
  const t = useCallback((key: DashboardStringKey) => tFn(lang, key), [lang]);

  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

// ---------------------------------------------------------------------------
// useT() — consume i18n inside any client component in the dashboard subtree.
// ---------------------------------------------------------------------------

/**
 * Returns `{ t, lang, setLang }` for the active dashboard language.
 * Must be called inside a `<DashboardI18nProvider>` subtree (i.e. any
 * component under `app/dashboard/`).
 */
export function useT(): I18nContextValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) {
    throw new Error(
      "useT() must be called inside <DashboardI18nProvider>. " +
        "Ensure the dashboard layout wraps its children with the provider."
    );
  }
  return ctx;
}

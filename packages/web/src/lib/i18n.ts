import { createContext, useContext } from 'react';

// ---------------------------------------------------------------------------
// Lightweight i18n — no framework, just a t() function + locale JSON files
// GLM generates the translations, Claude reviews them
// ---------------------------------------------------------------------------

export const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'ko', 'fr'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  fr: 'Français',
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key, // fallback: return key as-is (English)
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function useT() {
  return useContext(LocaleContext).t;
}

// ---------------------------------------------------------------------------
// Locale detection from browser / URL / storage
// ---------------------------------------------------------------------------

const LOCALE_STORAGE_KEY = 'nexus_locale';

export function detectLocale(): Locale {
  // 1. URL param ?lang=zh
  try {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    if (lang && SUPPORTED_LOCALES.includes(lang as Locale)) return lang as Locale;
  } catch { /* SSR safety */ }

  // 2. Stored preference
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  } catch { /* ignore */ }

  // 3. Browser language
  try {
    const browserLang = navigator.language.split('-')[0];
    if (SUPPORTED_LOCALES.includes(browserLang as Locale)) return browserLang as Locale;
  } catch { /* SSR safety */ }

  return 'en';
}

export function persistLocale(locale: Locale) {
  try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Translation loader — imports locale JSON files
// ---------------------------------------------------------------------------

type TranslationMap = Record<string, string>;

const localeCache = new Map<Locale, TranslationMap>();

// Eagerly load English (always available, it's the fallback)
localeCache.set('en', {});

/**
 * Load a locale's translation file. Returns cached if already loaded.
 * Locale files are at /src/locales/{locale}.json
 */
export async function loadLocale(locale: Locale): Promise<TranslationMap> {
  if (localeCache.has(locale)) return localeCache.get(locale)!;

  try {
    // Dynamic import — Vite bundles these as separate chunks
    const module = await import(`../locales/${locale}.json`);
    const translations = module.default as TranslationMap;
    localeCache.set(locale, translations);
    return translations;
  } catch {
    console.warn(`Failed to load locale: ${locale}, falling back to English`);
    return {};
  }
}

/**
 * Create a t() function for a given locale's translations.
 * Falls back to the key itself (which is the English string).
 */
export function createT(translations: TranslationMap): (key: string) => string {
  return (key: string) => translations[key] || key;
}

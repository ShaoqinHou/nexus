import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import {
  LocaleContext,
  type Locale,
  detectLocale,
  persistLocale,
  loadLocale,
  createT,
} from '@web/lib/i18n';

interface LocaleProviderProps {
  children: ReactNode;
  /** Restaurant's primary language — used as default instead of browser detection */
  defaultLocale?: Locale;
}

export function LocaleProvider({ children, defaultLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Priority: URL param > localStorage > restaurant default > browser language > 'en'
    const detected = detectLocale(); // checks URL param then localStorage then browser
    // If user has an explicit preference (URL or saved), use it over restaurant default
    const urlParam = new URLSearchParams(window.location.search).get('lang');
    const stored = localStorage.getItem('nexus_locale');
    if (urlParam || stored) return detected;
    // Otherwise use restaurant's primary language
    return defaultLocale ?? detected;
  });
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    persistLocale(newLocale);
  }, []);

  // Load translation file whenever locale changes
  useEffect(() => {
    let cancelled = false;
    loadLocale(locale).then((map) => {
      if (!cancelled) setTranslations(map);
    });
    return () => { cancelled = true; };
  }, [locale]);

  const t = useMemo(() => createT(translations), [translations]);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

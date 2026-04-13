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
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
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

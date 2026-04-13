import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale, useLocale } from '@web/lib/i18n';
import { Globe } from 'lucide-react';

const LOCALE_FLAGS: Record<Locale, string> = {
  en: '🇬🇧',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
  fr: '🇫🇷',
};

/**
 * Compact language picker for the customer menu header.
 * Renders a small select dropdown with flag + label.
 */
export function LanguagePicker() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="relative inline-flex items-center">
      <Globe className="absolute left-2 h-3.5 w-3.5 text-text-secondary pointer-events-none" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="appearance-none bg-bg-surface text-text text-xs font-medium border border-border rounded-full pl-7 pr-6 py-1.5 min-h-[32px] cursor-pointer hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        aria-label="Select language"
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <svg
        className="absolute right-2 h-3 w-3 text-text-secondary pointer-events-none"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 5l3 3 3-3" />
      </svg>
    </div>
  );
}

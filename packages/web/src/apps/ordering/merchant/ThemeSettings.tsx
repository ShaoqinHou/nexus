import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette, Check, RotateCcw, Save, Clock, Receipt, Globe, Paintbrush } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Toggle,
  ImageUpload,
} from '@web/components/ui';
import { useT } from '@web/lib/i18n';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useTheme } from '@web/platform/theme/ThemeProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  type TenantThemeSettings,
  type OperatingHoursEntry,
} from '@web/lib/theme';
import { isThemeId, type ThemeId } from '@web/platform/theme/ThemeProvider';
import {
  useTenantSettings,
  useUpdateTenantSettings,
} from '../hooks/useTenantSettings';
import { apiClient } from '@web/lib/api';

// --- Locale english names (for toast messages) ---
const LOCALE_ENGLISH_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
};

// --- Language config for the settings UI ---
const LANGUAGE_CONFIG = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}', description: 'Default language' },
  { code: 'zh', label: '中文 (Chinese)', flag: '\u{1F1E8}\u{1F1F3}', description: 'Simplified Chinese' },
  { code: 'ja', label: '日本語 (Japanese)', flag: '\u{1F1EF}\u{1F1F5}', description: 'Japanese' },
  { code: 'ko', label: '한국어 (Korean)', flag: '\u{1F1F0}\u{1F1F7}', description: 'Korean' },
  { code: 'fr', label: 'Français (French)', flag: '\u{1F1EB}\u{1F1F7}', description: 'French' },
] as const;

// --- Cuisine Theme Data (10 canonical themes from Claude Design bundle) ---
// Swatches: [bg, brand, accent, text] — mirrors the bundle spec tile layout.
// lint-override block: these are design-spec swatch values, not app chrome.

interface CuisineThemeDef {
  id: string;
  name: string;
  vibe: string;
  swatches: [string, string, string, string]; // lint-override: cuisine theme spec swatches — design reference data, not chrome
  defaultBrand: string; // lint-override: cuisine theme default brand seed — user-facing choice data
}

const CUISINE_THEMES: CuisineThemeDef[] = [
  { id: 'classic',    name: 'Classic',     vibe: 'Modern American · chains',          swatches: ['#ffffff', '#2563eb', '#f59e0b', '#111827'], defaultBrand: '#2563eb' }, // lint-override: cuisine spec swatch
  { id: 'trattoria',  name: 'Trattoria',   vibe: 'Italian · neighbourhood bistro',    swatches: ['#faf6ef', '#c0532a', '#6b7d3a', '#2b1f17'], defaultBrand: '#c0532a' }, // lint-override: cuisine spec swatch
  { id: 'izakaya',    name: 'Izakaya',     vibe: 'Japanese · Korean BBQ · ramen',     swatches: ['#1a1714', '#e89d3a', '#c44536', '#f5ede0'], defaultBrand: '#e89d3a' }, // lint-override: cuisine spec swatch
  { id: 'bubble-tea', name: 'Bubble Tea',  vibe: 'Boba · dessert · cafe',             swatches: ['#fefaf5', '#b87fc2', '#8fb87a', '#e07b7b'], defaultBrand: '#b87fc2' }, // lint-override: cuisine spec swatch
  { id: 'sichuan',    name: 'Sichuan',     vibe: 'Hot pot · spicy regional',          swatches: ['#fbf6ee', '#b8262b', '#c89a3c', '#1a0e0a'], defaultBrand: '#b8262b' }, // lint-override: cuisine spec swatch
  { id: 'cantonese',  name: 'Cantonese',   vibe: 'Dim sum · tea house',               swatches: ['#f7f3e9', '#1f6b4a', '#b68c3c', '#0f2419'], defaultBrand: '#1f6b4a' }, // lint-override: cuisine spec swatch
  { id: 'wok',        name: 'Wok',         vibe: 'Chinese-American · franchise',      swatches: ['#ffffff', '#d62828', '#e5a52c', '#0d0605'], defaultBrand: '#d62828' }, // lint-override: cuisine spec swatch
  { id: 'counter',    name: 'Counter',     vibe: '3rd-wave coffee · counter-service', swatches: ['#ffffff', '#ff2d20', '#0a0a0a', '#f5f500'], defaultBrand: '#ff2d20' }, // lint-override: cuisine spec swatch
  { id: 'taqueria',   name: 'Taqueria',    vibe: 'Mexican · street food · Tex-Mex',   swatches: ['#fdf6e9', '#d94f2a', '#7a9a2a', '#2a1a0e'], defaultBrand: '#d94f2a' }, // lint-override: cuisine spec swatch
  { id: 'curry-house',name: 'Curry House', vibe: 'Indian · South Asian · tandoor',   swatches: ['#fbf5e7', '#d97a1a', '#0f6a6a', '#1a0d1a'], defaultBrand: '#d97a1a' }, // lint-override: cuisine spec swatch
];

// Set of default-brand hex strings — used to detect whether the merchant has
// manually overridden the brand color. If yes, we DON'T auto-suggest a new
// default when they pick a different cuisine theme (preserves their choice).
const DEFAULT_BRAND_SEEDS = new Set(CUISINE_THEMES.map((t) => t.defaultBrand));
DEFAULT_BRAND_SEEDS.add('#2563eb'); // lint-override: legacy default seed for tenants pre-cuisine-theme

// --- Cuisine Theme Card ---

interface CuisineThemeCardProps {
  theme: CuisineThemeDef;
  isActive: boolean;
  onClick: () => void;
}

function CuisineThemeCard({ theme, isActive, onClick }: CuisineThemeCardProps) {
  const t = useT();
  // Wrap the entire card in its TARGET cuisine theme. The card body uses
  // var(--color-bg-elevated), var(--font-display), var(--radius-card) etc.
  // — those tokens now resolve from the target theme, not from the
  // currently-applied console theme. Result: the cuisine grid shows each
  // theme's actual surface, typography, and shape language at a glance,
  // exactly like the bundle's THEME COMPARISON canvas. Previously every
  // card used the active theme's tokens and so all 10 looked identical
  // except for the swatch row.
  return (
    <button
      type="button"
      onClick={onClick}
      data-theme={theme.id}
      className={[
        'relative flex flex-col gap-2 p-3 border-2 transition-all text-left active:scale-[0.98]',
        // The card itself adopts the target cuisine's --radius-card so a
        // sharp theme (counter) shows a square card, a pill theme
        // (trattoria) shows a rounded card.
        'rounded-[var(--radius-card)] bg-[var(--color-bg-elevated)] hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
        isActive
          ? 'border-[var(--color-primary)] shadow-sm'
          : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
      ].join(' ')}
    >
      {isActive && (
        <div
          className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Check className="h-2.5 w-2.5" style={{ color: 'var(--color-text-inverse)' }} />
        </div>
      )}
      {/* Swatch row: bg / brand / accent / text — 4 chips */}
      <div className="flex gap-1">
        {theme.swatches.map((sw, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-sm border shrink-0"
            style={{
              backgroundColor: sw,
              borderColor: 'rgba(0,0,0,0.12)', // lint-override: semi-transparent swatch border — no token for this alpha overlay
            }}
          />
        ))}
      </div>
      {/* Mini layout mock: header strip + button-shape stub. Shape uses the
          target theme's --radius-btn so pill/sharp/rounded all render
          authentically inside the card preview. */}
      <div
        className="w-full h-7 overflow-hidden flex flex-col gap-0.5"
        style={{ borderRadius: 'var(--radius-card)' }}
      >
        <div
          className="h-4 w-full"
          style={{ backgroundColor: theme.swatches[1], borderRadius: 'var(--radius-btn)' }}
        />
        <div className="flex gap-1">
          <div
            className="h-2.5 flex-1"
            style={{
              backgroundColor: theme.swatches[0],
              border: `1px solid rgba(0,0,0,0.08)`, // lint-override: alpha border on mini mock
              borderRadius: 'var(--radius-chip)',
            }}
          />
          <div
            className="h-2.5 w-6"
            style={{ backgroundColor: theme.swatches[2], borderRadius: 'var(--radius-chip)' }}
          />
        </div>
      </div>
      <div>
        {/* Name uses the target theme's display font + tracking + weight so
            the typographic identity (Fraunces serif for trattoria, JetBrains
            mono for izakaya/counter, Noto Serif SC for sichuan) shows up
            inside its own card. */}
        <p
          className="text-xs leading-tight"
          style={{
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--font-display-weight)',
            letterSpacing: 'var(--font-display-tracking)',
          }}
        >
          {t(theme.name)}
        </p>
        <p
          className="text-[10px] leading-tight mt-0.5"
          style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)' }}
        >
          {t(theme.vibe)}
        </p>
      </div>
    </button>
  );
}

// --- Active Theme Palette Readout ---
//
// Replaces the legacy "Derived Palette" chips that always showed the same
// brand-derived shades regardless of which cuisine was selected. Each chip
// here uses `var(--color-*)` directly, so the swatches resolve via the
// active cuisine theme cascade — Sichuan shows cinnabar + gold + cream,
// Trattoria shows terracotta + olive + paper, Izakaya shows amber +
// vermillion + ink, etc. Mirrors the bundle's per-theme palette strip
// shown at the bottom of each phone-frame in Theme Comparison.html.
//
// Brand override (the merchant's chosen accent) layers on top via the
// wrapper inline style — so when the user picks a different brand colour
// the "Brand" chip flips accordingly while the rest of the palette stays
// faithful to the cuisine identity.

function ActiveThemePalette() {
  const t = useT();
  const chips: Array<{ label: string; var: string }> = [
    { label: t('Background'), var: 'var(--color-bg)' },
    { label: t('Surface'),    var: 'var(--color-bg-surface)' },
    { label: t('Brand'),      var: 'var(--color-brand)' },
    { label: t('Accent'),     var: 'var(--color-accent)' },
    { label: t('Text'),       var: 'var(--color-text)' },
    { label: t('Success'),    var: 'var(--color-success)' },
    { label: t('Warning'),    var: 'var(--color-warning)' },
    { label: t('Danger'),     var: 'var(--color-danger)' },
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-secondary">{t('Theme palette')}</span>
      <div className="flex gap-2 flex-wrap">
        {chips.map((chip) => (
          <div key={chip.label} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-md border border-border-strong shrink-0"
              style={{ backgroundColor: chip.var }}
              title={chip.label}
            />
            <span className="text-[10px] text-text-tertiary text-center leading-tight">{chip.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Operating Hours Defaults ---

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DayHoursState {
  isOpen: boolean;
  open: string;
  close: string;
}

function defaultDayHours(): DayHoursState[] {
  return DAY_NAMES.map(() => ({ isOpen: true, open: '09:00', close: '22:00' }));
}

function hoursEntriesToState(entries?: OperatingHoursEntry[]): DayHoursState[] {
  const base = defaultDayHours();
  if (!entries || entries.length === 0) return base;
  // Mark all days as closed by default, then open the ones in the entries
  const result = base.map((d) => ({ ...d, isOpen: false }));
  for (const entry of entries) {
    if (entry.day >= 0 && entry.day <= 6) {
      result[entry.day] = { isOpen: true, open: entry.open, close: entry.close };
    }
  }
  return result;
}

function stateToHoursEntries(state: DayHoursState[]): OperatingHoursEntry[] {
  return state
    .map((d, i) => ({ day: i, open: d.open, close: d.close, isOpen: d.isOpen }))
    .filter((d) => d.isOpen)
    .map(({ day, open, close }) => ({ day, open, close }));
}

interface FormState {
  brandColor: string;
  cuisineTheme: string;
  logoUrl: string;
  coverImageUrl: string;
  operatingHours: DayHoursState[];
  lastOrderMinutesBefore: string;
  taxRate: string;
  taxInclusive: boolean;
  taxLabel: string;
  primaryLocale: string;
  supportedLocales: string[];
}

function settingsToFormState(settings: TenantThemeSettings | undefined): FormState {
  const primary = settings?.primaryLocale ?? 'en';
  // supportedLocales in form state = additional languages only (excludes primary)
  const rawLocales = settings?.supportedLocales as string[] | undefined;
  const additionalLocales = (rawLocales ?? []).filter((l) => l !== primary);
  return {
    brandColor: settings?.brandColor ?? '#2563eb', // lint-override: default brand color seed for form — user-facing input value, not chrome
    cuisineTheme: settings?.theme ?? '',
    logoUrl: settings?.logoUrl ?? '',
    coverImageUrl: settings?.coverImageUrl ?? '',
    operatingHours: hoursEntriesToState(settings?.operatingHours),
    lastOrderMinutesBefore: settings?.lastOrderMinutesBefore?.toString() ?? '',
    taxRate: settings?.taxRate?.toString() ?? '',
    taxInclusive: settings?.taxInclusive ?? true,
    taxLabel: settings?.taxLabel ?? '',
    primaryLocale: primary,
    supportedLocales: additionalLocales,
  };
}

function formStateToSettings(form: FormState): Partial<TenantThemeSettings> {
  const taxRate = parseFloat(form.taxRate);
  const lastOrderMinutes = parseInt(form.lastOrderMinutesBefore, 10);
  // Explicitly clear preset/font/radius/surface so that the cuisine-theme
  // cascade is the sole source for typography/shape/depth (per
  // S-THEMED-COMPONENT, single source of truth). Tenants migrated from the
  // pre-cuisine-theme era get their stale overrides wiped on next save.
  return {
    preset: undefined,
    fontFamily: undefined,
    borderRadius: undefined,
    surfaceStyle: undefined,
    brandColor: form.brandColor,
    theme: form.cuisineTheme || undefined,
    logoUrl: form.logoUrl || undefined,
    coverImageUrl: form.coverImageUrl || undefined,
    operatingHours: stateToHoursEntries(form.operatingHours),
    lastOrderMinutesBefore: !isNaN(lastOrderMinutes) && lastOrderMinutes > 0 ? lastOrderMinutes : undefined,
    taxRate: !isNaN(taxRate) && taxRate > 0 ? taxRate : undefined,
    taxInclusive: form.taxInclusive,
    taxLabel: form.taxLabel || undefined,
    primaryLocale: form.primaryLocale,
    supportedLocales: form.supportedLocales.length > 0 ? form.supportedLocales : undefined,
  } as Partial<TenantThemeSettings>;
}

// --- Main Component ---

export function ThemeSettings() {
  const t = useT();
  const { tenantSlug } = useTenant();
  const { setThemeId, themeId: activeThemeId } = useTheme();
  const { toast } = useToast();
  const { data: savedSettings, isLoading } = useTenantSettings(tenantSlug);
  const updateMutation = useUpdateTenantSettings(tenantSlug);

  const [form, setForm] = useState<FormState>(() => settingsToFormState(undefined));
  const [isDirty, setIsDirty] = useState(false);
  const savedRef = useRef<FormState | null>(null);
  const savedLocalesRef = useRef<string[]>(['en']);

  // Initialize form from fetched settings
  useEffect(() => {
    if (savedSettings) {
      const initial = settingsToFormState(savedSettings);
      setForm(initial);
      savedRef.current = initial;
      savedLocalesRef.current = [...initial.supportedLocales];
      setIsDirty(false);
    }
  }, [savedSettings]);

  // Live-preview cuisine theme on the merchant chrome itself by updating
  // the data-theme attribute immediately. The MerchantThemeShell wrapper
  // around PlatformShell re-renders with the new themeId so the staff
  // sees the change live — no separate preview pane needed.
  useEffect(() => {
    const id: ThemeId = isThemeId(form.cuisineTheme) ? form.cuisineTheme : 'classic';
    if (id !== activeThemeId) {
      setThemeId(id);
    }
  }, [form.cuisineTheme, activeThemeId, setThemeId]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const handleReset = useCallback(() => {
    if (savedRef.current) {
      setForm(savedRef.current);
      setIsDirty(false);
      // Restore saved cuisine theme — guard, don't cast.
      const savedThemeId: ThemeId = isThemeId(savedRef.current.cuisineTheme)
        ? savedRef.current.cuisineTheme
        : 'classic';
      setThemeId(savedThemeId);
    }
  }, [setThemeId]);

  const handleSave = useCallback(() => {
    // Validate operating hours: open must be before close for all enabled days
    const invalidDays = form.operatingHours
      .map((day, i) => ({ ...day, name: DAY_NAMES[i] }))
      .filter((day) => day.isOpen && day.open >= day.close);
    if (invalidDays.length > 0) {
      const names = invalidDays.map((d) => t(d.name)).join(', ');
      toast('error', `${t('Invalid hours for:')} ${names}. ${t('Close time must be after open time')}`);
      return;
    }

    // Capture locales before save to detect newly added ones
    const previousLocales = [...savedLocalesRef.current];

    const settings = formStateToSettings(form);
    updateMutation.mutate(settings, {
      onSuccess: () => {
        toast('success', t('Settings saved'));
        savedRef.current = { ...form };
        savedLocalesRef.current = [...form.supportedLocales];
        setIsDirty(false);

        // Auto-translate for any newly added additional locales
        const newLocales = form.supportedLocales.filter(
          (locale) => !previousLocales.includes(locale),
        );
        for (const locale of newLocales) {
          const langName = LOCALE_ENGLISH_NAMES[locale] ?? locale;
          toast('info', `${t('Translating menu to')} ${langName}...`);
          apiClient
            .post(`/t/${tenantSlug}/ordering/translate/batch`, { targetLocale: locale })
            .then(() => {
              toast('success', `${t('Menu translated to')} ${langName}!`);
            })
            .catch(() => {
              toast('error', `${t('Translation to')} ${langName} ${t('failed')} — ${t('you can retry from the Languages section')}`);
            });
        }
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : t('Failed to save settings'));
      },
    });
  }, [form, updateMutation, toast, tenantSlug, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">{t('Settings')}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {t('Pick a cuisine theme, brand identity, hours, tax, and languages. Changes preview live in this console — exactly what your customers will see.')}
          </p>
        </div>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        )}
      </div>

      {/* ═══════════ SECTION 1 — BRANDING ═══════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary shrink-0" />
            <CardTitle>{t('Branding')}</CardTitle>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {t('Cuisine theme sets the surface, typography, and shape language. Brand color overlays your accent on top of the theme defaults.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Cuisine theme grid */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">{t('Cuisine Theme')}</label>
            <div data-tour="cuisine-themes" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CUISINE_THEMES.map((theme) => (
                <CuisineThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={
                    form.cuisineTheme === theme.id ||
                    (theme.id === 'classic' && form.cuisineTheme === '')
                  }
                  onClick={() => {
                    updateField('cuisineTheme', theme.id === 'classic' ? '' : theme.id);
                    // Auto-suggest the theme's default brand color when the
                    // user hasn't manually overridden it (i.e. their current
                    // brand still matches some theme's default seed).
                    if (DEFAULT_BRAND_SEEDS.has(form.brandColor)) {
                      updateField('brandColor', theme.defaultBrand);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Brand color picker + derived palette */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-text">{t('Brand Color')}</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('brandColor', e.target.value)}
                className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                aria-label={t('Brand Color')}
              />
              <Input
                value={form.brandColor}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    updateField('brandColor', val);
                  }
                }}
                className="w-32 font-mono text-sm"
                placeholder="#2563eb" // lint-override: hex input field placeholder — user-facing hex color input, not chrome
              />
              <div
                className="w-10 h-10 rounded-md border border-border shrink-0"
                style={{ backgroundColor: form.brandColor }}
                title={form.brandColor}
              />
            </div>
            <ActiveThemePalette />
            <p className="text-xs text-text-tertiary">
              {t('Your brand color overlays the cuisine theme. Pick a shade that complements it.')}
            </p>
          </div>

          {/* Logo + Cover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUpload
              label={t('Logo')}
              value={form.logoUrl || null}
              onChange={(url) => updateField('logoUrl', url ?? '')}
              tenantSlug={tenantSlug}
              aspectRatio="1:1"
            />
            <ImageUpload
              label={t('Cover Image')}
              value={form.coverImageUrl || null}
              onChange={(url) => updateField('coverImageUrl', url ?? '')}
              tenantSlug={tenantSlug}
              aspectRatio="3:1"
            />
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ SECTION 2 — LANGUAGES ═══════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary shrink-0" />
            <CardTitle>{t('Languages')}</CardTitle>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {t('Primary is the language you write your menu in. Additional languages get auto-translated by AI when you save.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Select
            label={t('Primary Language')}
            value={form.primaryLocale}
            onChange={(value) => {
              const nextAdditional = form.supportedLocales.filter((l) => l !== value);
              updateField('primaryLocale', value);
              updateField('supportedLocales', nextAdditional);
            }}
            options={LANGUAGE_CONFIG.map((lang) => ({
              value: lang.code,
              label: `${lang.flag} ${lang.label}`,
            }))}
          />

          <div>
            <p className="text-sm font-medium text-text mb-2">{t('Additional Languages')}</p>
            <div className="space-y-2">
              {LANGUAGE_CONFIG.filter((lang) => lang.code !== form.primaryLocale).map((lang) => {
                const isEnabled = form.supportedLocales.includes(lang.code);
                const isNewlyEnabled = isEnabled && !savedLocalesRef.current.includes(lang.code);
                return (
                  <div
                    key={lang.code}
                    className={[
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isEnabled ? 'border-primary/30 bg-primary/5' : 'border-border',
                    ].join(' ')}
                  >
                    <span className="text-lg shrink-0">{lang.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{lang.label}</p>
                      {isNewlyEnabled && (
                        <p className="text-xs text-primary mt-0.5">
                          {t('Menu items will be translated automatically on save')}
                        </p>
                      )}
                    </div>
                    <Toggle
                      checked={isEnabled}
                      onChange={() => {
                        const next = isEnabled
                          ? form.supportedLocales.filter((l) => l !== lang.code)
                          : [...form.supportedLocales, lang.code];
                        updateField('supportedLocales', next);
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-tertiary mt-2">
              {t("Changing these settings doesn't re-translate existing content. Use the Translations page to regenerate if needed.")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ SECTION 3 — OPERATING HOURS ═══════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <CardTitle>{t('Operating Hours')}</CardTitle>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {t('When your restaurant is open and accepting orders. Days marked closed show a "closed" indicator to customers.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {form.operatingHours.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-bg-surface"
              >
                <span className="text-sm font-medium text-text w-24 shrink-0">
                  {t(DAY_NAMES[dayIndex])}
                </span>

                <Toggle
                  checked={day.isOpen}
                  label={day.isOpen ? t('Open') : t('Closed')}
                  onChange={(checked) => {
                    const updated = [...form.operatingHours];
                    updated[dayIndex] = { ...updated[dayIndex], isOpen: checked };
                    updateField('operatingHours', updated);
                  }}
                />

                {day.isOpen && (
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={day.open}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const updated = [...form.operatingHours];
                          updated[dayIndex] = { ...updated[dayIndex], open: e.target.value };
                          updateField('operatingHours', updated);
                        }}
                        aria-label={`${t(DAY_NAMES[dayIndex])} ${t('open')}`}
                        className="rounded-md border border-border px-2 py-1.5 text-sm text-text bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                      <span className="text-xs text-text-tertiary">{t('to')}</span>
                      <input
                        type="time"
                        value={day.close}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const updated = [...form.operatingHours];
                          updated[dayIndex] = { ...updated[dayIndex], close: e.target.value };
                          updateField('operatingHours', updated);
                        }}
                        aria-label={`${t(DAY_NAMES[dayIndex])} ${t('close')}`}
                        className="rounded-md border border-border px-2 py-1.5 text-sm text-text bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      />
                    </div>
                    {day.open >= day.close && (
                      <p className="text-xs text-danger mt-1">{t('Close time must be after open time')}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Last-order cutoff merged in (was a separate "Operations" section) */}
          <div className="border-t border-border pt-4 space-y-2">
            <Input
              label={t('Last-Order Cutoff (Minutes Before Closing)')}
              type="number"
              min="0"
              max="120"
              step="5"
              value={form.lastOrderMinutesBefore}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('lastOrderMinutesBefore', e.target.value)}
              placeholder={t('e.g. 30')}
            />
            <p className="text-xs text-text-tertiary">
              {t('Stop accepting orders this many minutes before close. Leave empty or 0 for no cutoff.')}
            </p>
            {parseInt(form.lastOrderMinutesBefore, 10) > 0 && (
              <p className="text-xs text-text-tertiary">
                {t('Example: if you close at 22:00, last orders will be accepted until')}{' '}
                {(() => {
                  const mins = parseInt(form.lastOrderMinutesBefore, 10);
                  const h = Math.floor((22 * 60 - mins) / 60);
                  const m = (22 * 60 - mins) % 60;
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                })()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ SECTION 4 — TAX & CURRENCY ═══════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary shrink-0" />
            <CardTitle>{t('Tax & Currency')}</CardTitle>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {t('Tax rate, label, and how prices are displayed. Leave rate empty or 0 for no tax.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t('Tax Rate (%)')}
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.taxRate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taxRate', e.target.value)}
              placeholder={t('e.g. 15')}
            />
            <Input
              label={t('Tax Label')}
              value={form.taxLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('taxLabel', e.target.value)}
              placeholder={t('e.g. GST, VAT, Tax')}
            />
          </div>
          <Toggle
            checked={form.taxInclusive}
            label={form.taxInclusive ? t('Tax inclusive (prices already include tax)') : t('Tax exclusive (tax added on top of prices)')}
            onChange={(checked) => updateField('taxInclusive', checked)}
          />
        </CardContent>
      </Card>

      {/* Bottom padding so content is not hidden behind sticky bar */}
      {isDirty && <div className="h-16" />}

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border px-6 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Palette className="h-4 w-4 shrink-0" />
            <span>{t('You have unsaved changes')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {t('Discard')}
            </Button>
            <Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>
              <Save className="h-4 w-4" />
              {t('Save Changes')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

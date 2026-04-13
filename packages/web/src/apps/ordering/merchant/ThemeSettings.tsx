import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette, Check, RotateCcw, Save, Eye, Clock, Monitor, Smartphone, Receipt, Globe, Store, Timer, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
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
  THEME_PRESETS,
  generatePalette,
  applyTenantTheme,
  textColorOnBrand,
  type TenantThemeSettings,
  type ThemePreset,
  type OperatingHoursEntry,
} from '@web/lib/theme';
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
  { code: 'zh', label: '\u4E2D\u6587 (Chinese)', flag: '\u{1F1E8}\u{1F1F3}', description: 'Simplified Chinese' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E (Japanese)', flag: '\u{1F1EF}\u{1F1F5}', description: 'Japanese' },
  { code: 'ko', label: '\uD55C\uAD6D\uC5B4 (Korean)', flag: '\u{1F1F0}\u{1F1F7}', description: 'Korean' },
  { code: 'fr', label: 'Fran\u00E7ais (French)', flag: '\u{1F1EB}\u{1F1F7}', description: 'French' },
] as const;

// --- Font options (safe web + Google Fonts from presets) ---
const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System Default' },
  { value: 'DM Sans', label: 'DM Sans' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Merriweather', label: 'Merriweather' },
];

type BorderRadius = 'sharp' | 'rounded' | 'pill';
type SurfaceStyle = 'flat' | 'subtle' | 'elevated';

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
  preset: string;
  brandColor: string;
  fontFamily: string;
  borderRadius: BorderRadius;
  surfaceStyle: SurfaceStyle;
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
    preset: settings?.preset ?? '',
    brandColor: settings?.brandColor ?? '#2563eb',
    fontFamily: settings?.fontFamily ?? 'system-ui',
    borderRadius: settings?.borderRadius ?? 'rounded',
    surfaceStyle: settings?.surfaceStyle ?? 'subtle',
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
  return {
    preset: form.preset || undefined,
    brandColor: form.brandColor,
    fontFamily: form.fontFamily === 'system-ui' ? undefined : form.fontFamily,
    borderRadius: form.borderRadius,
    surfaceStyle: form.surfaceStyle,
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

// --- Preset Card ---

interface PresetCardProps {
  preset: ThemePreset;
  isActive: boolean;
  onClick: () => void;
}

function PresetCard({ preset, isActive, onClick }: PresetCardProps) {
  const t = useT();
  const palette = generatePalette(preset.brandColor, false);
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex flex-col items-start gap-2 p-4 min-h-[80px] rounded-lg border-2 transition-all text-left active:scale-[0.98]',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isActive
          ? 'border-primary bg-primary-light shadow-sm'
          : 'border-border bg-bg-surface hover:border-border-strong',
      ].join(' ')}
    >
      {isActive && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-text-inverse" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full border border-border-strong shrink-0"
          style={{ backgroundColor: preset.brandColor }}
        />
        <div
          className="w-4 h-4 rounded-full shrink-0"
          style={{ backgroundColor: palette.primaryHover }}
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{preset.name}</p>
        <p className="text-xs text-text-secondary">{preset.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-xs text-text-tertiary"
          style={{ fontFamily: `'${preset.fontFamily}', sans-serif` }}
        >
          {preset.fontFamily}
        </span>
        <span className="text-xs text-text-tertiary">
          {preset.borderRadius === 'sharp' ? t('Sharp') : preset.borderRadius === 'pill' ? t('Pill') : t('Rounded')}
        </span>
      </div>
    </button>
  );
}

// --- Radio Group Component ---

interface RadioOption<T extends string> {
  value: T;
  label: string;
  preview: React.ReactNode;
}

interface RadioGroupProps<T extends string> {
  label: string;
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function RadioGroup<T extends string>({ label, options, value, onChange }: RadioGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text">{label}</span>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-col items-center gap-1.5 px-4 py-3 min-h-[64px] rounded-lg border-2 transition-all flex-1 active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              value === option.value
                ? 'border-primary bg-primary-light'
                : 'border-border bg-bg-surface hover:border-border-strong',
            ].join(' ')}
          >
            {option.preview}
            <span className="text-xs font-medium text-text">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Live Preview ---

type PreviewMode = 'desktop' | 'mobile';

interface LivePreviewProps {
  settings: FormState;
  isDark: boolean;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
}

function LivePreview({ settings, isDark, previewMode, onPreviewModeChange }: LivePreviewProps) {
  const t = useT();
  const palette = generatePalette(settings.brandColor, isDark);
  const fontStack = settings.fontFamily === 'system-ui'
    ? 'system-ui, -apple-system, sans-serif'
    : `'${settings.fontFamily}', system-ui, sans-serif`;

  const radiusMap: Record<BorderRadius, string> = {
    sharp: '4px',
    rounded: '8px',
    pill: '16px',
  };
  const radius = radiusMap[settings.borderRadius];

  const shadowMap: Record<SurfaceStyle, string> = {
    flat: 'none',
    subtle: '0 2px 4px -1px rgb(0 0 0 / 0.06)',
    elevated: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };
  const shadow = shadowMap[settings.surfaceStyle];

  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const surfaceBg = isDark ? '#1e293b' : '#f9fafb';
  const mutedBg = isDark ? '#334155' : '#f3f4f6';
  const textColor = isDark ? '#f1f5f9' : '#111827';
  const secondaryText = isDark ? '#94a3b8' : '#6b7280';
  const borderColor = isDark ? '#334155' : '#e5e7eb';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-medium text-text">{t('Live Preview')}</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onPreviewModeChange('desktop')}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              previewMode === 'desktop'
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
            ].join(' ')}
          >
            <Monitor className="h-4 w-4" />
            {t('Desktop')}
          </button>
          <button
            type="button"
            onClick={() => onPreviewModeChange('mobile')}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium rounded-md transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              previewMode === 'mobile'
                ? 'bg-primary text-text-inverse'
                : 'bg-bg-muted text-text-secondary hover:bg-bg-surface',
            ].join(' ')}
          >
            <Smartphone className="h-4 w-4" />
            {t('Mobile')}
          </button>
        </div>
      </div>

      {/* Preview container */}
      <div className={previewMode === 'mobile' ? 'max-w-[375px] mx-auto w-full' : ''}>
      <div
        className="rounded-xl border border-border overflow-hidden"
        style={{ fontFamily: fontStack, backgroundColor: bgColor }}
      >
        {/* Header area */}
        <div
          className="px-4 py-5 flex items-center gap-3"
          style={{ backgroundColor: palette.brand }}
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-lg object-cover"
              style={{ borderRadius: radius }}
              onError={(e) => { (e.target as HTMLImageElement).hidden = true; }}
            />
          ) : (
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                borderRadius: radius,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Palette className="w-5 h-5" style={{ color: textColorOnBrand(palette.brand) }} />
            </div>
          )}
          <div>
            <div
              className="text-base font-bold"
              style={{ color: textColorOnBrand(palette.brand) }}
            >
              Your Restaurant
            </div>
            <div
              className="text-xs opacity-80"
              style={{ color: textColorOnBrand(palette.brand) }}
            >
              Table 5
            </div>
          </div>
        </div>

        {/* Cover image */}
        {settings.coverImageUrl && (
          <div className="h-24 overflow-hidden">
            <img
              src={settings.coverImageUrl}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.hidden = true; }}
            />
          </div>
        )}

        {/* Menu preview */}
        <div className="p-4 space-y-3" style={{ backgroundColor: bgColor }}>
          {/* Category header */}
          <div
            className="text-sm font-bold pb-1"
            style={{ color: textColor, borderBottom: `2px solid ${palette.primary}` }}
          >
            Featured Items
          </div>

          {/* Menu item card 1 */}
          <div
            className="flex gap-3 p-3 border"
            style={{
              borderRadius: radius,
              boxShadow: shadow,
              backgroundColor: surfaceBg,
              borderColor: borderColor,
            }}
          >
            <div
              className="w-16 h-16 shrink-0 overflow-hidden"
              style={{
                borderRadius: radius,
                backgroundColor: mutedBg,
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-lg">
                🍣
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: textColor }}>
                  Salmon Sashimi
                </span>
                <span className="text-sm font-bold shrink-0" style={{ color: palette.primary }}>
                  $18.50
                </span>
              </div>
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: secondaryText }}>
                Fresh Atlantic salmon, thinly sliced
              </p>
              <div className="flex gap-1.5 mt-1.5">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5"
                  style={{
                    borderRadius: radius,
                    backgroundColor: palette.primaryLight,
                    color: palette.primary,
                  }}
                >
                  popular
                </span>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5"
                  style={{
                    borderRadius: radius,
                    backgroundColor: mutedBg,
                    color: secondaryText,
                  }}
                >
                  gluten-free
                </span>
              </div>
            </div>
          </div>

          {/* Menu item card 2 */}
          <div
            className="flex gap-3 p-3 border"
            style={{
              borderRadius: radius,
              boxShadow: shadow,
              backgroundColor: surfaceBg,
              borderColor: borderColor,
            }}
          >
            <div
              className="w-16 h-16 shrink-0 overflow-hidden"
              style={{
                borderRadius: radius,
                backgroundColor: mutedBg,
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-lg">
                🥘
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold" style={{ color: textColor }}>
                  Chicken Katsu Curry
                </span>
                <span className="text-sm font-bold shrink-0" style={{ color: palette.primary }}>
                  $22.00
                </span>
              </div>
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: secondaryText }}>
                Crispy panko chicken with Japanese curry
              </p>
            </div>
          </div>

          {/* CTA button */}
          <button
            type="button"
            className="w-full py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderRadius: radius,
              backgroundColor: palette.primary,
              color: textColorOnBrand(palette.primary),
            }}
          >
            View Cart (2 items)
          </button>
        </div>

        {/* Palette swatch row */}
        <div
          className="px-4 py-3 flex items-center gap-2 border-t"
          style={{ borderColor: borderColor, backgroundColor: surfaceBg }}
        >
          <span className="text-[10px] font-medium mr-1" style={{ color: secondaryText }}>Palette:</span>
          {[palette.brand, palette.primary, palette.primaryHover, palette.primaryLight].map((color, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border"
              style={{ backgroundColor: color, borderColor: borderColor }}
              title={color}
            />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export function ThemeSettings() {
  const t = useT();
  const { tenant, tenantSlug } = useTenant();
  const { theme: appTheme } = useTheme();
  const { toast } = useToast();
  const isDark = appTheme === 'dark';

  const { data: savedSettings, isLoading } = useTenantSettings(tenantSlug);
  const updateMutation = useUpdateTenantSettings(tenantSlug);

  const [form, setForm] = useState<FormState>(() => settingsToFormState(undefined));
  const [isDirty, setIsDirty] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [hoursExpanded, setHoursExpanded] = useState(false);
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

  // Apply live theme preview when form changes
  useEffect(() => {
    const themeSettings: TenantThemeSettings = {
      brandColor: form.brandColor,
      fontFamily: form.fontFamily === 'system-ui' ? undefined : form.fontFamily,
      borderRadius: form.borderRadius,
      surfaceStyle: form.surfaceStyle,
      preset: form.preset || undefined,
    };
    applyTenantTheme(themeSettings, isDark);
  }, [form.brandColor, form.fontFamily, form.borderRadius, form.surfaceStyle, form.preset, isDark]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const applyPreset = useCallback((preset: ThemePreset) => {
    setForm((prev) => ({
      ...prev,
      preset: preset.id,
      brandColor: preset.brandColor,
      fontFamily: preset.fontFamily,
      borderRadius: preset.borderRadius,
      surfaceStyle: preset.surfaceStyle,
    }));
    setIsDirty(true);
  }, []);

  const handleReset = useCallback(() => {
    if (savedRef.current) {
      setForm(savedRef.current);
      setIsDirty(false);
      // Restore saved theme
      const themeSettings: TenantThemeSettings = {
        brandColor: savedRef.current.brandColor,
        fontFamily: savedRef.current.fontFamily === 'system-ui' ? undefined : savedRef.current.fontFamily,
        borderRadius: savedRef.current.borderRadius,
        surfaceStyle: savedRef.current.surfaceStyle,
        preset: savedRef.current.preset || undefined,
      };
      applyTenantTheme(themeSettings, isDark);
    }
  }, [isDark]);

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
              toast('error', `${t('Translation to')} ${langName} ${t('failed')} \u2014 ${t('you can retry from the Languages section')}`);
            });
        }
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : t('Failed to save settings'));
      },
    });
  }, [form, updateMutation, toast, tenantSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-text">{t('Settings')}</h1>
            <p className="text-sm text-text-secondary">
              {t('Configure settings and appearance')}
            </p>
          </div>
        </div>
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            {t('Reset')}
          </Button>
        )}
      </div>

      {/* Main grid: settings + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: settings form */}
        <div className="lg:col-span-3 space-y-6">

          {/* ═══════════ RESTAURANT SECTION ═══════════ */}
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text">{t('Restaurant')}</h2>
          </div>

          {/* Operating Hours (collapsible) */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setHoursExpanded((prev) => !prev)}
                className="flex items-center justify-between w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>{t('Operating Hours')}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">
                    {(() => {
                      const openDays = form.operatingHours
                        .map((d, i) => ({ ...d, name: DAY_NAMES[i]?.slice(0, 3) }))
                        .filter((d) => d.isOpen);
                      if (openDays.length === 0) return t('Closed all days');
                      if (openDays.length === 7) {
                        const allSame = openDays.every(
                          (d) => d.open === openDays[0].open && d.close === openDays[0].close,
                        );
                        if (allSame) return `${t('Open daily')} ${openDays[0].open}\u2013${openDays[0].close}`;
                      }
                      return `${t('Open')} ${openDays.length} ${openDays.length > 1 ? t('days') : t('day')}`;
                    })()}
                  </span>
                  {hoursExpanded ? (
                    <ChevronUp className="h-4 w-4 text-text-tertiary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-tertiary" />
                  )}
                </div>
              </button>
            </CardHeader>
            {hoursExpanded && (
              <CardContent className="space-y-3">
                <p className="text-sm text-text-secondary">
                  {t('Set your opening hours. Days marked as closed will show a "closed" indicator to customers.')}
                </p>
                <div className="space-y-2">
                  {form.operatingHours.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-bg-surface"
                    >
                      {/* Day name */}
                      <span className="text-sm font-medium text-text w-24 shrink-0">
                        {t(DAY_NAMES[dayIndex])}
                      </span>

                      {/* Open toggle */}
                      <Toggle
                        checked={day.isOpen}
                        label={day.isOpen ? t('Open') : t('Closed')}
                        onChange={(checked) => {
                          const updated = [...form.operatingHours];
                          updated[dayIndex] = { ...updated[dayIndex], isOpen: checked };
                          updateField('operatingHours', updated);
                        }}
                      />

                      {/* Time inputs */}
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
              </CardContent>
            )}
          </Card>

          {/* Last Order Time */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-primary" />
                <CardTitle>{t('Last Order Cutoff')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-text-secondary">
                {t('Stop accepting orders a set number of minutes before closing time. Leave empty or 0 for no restriction.')}
              </p>
              <Input
                label={t('Minutes before closing')}
                type="number"
                min="0"
                max="120"
                step="5"
                value={form.lastOrderMinutesBefore}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField('lastOrderMinutesBefore', e.target.value)}
                placeholder="e.g. 30"
              />
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
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                <CardTitle>{t('Languages')}</CardTitle>
              </div>
              <p className="text-sm text-text-secondary mt-1">
                {t("Set your restaurant's primary language and optional translations for foreign customers.")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Primary Language */}
                <div>
                  <Select
                    label={t('Primary Language')}
                    value={form.primaryLocale}
                    onChange={(value) => {
                      // Remove new primary from additional locales if it was there
                      const nextAdditional = form.supportedLocales.filter((l) => l !== value);
                      updateField('primaryLocale', value);
                      updateField('supportedLocales', nextAdditional);
                    }}
                    options={LANGUAGE_CONFIG.map((lang) => ({
                      value: lang.code,
                      label: `${lang.flag} ${lang.label}`,
                    }))}
                  />
                  <p className="text-xs text-text-tertiary mt-1.5">
                    {t('This is the language you write menu items in. Customers see this by default.')}
                  </p>
                </div>

                {/* Additional Languages */}
                <div>
                  <p className="text-sm font-medium text-text mb-1.5">{t('Additional Languages')}</p>
                  <p className="text-xs text-text-tertiary mb-3">
                    {t('Menu items will be auto-translated to these languages. Customers can switch via the language picker.')}
                  </p>
                  <div className="space-y-3">
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
                          <span className="text-lg">{lang.flag}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text">{lang.label}</p>
                            <p className="text-xs text-text-tertiary">{lang.description}</p>
                            {isNewlyEnabled && (
                              <p className="text-xs text-primary mt-1">
                                {t('Menu items will be translated automatically on save')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-text-secondary">
                              {isEnabled ? t('Enabled') : t('Disabled')}
                            </span>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══════════ TAX SECTION ═══════════ */}
          <div className="flex items-center gap-2 pt-2">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text">{t('Tax')}</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-text-secondary">
                {t('Configure tax calculation for orders. Leave rate empty or 0 for no tax.')}
              </p>
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

          {/* ═══════════ THEME SECTION ═══════════ */}
          <div className="flex items-center gap-2 pt-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-text">{t('Theme')}</h2>
          </div>

          {/* Preset picker */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Theme Presets')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                {t('Choose a preset as a starting point, then customize to match your brand.')}
              </p>
              <div data-tour="theme-presets" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {THEME_PRESETS.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    isActive={form.preset === preset.id}
                    onClick={() => applyPreset(preset)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom overrides */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Custom Overrides')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Brand Color */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text">{t('Brand Color')}</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={form.brandColor}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        updateField('brandColor', e.target.value);
                        // Clear preset when manually changing color
                        if (form.preset) {
                          updateField('preset', '');
                        }
                      }}
                      className="w-12 h-10 rounded-md border border-border cursor-pointer bg-transparent p-0.5"
                    />
                  </div>
                  <Input
                    value={form.brandColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                        updateField('brandColor', val);
                        if (form.preset) {
                          updateField('preset', '');
                        }
                      }
                    }}
                    className="w-32 font-mono text-sm"
                    placeholder="#2563eb"
                  />
                  <div
                    className="w-10 h-10 rounded-md border border-border shrink-0"
                    style={{ backgroundColor: form.brandColor }}
                    title={form.brandColor}
                  />
                </div>
              </div>

              {/* Font Family */}
              <Select
                label={t('Font Family')}
                options={FONT_OPTIONS}
                value={form.fontFamily}
                onChange={(value) => {
                  updateField('fontFamily', value);
                  if (form.preset) {
                    updateField('preset', '');
                  }
                }}
              />

              {/* Border Radius */}
              <RadioGroup<BorderRadius>
                label={t('Border Radius')}
                value={form.borderRadius}
                onChange={(value) => {
                  updateField('borderRadius', value);
                  if (form.preset) {
                    updateField('preset', '');
                  }
                }}
                options={[
                  {
                    value: 'sharp',
                    label: t('Sharp'),
                    preview: (
                      <div className="w-10 h-7 border-2 border-text-secondary rounded-sm" />
                    ),
                  },
                  {
                    value: 'rounded',
                    label: t('Rounded'),
                    preview: (
                      <div className="w-10 h-7 border-2 border-text-secondary rounded-lg" />
                    ),
                  },
                  {
                    value: 'pill',
                    label: t('Pill'),
                    preview: (
                      <div className="w-10 h-7 border-2 border-text-secondary rounded-full" />
                    ),
                  },
                ]}
              />

              {/* Surface Style */}
              <RadioGroup<SurfaceStyle>
                label={t('Surface Style')}
                value={form.surfaceStyle}
                onChange={(value) => {
                  updateField('surfaceStyle', value);
                  if (form.preset) {
                    updateField('preset', '');
                  }
                }}
                options={[
                  {
                    value: 'flat',
                    label: t('Flat'),
                    preview: (
                      <div className="w-10 h-7 bg-bg-muted border border-border" />
                    ),
                  },
                  {
                    value: 'subtle',
                    label: t('Subtle'),
                    preview: (
                      <div
                        className="w-10 h-7 bg-bg-surface border border-border"
                        style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}
                      />
                    ),
                  },
                  {
                    value: 'elevated',
                    label: t('Elevated'),
                    preview: (
                      <div
                        className="w-10 h-7 bg-bg-surface border border-border"
                        style={{ boxShadow: '0 4px 6px rgb(0 0 0 / 0.1)' }}
                      />
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* Branding Assets */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Branding Assets')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6">
            <LivePreview settings={form} isDark={isDark} previewMode={previewMode} onPreviewModeChange={setPreviewMode} />
          </div>
        </div>
      </div>

      {/* Bottom padding so content is not hidden behind sticky bar */}
      {isDirty && <div className="h-16" />}

      {/* Sticky save bar */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border px-6 py-3 flex items-center justify-between shadow-lg">
          <p className="text-sm text-text-secondary">{t('You have unsaved changes')}</p>
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

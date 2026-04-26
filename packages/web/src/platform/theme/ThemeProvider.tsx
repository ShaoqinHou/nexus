import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';

type Mode = 'light' | 'dark';

/**
 * Canonical cuisine theme IDs from the Claude Design bundle. Each maps to a
 * [data-theme="<id>"] block in platform/theme/themes/*.css. Classic is the
 * merchant-console default and the fallback when no tenant theme is set.
 */
export const THEME_IDS = [
  'classic',
  'trattoria',
  'izakaya',
  'bubble-tea',
  'counter',
  'taqueria',
  'curry-house',
  'sichuan',
  'cantonese',
  'wok',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

interface ThemeContextValue {
  /** Light vs dark MODE (independent of cuisine theme ID). */
  theme: Mode;
  /** Toggle light <-> dark. */
  toggleTheme: () => void;
  /**
   * Active cuisine theme ID.
   * When a nested ThemeProvider is used (initialThemeId provided), this value
   * is scoped to the wrapper div — NOT applied to <html>.
   */
  themeId: ThemeId;
  /** Set the cuisine theme. Set to 'classic' to reset. */
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const MODE_STORAGE_KEY = 'nexus_theme';
const THEME_STORAGE_KEY = 'nexus_theme_id';

function getInitialMode(): Mode {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(MODE_STORAGE_KEY) : null;
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getInitialThemeId(): ThemeId {
  if (typeof localStorage === 'undefined') return 'classic';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : 'classic';
}

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Override the initial theme ID. Used by tenant-scoped shells (both
   * customer AND merchant) to pin to a tenant's chosen cuisine theme
   * regardless of localStorage. Omit for the global outer provider in
   * main.tsx where pre-tenant routes (login) use localStorage default.
   */
  initialThemeId?: ThemeId;
  /**
   * Per-tenant brand-color override. When present and this is a tenant-scoped
   * provider (initialThemeId set), applied as inline CSS custom properties on
   * the wrapper <div data-theme> — NOT on <html>. Layered ON TOP of the theme's
   * default brand so a single Sichuan restaurant can pick its own shade of red
   * without editing the theme. Pass the hex string (e.g. `#b8262b`); the hover
   * shade is derived by lib/theme palette logic.
   */
  brandColor?: string | null;
  /** Optional pre-computed brand-hover override (if the caller already knows it). */
  brandColorHover?: string | null;
  /**
   * Tag the wrapper for selector targeting. 'customer' marks the customer
   * shell, 'merchant' marks the merchant chrome. Both render the same
   * wrapper structure — the tag only affects the data-attribute.
   */
  scope?: 'customer' | 'merchant';
}

export function ThemeProvider({
  children,
  initialThemeId,
  brandColor,
  brandColorHover,
  scope,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [themeId, setThemeIdState] = useState<ThemeId>(
    initialThemeId ?? getInitialThemeId
  );

  /**
   * Whether this instance is a tenant-scoped (nested) provider.
   * When true, cuisine theme and brand colors are applied to a wrapper <div>,
   * NOT to <html> — keeping global pre-tenant chrome (login page) neutral.
   */
  const isTenantScoped = initialThemeId !== undefined;

  // Keep state in sync if the parent changes initialThemeId (e.g. tenant
  // settings refetch on save). Only applies when the caller is driving us —
  // local interactive setThemeId calls (e.g. ThemeSettings live preview)
  // still flip state immediately and are honoured.
  useEffect(() => {
    if (initialThemeId && initialThemeId !== themeId) {
      setThemeIdState(initialThemeId);
    }
  }, [initialThemeId, themeId]);

  // Apply light/dark class to <html> — always app-wide regardless of scope.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
      // localStorage may be unavailable (SSR, private mode, quota) — no-op.
    }
  }, [mode]);

  // Outer (global) provider: persist themeId to localStorage but do NOT
  // touch data-theme on <html>. The pre-tenant chrome stays neutral
  // (classic CSS default).
  useEffect(() => {
    if (isTenantScoped) return; // tenant scope uses wrapper div (see render)
    if (typeof document === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // no-op
    }
  }, [themeId, isTenantScoped]);

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: mode, toggleTheme, themeId, setThemeId }),
    [mode, toggleTheme, themeId, setThemeId]
  );

  // Tenant-scoped: wrap children in a <div data-theme="…"> so the cuisine
  // theme cascade applies to all descendants (merchant chrome OR customer
  // pages). Brand-color overrides are applied as inline CSS custom
  // properties on the same wrapper — they never reach <html>, so global
  // pre-tenant chrome is untouched.
  //
  // Both customer AND merchant shells wrap with the same component now —
  // the merchant chrome reflects the tenant's chosen cuisine theme so
  // staff get the same branded experience customers do (per
  // S-THEMED-COMPONENT updated 2026-04-26).
  if (isTenantScoped) {
    const brandStyle: CSSProperties = brandColor
      ? ({
          ['--color-brand' as never]: brandColor,
          ['--color-primary' as never]: brandColor,
          ...(brandColorHover
            ? {
                ['--color-brand-hover' as never]: brandColorHover,
                ['--color-primary-hover' as never]: brandColorHover,
              }
            : {}),
        } as CSSProperties)
      : {};

    return (
      <ThemeContext.Provider value={value}>
        <div
          data-theme={themeId}
          data-themed-scope={scope ?? 'customer'}
          style={brandStyle}
        >
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  // Outer (global) provider: no wrapper div, no data-theme on <html>.
  // Used by main.tsx so login + pre-tenant routes get a neutral classic look.
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Re-export inline-style helper for components that need to apply the brand
// override imperatively (e.g. the customer hero banner).
export function brandInlineStyle(brandColor?: string | null): CSSProperties {
  if (!brandColor) return {};
  return {
    ['--color-brand' as never]: brandColor,
    ['--color-primary' as never]: brandColor,
  };
}

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
   * Override the initial theme ID. Used by the customer shell to pin to a
   * tenant's chosen cuisine theme regardless of localStorage. Omit for the
   * merchant console where the staff member controls it interactively.
   */
  initialThemeId?: ThemeId;
  /**
   * Per-tenant brand-color override. When present and this is a customer-scoped
   * provider (initialThemeId set), applied as inline CSS custom properties on
   * the wrapper <div data-theme> — NOT on <html>. Layered ON TOP of the theme's
   * default brand so a single Sichuan restaurant can pick its own shade of red
   * without editing the theme. Pass the hex string (e.g. `#b8262b`); the hover
   * shade is derived by lib/theme palette logic.
   */
  brandColor?: string | null;
  /** Optional pre-computed brand-hover override (if the caller already knows it). */
  brandColorHover?: string | null;
}

export function ThemeProvider({
  children,
  initialThemeId,
  brandColor,
  brandColorHover,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<Mode>(getInitialMode);
  const [themeId, setThemeIdState] = useState<ThemeId>(
    initialThemeId ?? getInitialThemeId
  );

  /**
   * Whether this instance is a customer-scoped (nested) provider.
   * When true, cuisine theme and brand colors are applied to a wrapper <div>,
   * NOT to <html> — preventing theme cascade into merchant routes.
   */
  const isCustomerScoped = initialThemeId !== undefined;

  // Keep state in sync if the parent changes initialThemeId (e.g. customer
  // shell re-reads tenant settings on navigation). Only applies when the
  // caller is driving us — if the merchant console is letting the user
  // pick interactively, we respect the local state.
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

  // Outer (merchant) provider: persist themeId to localStorage but do NOT
  // touch data-theme on <html>. The merchant console stays neutral (classic
  // CSS default), satisfying S-THEMED-COMPONENT.
  useEffect(() => {
    if (isCustomerScoped) return; // customer scope uses wrapper div (see render)
    if (typeof document === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId);
    } catch {
      // no-op
    }
  }, [themeId, isCustomerScoped]);

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

  // Customer-scoped: wrap children in a <div data-theme="…"> so the cuisine
  // theme cascade is confined to customer routes only. Brand-color overrides
  // are applied as inline CSS custom properties on the same wrapper element —
  // they never reach <html>, so the merchant console stays unaffected.
  if (isCustomerScoped) {
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
        <div data-theme={themeId} data-customer-shell style={brandStyle}>
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  // Outer (merchant) provider: no wrapper div, no data-theme on <html>.
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

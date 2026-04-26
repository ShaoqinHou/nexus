import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { generatePalette } from '@web/lib/theme';

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

  // Keep state in sync ONLY when the parent's initialThemeId actually
  // changes (e.g. tenant settings refetched). We track the previous prop
  // via a ref so the effect doesn't re-fire when our local themeId state
  // changes from a setThemeId call.
  //
  // Why a ref instead of just dropping `themeId` from the dep array:
  // dropping it would cause an exhaustive-deps lint warning AND would
  // miss the legitimate case where the prop changes back to its previous
  // value (the comparison would still hold because we re-read state).
  // The ref makes the "did the prop change since last render" intent
  // explicit and stops the ping-pong loop where:
  //   1. user picks 'sichuan' in Settings → setThemeId('sichuan')
  //   2. effect re-fires (themeId changed), sees prop is still 'classic'
  //      → reverts to 'classic'
  //   3. ThemeSettings effect re-fires (activeThemeId changed) → loops.
  // S-THEMED-COMPONENT preview model: live preview is local state, not
  // tenant-state; the parent prop only takes precedence on actual save.
  const prevInitialRef = useRef<ThemeId | undefined>(initialThemeId);
  useEffect(() => {
    if (initialThemeId !== prevInitialRef.current) {
      prevInitialRef.current = initialThemeId;
      if (initialThemeId !== undefined) {
        setThemeIdState(initialThemeId);
      }
    }
  }, [initialThemeId]);

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

  // Tenant-scoped: mirror data-theme + brand-color overrides onto
  // `document.body` so portal-mounted overlays (Dialog, TourOverlay,
  // anything using createPortal(..., document.body)) inherit the
  // cuisine cascade. Without this, dialogs render in classic colors
  // over a sichuan-themed merchant chrome.
  //
  // Why body and not html: the outer (global) provider relies on
  // `<html>` staying neutral so the login page renders in classic. We
  // only want the cuisine theme reaching portals, and body is the
  // closest shared ancestor between the wrapper <div> and any
  // body-mounted portal sibling.
  useEffect(() => {
    if (!isTenantScoped) return;
    if (typeof document === 'undefined') return;
    const body = document.body;
    body.dataset.theme = themeId;
    if (brandColor) {
      const palette = generatePalette(brandColor, mode === 'dark');
      const hover = brandColorHover ?? palette.brandHover;
      // Raw brand for accent fills; mode-aware palette for text on neutral
      // surfaces. See in-render brandStyle comment for full rationale.
      body.style.setProperty('--color-brand', brandColor);
      body.style.setProperty('--color-primary', palette.primary);
      body.style.setProperty('--color-brand-hover', hover);
      body.style.setProperty('--color-primary-hover', palette.primaryHover);
      body.style.setProperty('--color-primary-light', palette.primaryLight);
      body.style.setProperty('--color-brand-light', palette.primaryLight);
    }
    return () => {
      // Cleanup on unmount or before next effect run — restore body to
      // its pre-tenant neutral state.
      delete body.dataset.theme;
      body.style.removeProperty('--color-brand');
      body.style.removeProperty('--color-primary');
      body.style.removeProperty('--color-brand-hover');
      body.style.removeProperty('--color-primary-hover');
      body.style.removeProperty('--color-primary-light');
      body.style.removeProperty('--color-brand-light');
    };
  }, [isTenantScoped, themeId, brandColor, brandColorHover, mode]);

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
    // Derive the FULL primary palette from the brand override so every
    // brand-driven token follows the merchant's chosen brand color and
    // remains readable in both light and dark modes.
    //
    // Distinction:
    //   --color-brand        = raw brand hex (used as accent fill on
    //                          hero banners, CTAs, brand chips)
    //   --color-primary      = mode-aware brand for readable text on
    //                          neutral surfaces. light mode keeps the
    //                          raw brand (lightness 35-55); dark mode
    //                          lightens to 55-70 so text-primary stays
    //                          legible against dark surfaces even when
    //                          the merchant picked a very dark brand
    //                          (e.g. #111827).
    //   --color-primary-light = badge background. Light mode l=93,
    //                          dark mode l=18. Always pairs with the
    //                          mode-aware --color-primary for contrast.
    //
    // Without splitting brand from primary, picking brand=#111827 under
    // a dark mode tenant chrome left text-primary as raw #111827 against
    // the dark-tinted primary-light (l=18) → both dark-blue, unreadable.
    const brandStyle: CSSProperties = (() => {
      if (!brandColor) return {};
      const palette = generatePalette(brandColor, mode === 'dark');
      const hover = brandColorHover ?? palette.brandHover;
      return {
        ['--color-brand' as never]: brandColor,
        ['--color-primary' as never]: palette.primary,
        ['--color-brand-hover' as never]: hover,
        ['--color-primary-hover' as never]: palette.primaryHover,
        ['--color-primary-light' as never]: palette.primaryLight,
        ['--color-brand-light' as never]: palette.primaryLight,
      } as CSSProperties;
    })();

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

import { Outlet, useSearch } from '@tanstack/react-router';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useT } from '@web/lib/i18n';
import type { TenantThemeSettings } from '@web/lib/theme';
import { textColorOnBrand, isOpenNow, generatePalette } from '@web/lib/theme';
import { ThemeProvider, isThemeId, useTheme } from '@web/platform/theme/ThemeProvider';

function RestaurantHero({
  name,
  settings,
  tableNumber,
}: {
  name: string;
  settings: TenantThemeSettings;
  tableNumber: string;
}) {
  const t = useT();
  const hasCover = !!settings.coverImageUrl;
  const hasLogo = !!settings.logoUrl;
  const brandColor = settings.brandColor ?? 'var(--color-brand)';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      {/* Banner */}
      {hasCover ? (
        <div className="relative h-28 sm:h-36 w-full overflow-hidden">
          <img
            src={settings.coverImageUrl}
            alt={`${name} cover`}
            className="h-full w-full object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>
      ) : (
        <div
          className="relative h-24 sm:h-32 w-full"
          style={{ backgroundColor: brandColor }}
        />
      )}

      {/* Table number badge */}
      {tableNumber && (
        <div className="absolute top-3 right-3 rounded-full bg-bg/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-text shadow-sm">
          {t('Table')} {tableNumber}
        </div>
      )}

      {/* Logo + Name area */}
      <div className="relative -mt-7 flex flex-col items-center pb-3">
        {/* Logo or initial circle */}
        {hasLogo ? (
          <div className="h-14 w-14 rounded-full border-2 border-bg bg-bg overflow-hidden shadow-md">
            <img
              src={settings.logoUrl}
              alt={`${name} logo`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            className="h-14 w-14 rounded-full border-2 border-bg flex items-center justify-center text-xl font-bold shadow-md"
            style={{
              backgroundColor: brandColor,
              color: textColorOnBrand(settings.brandColor ?? '#2563eb'), // lint-override: fallback seed for contrast calculation — textColorOnBrand() requires a parseable hex string; no CSS variable can substitute
            }}
          >
            {initial}
          </div>
        )}

        {/* Restaurant name + status */}
        <h1 className="mt-2 text-lg font-bold text-text">
          {name}
        </h1>
        {(() => {
          const status = isOpenNow(settings.operatingHours);
          return (
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`h-2 w-2 rounded-full ${status.open ? 'bg-success' : 'bg-danger'}`} />
              <span className="text-xs text-text-secondary">
                {status.open ? t('Open') : t('Closed')}
                {status.nextChangeTime && ` · ${status.open ? t('Closes at') : t('Opens at')} ${status.nextChangeTime}`}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/** Inner shell — rendered inside the nested ThemeProvider so all children inherit the tenant theme. */
function CustomerShellContent() {
  const t = useT();
  const { tenant, loading, error } = useTenant();
  const search = useSearch({ strict: false }) as Record<string, string>;
  const tableNumber = search.table ?? '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary text-sm">{t('Loading...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-text mb-2">
            {t('Restaurant not found')}
          </h1>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const settings = (tenant?.settings ?? {}) as TenantThemeSettings;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Restaurant hero header — scrolls away with content */}
      <header className="bg-bg">
        <div className="max-w-3xl lg:max-w-7xl mx-auto">
          <RestaurantHero
            name={tenant?.name ?? 'Menu'}
            settings={settings}
            tableNumber={tableNumber}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-3xl lg:max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * CustomerShell wraps the customer-facing view with a nested ThemeProvider
 * that pins the cuisine theme and brand color from the tenant's settings.
 *
 * Why a nested ThemeProvider (option a) rather than imperative CSS overrides
 * (option b): the nested context makes the theme source-of-truth explicit in
 * React's component tree, lets any child call useTheme() and receive the
 * correct tenant-scoped values, and is cleaned up automatically on unmount.
 * The outer ThemeProvider (mounted in main.tsx) remains active for the
 * merchant console; the nested one only shadows it for the customer path.
 */
export function CustomerShell() {
  const { tenant } = useTenant();
  const { theme: mode } = useTheme(); // read mode (light/dark) from outer provider

  const settings = (tenant?.settings ?? {}) as TenantThemeSettings;

  // Resolve cuisine theme — fall back to 'classic' silently for invalid/missing values
  const tenantThemeId = isThemeId(settings.theme) ? settings.theme : 'classic';

  // Derive brand-color palette for hover shade. If brandColor is absent, leave
  // both props undefined so the nested ThemeProvider's theme defaults take over.
  const isDark = mode === 'dark';
  const tenantBrandColor = settings.brandColor ?? null;
  const tenantBrandColorHover = tenantBrandColor
    ? generatePalette(tenantBrandColor, isDark).brandHover
    : null;

  return (
    // Nested ThemeProvider — overrides the outer provider for all customer views.
    // initialThemeId pins the cuisine theme from tenant settings.
    // brandColor / brandColorHover layer the tenant's brand on top of the theme default.
    <ThemeProvider
      initialThemeId={tenantThemeId}
      brandColor={tenantBrandColor}
      brandColorHover={tenantBrandColorHover}
    >
      <CustomerShellContent />
    </ThemeProvider>
  );
}

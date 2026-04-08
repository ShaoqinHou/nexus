import { Outlet, useSearch } from '@tanstack/react-router';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import type { TenantThemeSettings } from '@web/lib/theme';
import { textColorOnBrand } from '@web/lib/theme';

function RestaurantHero({
  name,
  settings,
  tableNumber,
}: {
  name: string;
  settings: TenantThemeSettings;
  tableNumber: string;
}) {
  const hasCover = !!settings.coverImageUrl;
  const hasLogo = !!settings.logoUrl;
  const brandColor = settings.brandColor ?? 'var(--color-brand)';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="relative">
      {/* Banner */}
      {hasCover ? (
        <div className="relative h-32 sm:h-40 w-full overflow-hidden">
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
          Table {tableNumber}
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
              color: textColorOnBrand(settings.brandColor ?? '#2563eb'),
            }}
          >
            {initial}
          </div>
        )}

        {/* Restaurant name */}
        <h1 className="mt-2 text-lg font-bold text-text">
          {name}
        </h1>
      </div>
    </div>
  );
}

export function CustomerShell() {
  const { tenant, loading, error } = useTenant();
  const search = useSearch({ strict: false }) as Record<string, string>;
  const tableNumber = search.table ?? '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-text mb-2">
            Restaurant not found
          </h1>
          <p className="text-sm text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const settings = (tenant?.settings ?? {}) as TenantThemeSettings;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Restaurant hero header */}
      <header className="sticky top-0 z-10 bg-bg border-b border-border">
        <div className="max-w-lg mx-auto">
          <RestaurantHero
            name={tenant?.name ?? 'Menu'}
            settings={settings}
            tableNumber={tableNumber}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-lg mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

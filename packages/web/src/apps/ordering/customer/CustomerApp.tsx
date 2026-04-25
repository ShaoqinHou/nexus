import { useSearch } from '@tanstack/react-router';
import { AlertCircle, QrCode } from 'lucide-react';
import { LocaleProvider } from '@web/platform/LocaleProvider';
import { CartProvider } from '@web/apps/ordering/customer/CartProvider';
import { CustomerAppInner } from '@web/apps/ordering/customer/CustomerAppInner';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import type { TenantThemeSettings } from '@web/lib/theme';
import type { Locale } from '@web/lib/i18n';
import { SUPPORTED_LOCALES, useT } from '@web/lib/i18n';

interface CustomerAppProps {
  tenantSlug: string;
}

export function CustomerApp({ tenantSlug }: CustomerAppProps) {
  const t = useT();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const tableNumber = search.table != null ? String(search.table) : '';
  const { tenant } = useTenant();

  if (!tableNumber) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="rounded-full bg-warning-light p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-lg font-bold text-text mb-2">
          {t('No Table Selected')}
        </h2>
        <p className="text-sm text-text-secondary max-w-xs">
          {t('Please scan the QR code at your table to start ordering.')}
        </p>
        <div className="mt-6 rounded-full bg-bg-muted p-6">
          <QrCode className="h-12 w-12 text-text-tertiary" />
        </div>
      </div>
    );
  }

  // Read locale config from tenant settings
  const tenantSettings = (tenant?.settings ?? {}) as TenantThemeSettings;
  const primaryLocale = (tenantSettings.primaryLocale ?? 'en') as Locale;
  const validPrimary = SUPPORTED_LOCALES.includes(primaryLocale) ? primaryLocale : 'en';
  const additionalLocales = ((tenantSettings.supportedLocales ?? []) as string[])
    .filter((l): l is Locale => SUPPORTED_LOCALES.includes(l as Locale));
  const availableLocales: Locale[] = [validPrimary, ...additionalLocales.filter((l) => l !== validPrimary)];

  return (
    <CartProvider tenantSlug={tenantSlug} tableNumber={tableNumber}>
      <LocaleProvider defaultLocale={validPrimary}>
        <CustomerAppInner
          tenantSlug={tenantSlug}
          tableNumber={tableNumber}
          availableLocales={availableLocales}
        />
      </LocaleProvider>
    </CartProvider>
  );
}

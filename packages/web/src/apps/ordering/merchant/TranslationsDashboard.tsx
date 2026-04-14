import { Languages as LanguagesIcon, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@web/components/ui';
import { EmptyState } from '@web/components/patterns';
import { useT, LOCALE_LABELS, type Locale } from '@web/lib/i18n';
import { apiClient } from '@web/lib/api';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { orderingKeys } from '../hooks/keys';
import type { EntityType } from '../hooks/useEntityTranslations';

// ---------------------------------------------------------------------------
// Types matching GET /translations/overview
// ---------------------------------------------------------------------------

interface TypeCounts {
  manual: number;
  auto: number;
  locales: string[];
}

interface RecentEdit {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  field: string;
  locale: string;
  value: string;
  source: 'auto' | 'manual';
  updatedAt: string;
}

interface OverviewData {
  counts: Record<string, TypeCounts>;
  recentEdits: RecentEdit[];
}

// Display order for the type table — keeps the dashboard predictable.
const TYPE_ORDER: EntityType[] = [
  'menu_item',
  'menu_category',
  'modifier_group',
  'modifier_option',
  'promotion',
  'combo_deal',
  'combo_slot',
];

const TYPE_LABEL_KEY: Record<EntityType, string> = {
  menu_item: 'Menu Item',
  menu_category: 'Menu Category',
  modifier_group: 'Modifier Group',
  modifier_option: 'Modifier Option',
  promotion: 'Promotion',
  combo_deal: 'Combo Deal',
  combo_slot: 'Combo Slot',
};

// Map an entity type to the merchant page that owns its edit dialog so the
// "open editor" link can deep-link there. Menu items support ?openItem= for a
// direct dialog open; the others land on the list page (the dialog is opened
// by the user from there).
function editLinkFor(entityType: EntityType, entityId: string): {
  to: string;
  search?: Record<string, string>;
} {
  switch (entityType) {
    case 'menu_item':
      return { to: '/t/$tenantSlug/ordering/menu', search: { openItem: entityId } };
    case 'menu_category':
      return { to: '/t/$tenantSlug/ordering/menu' };
    case 'modifier_group':
    case 'modifier_option':
      return { to: '/t/$tenantSlug/ordering/modifiers' };
    case 'promotion':
      return { to: '/t/$tenantSlug/ordering/promotions' };
    case 'combo_deal':
    case 'combo_slot':
      return { to: '/t/$tenantSlug/ordering/combos' };
  }
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);

  // Use Intl.RelativeTimeFormat with the user's UI locale for natural phrasing.
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Date(iso).toLocaleDateString(locale);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function TranslationsDashboard() {
  const t = useT();
  const { tenantSlug } = useTenant();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...orderingKeys.all, 'translations', 'overview', tenantSlug] as const,
    queryFn: () =>
      apiClient.get<{ data: OverviewData }>(
        `/t/${tenantSlug}/ordering/translations/overview`,
      ),
    select: (res) => res.data,
    staleTime: 30000,
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <LanguagesIcon className="h-6 w-6 text-primary" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-semibold text-text">{t('Translation Management')}</h1>
          <p className="text-sm text-text-secondary">
            {t('Manage manual translation overrides for menu content')}
          </p>
        </div>
      </header>

      {isLoading && (
        <div className="text-sm text-text-secondary">{t('Loading...')}</div>
      )}

      {isError && (
        <div className="text-sm text-danger">
          {t('Failed to load translations')}: {error instanceof Error ? error.message : String(error)}
        </div>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('Manual overrides')} / {t('AI translations')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-bg-muted text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">{t('Type')}</th>
                      <th className="text-right px-4 py-2 font-medium">{t('Manual')}</th>
                      <th className="text-right px-4 py-2 font-medium">{t('AI')}</th>
                      <th className="text-left px-4 py-2 font-medium">{t('Languages')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TYPE_ORDER.map((type) => {
                      const c = data.counts[type] ?? { manual: 0, auto: 0, locales: [] };
                      return (
                        <tr key={type} className="border-t border-border">
                          <td className="px-4 py-2 text-text">{t(TYPE_LABEL_KEY[type])}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-text">
                            {c.manual > 0 ? (
                              <Badge variant="info">{c.manual}</Badge>
                            ) : (
                              <span className="text-text-tertiary">0</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-text-secondary">
                            {c.auto}
                          </td>
                          <td className="px-4 py-2">
                            {c.locales.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {c.locales.map((loc) => (
                                  <span
                                    key={loc}
                                    className="inline-block rounded bg-bg-muted px-1.5 py-0.5 text-xs text-text-secondary"
                                  >
                                    {LOCALE_LABELS[loc as Locale] ?? loc}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Recent edits')}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentEdits.length === 0 ? (
                <EmptyState
                  icon={LanguagesIcon}
                  title={t('No manual edits yet')}
                  description={t('Manage manual translation overrides for menu content')}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentEdits.map((edit) => {
                    const link = editLinkFor(edit.entityType, edit.entityId);
                    return (
                      <li
                        key={`${edit.entityType}-${edit.entityId}-${edit.locale}-${edit.field}`}
                        className="py-2 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="font-medium text-text truncate">
                              {edit.entityName}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {t(TYPE_LABEL_KEY[edit.entityType])}
                            </span>
                            <Badge variant="default">{edit.field}</Badge>
                            <Badge variant="info">
                              {LOCALE_LABELS[edit.locale as Locale] ?? edit.locale}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-text break-words">
                            {edit.value}
                          </p>
                          <p className="mt-0.5 text-xs text-text-tertiary">
                            {formatRelativeTime(edit.updatedAt, 'en')}
                          </p>
                        </div>
                        <Link
                          to={link.to}
                          params={{ tenantSlug: tenantSlug ?? '' }}
                          search={link.search}
                          className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          {t('Open editor')}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Languages as LanguagesIcon,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearch, useNavigate } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from '@web/components/ui';
import { EmptyState } from '@web/components/patterns';
import { useT, LOCALE_LABELS, type Locale } from '@web/lib/i18n';
import { apiClient } from '@web/lib/api';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import { orderingKeys } from '../hooks/keys';
import {
  useTranslationsByType,
  useSetManualTranslation,
  useResetTranslation,
  type EntityType,
  type EntityTranslation,
  type EntityWithTranslations,
} from '../hooks/useEntityTranslations';

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

// Plural labels for the tab strip.
const TYPE_TAB_LABEL: Record<EntityType, string> = {
  menu_item: 'Menu Items',
  menu_category: 'Categories',
  modifier_group: 'Modifier Groups',
  modifier_option: 'Modifier Options',
  promotion: 'Promotions',
  combo_deal: 'Combos',
  combo_slot: 'Combo Slots',
};

// Per-entity translatable field list (mirrors backend ENTITY_FIELDS).
const FIELDS_BY_TYPE: Record<EntityType, readonly string[]> = {
  menu_item: ['name', 'description'],
  menu_category: ['name', 'description'],
  modifier_group: ['name'],
  modifier_option: ['name'],
  promotion: ['name', 'description'],
  combo_deal: ['name', 'description'],
  combo_slot: ['name'],
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

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return new Date(iso).toLocaleDateString(locale);
}

function getTenantLocaleSettings(tenant: { settings?: unknown } | null | undefined): {
  primary: string;
  additional: string[];
} {
  if (!tenant?.settings) return { primary: 'en', additional: [] };
  const settings = typeof tenant.settings === 'string'
    ? (() => {
        try {
          return JSON.parse(tenant.settings as unknown as string);
        } catch {
          return {};
        }
      })()
    : (tenant.settings as Record<string, unknown>);
  const primary = (settings as { primaryLocale?: string }).primaryLocale ?? 'en';
  const additional = ((settings as { supportedLocales?: string[] }).supportedLocales ?? [])
    .filter((l) => l !== primary);
  return { primary, additional };
}

// ---------------------------------------------------------------------------
// Inline cell editor for a single (locale, field) translation.
// ---------------------------------------------------------------------------

function InlineTranslationCell({
  tenantSlug,
  entityType,
  entityId,
  locale,
  field,
  translations,
}: {
  tenantSlug: string;
  entityType: EntityType;
  entityId: string;
  locale: string;
  field: string;
  translations: EntityTranslation[];
}) {
  const t = useT();
  const { toast } = useToast();
  const setManual = useSetManualTranslation(tenantSlug);
  const resetAuto = useResetTranslation(tenantSlug);

  const current = translations.find((tr) => tr.locale === locale && tr.field === field);
  const currentValue = current?.value ?? '';
  const source = current?.source;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);

  useEffect(() => {
    if (!editing) setDraft(currentValue);
  }, [currentValue, editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setManual.mutate(
      { entityType, entityId, locale, field, value: trimmed },
      {
        onSuccess: () => {
          setEditing(false);
          toast('success', t('Save translation'));
        },
        onError: (err) => toast('error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const handleReset = () => {
    resetAuto.mutate(
      { entityType, entityId, locale, field },
      {
        onSuccess: () => toast('success', t('Reset to AI translation')),
        onError: (err) => toast('error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  if (editing) {
    return (
      <div className="space-y-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={handleSave}
            loading={setManual.isPending}
            disabled={!draft.trim()}
          >
            {t('Save')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setDraft(currentValue);
            }}
          >
            {t('Cancel')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="group block w-full text-left rounded px-1 py-0.5 hover:bg-bg-muted transition-colors"
      title={t('Click to edit')}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          {currentValue ? (
            <span className="text-sm text-text break-words">{currentValue}</span>
          ) : (
            <span className="text-sm italic text-text-tertiary">{t('No translation')}</span>
          )}
        </div>
        {source === 'manual' && (
          <Badge variant="warning">{t('Manual')}</Badge>
        )}
        {source === 'auto' && (
          <Badge variant="info">{t('AI')}</Badge>
        )}
      </div>
      {source === 'manual' && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          className="mt-0.5 inline-block text-[10px] text-text-tertiary hover:text-primary underline"
          role="button"
        >
          {t('Reset to AI')}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Drill-down table for a single entity type.
// ---------------------------------------------------------------------------

function DrillDownTable({
  tenantSlug,
  entityType,
  additionalLocales,
  primaryLocale,
}: {
  tenantSlug: string;
  entityType: EntityType;
  additionalLocales: string[];
  primaryLocale: string;
}) {
  const t = useT();
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data, isLoading, isError, error } = useTranslationsByType(
    tenantSlug,
    entityType,
    page,
    limit,
  );

  // Reset to page 1 when the entity type changes.
  useEffect(() => {
    setPage(1);
  }, [entityType]);

  const fields = FIELDS_BY_TYPE[entityType];

  if (isLoading) {
    return <div className="text-sm text-text-secondary p-4">{t('Loading...')}</div>;
  }

  if (isError) {
    return (
      <div className="text-sm text-danger p-4">
        {t('Failed to load translations')}: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (!data || data.entities.length === 0) {
    return (
      <EmptyState
        icon={LanguagesIcon}
        title={t('No items yet')}
        description={t('Create content first and it will appear here for translation review.')}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-bg-muted text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-48 sticky left-0 bg-bg-muted">
                {t('Item')}
              </th>
              <th className="text-left px-3 py-2 font-medium w-8">{t('Field')}</th>
              <th className="text-left px-3 py-2 font-medium bg-bg-surface">
                {t('Source')} ({LOCALE_LABELS[primaryLocale as Locale] ?? primaryLocale})
              </th>
              {additionalLocales.map((loc) => (
                <th key={loc} className="text-left px-3 py-2 font-medium">
                  {LOCALE_LABELS[loc as Locale] ?? loc}
                </th>
              ))}
              <th className="text-right px-3 py-2 font-medium w-8">{' '}</th>
            </tr>
          </thead>
          <tbody>
            {data.entities.map((entity) => (
              <EntityRows
                key={entity.id}
                tenantSlug={tenantSlug}
                entityType={entityType}
                entity={entity}
                fields={fields}
                additionalLocales={additionalLocales}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-text-secondary">
            {t('Page')} {data.page} / {totalPages} — {data.total} {t('items')}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('Previous')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('Next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Render one entity as one row per translatable field (so name + description
// each get their own row — cleaner source↔translation alignment).
function EntityRows({
  tenantSlug,
  entityType,
  entity,
  fields,
  additionalLocales,
}: {
  tenantSlug: string;
  entityType: EntityType;
  entity: EntityWithTranslations;
  fields: readonly string[];
  additionalLocales: string[];
}) {
  const t = useT();
  const link = editLinkFor(entityType, entity.id);

  return (
    <>
      {fields.map((field, fieldIdx) => {
        // Source value from the entity itself (primary locale).
        const sourceValue: string =
          field === 'name'
            ? entity.name
            : field === 'description'
              ? (entity.description ?? '')
              : '';
        const isFirst = fieldIdx === 0;
        return (
          <tr
            key={`${entity.id}-${field}`}
            className={[
              'border-t border-border align-top',
              isFirst ? '' : 'border-t-transparent',
            ].join(' ')}
          >
            <td className="px-3 py-2 sticky left-0 bg-bg">
              {isFirst ? (
                <div className="font-medium text-text truncate">{entity.name}</div>
              ) : (
                <span className="text-xs text-text-tertiary">↳</span>
              )}
            </td>
            <td className="px-3 py-2 text-xs text-text-secondary">{t(field)}</td>
            <td className="px-3 py-2 bg-bg-surface text-text">
              {sourceValue ? (
                <span className="break-words">{sourceValue}</span>
              ) : (
                <span className="italic text-text-tertiary">—</span>
              )}
            </td>
            {additionalLocales.map((loc) => (
              <td key={loc} className="px-3 py-2">
                {sourceValue ? (
                  <InlineTranslationCell
                    tenantSlug={tenantSlug}
                    entityType={entityType}
                    entityId={entity.id}
                    locale={loc}
                    field={field}
                    translations={entity.translations}
                  />
                ) : (
                  <span className="italic text-text-tertiary text-xs">—</span>
                )}
              </td>
            ))}
            <td className="px-3 py-2 text-right">
              {isFirst && (
                <Link
                  to={link.to}
                  params={{ tenantSlug }}
                  search={link.search}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  title={t('Open editor')}
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Link>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// Tab state lives in the URL so refresh preserves it.
interface DashboardSearch {
  tab?: EntityType;
}

export function TranslationsDashboard() {
  const t = useT();
  const { tenantSlug, tenant } = useTenant();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as DashboardSearch;

  const activeTab: EntityType = TYPE_ORDER.includes(search.tab as EntityType)
    ? (search.tab as EntityType)
    : 'menu_item';

  const setActiveTab = (tab: EntityType) => {
    navigate({
      to: '/t/$tenantSlug/ordering/translations',
      params: { tenantSlug: tenantSlug ?? '' },
      search: { tab },
    });
  };

  const { primary, additional } = getTenantLocaleSettings(tenant);

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

      {/* "How it works" banner — clarifies that AI translates automatically. */}
      <Card>
        <CardContent className="flex gap-3 p-4">
          <div className="flex-shrink-0 rounded-lg bg-primary-light p-2 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-semibold text-text">{t('How AI translation works')}</h3>
            <p className="text-sm text-text-secondary">
              {t('Every time you save a menu item, category, modifier, promotion, or combo, AI automatically generates translations for all your supported languages. No manual action needed.')}
            </p>
            <p className="text-sm text-text-secondary">
              {t("To override an AI translation with your own wording, edit that specific translation below or in the item's edit dialog.")}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-text-secondary">
                {t('Primary')}:
              </span>
              <Badge variant="default">
                {LOCALE_LABELS[primary as Locale] ?? primary}
              </Badge>
              {additional.length > 0 ? (
                <>
                  <span className="text-xs text-text-secondary ml-2">
                    {t('Translating to')}:
                  </span>
                  {additional.map((loc) => (
                    <Badge key={loc} variant="info">
                      {LOCALE_LABELS[loc as Locale] ?? loc}
                    </Badge>
                  ))}
                </>
              ) : (
                <span className="text-xs text-text-tertiary">
                  {t('No additional languages configured')}
                </span>
              )}
              <Link
                to="/t/$tenantSlug/ordering/settings"
                params={{ tenantSlug: tenantSlug ?? '' }}
                className="text-sm text-primary underline ml-auto"
              >
                {t('Configure languages')}
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

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

          {/* Drill-down: tabs + inline-editable table per entity type. */}
          <Card>
            <CardHeader>
              <CardTitle>{t('All translations')}</CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                {t('Click any translated value to edit it inline. Manual edits override AI output until you reset them.')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Entity type tab strip */}
              <div className="flex flex-wrap gap-1 border-b border-border">
                {TYPE_ORDER.map((type) => {
                  const isActive = activeTab === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActiveTab(type)}
                      className={[
                        'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-secondary hover:text-text',
                      ].join(' ')}
                    >
                      {t(TYPE_TAB_LABEL[type])}
                    </button>
                  );
                })}
              </div>

              {additional.length === 0 ? (
                <EmptyState
                  icon={LanguagesIcon}
                  title={t('No additional languages configured')}
                  description={t('Enable additional languages in settings to see translations here.')}
                />
              ) : (
                <DrillDownTable
                  tenantSlug={tenantSlug ?? ''}
                  entityType={activeTab}
                  additionalLocales={additional}
                  primaryLocale={primary}
                />
              )}
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

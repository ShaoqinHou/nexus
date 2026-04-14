import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  FolderOpen,
  UtensilsCrossed,
  Settings2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
  Toggle,
  ImageUpload,
} from '@web/components/ui';
import { ConfirmButton, EmptyState } from '@web/components/patterns';
import { formatPrice, parseTags } from '@web/lib/format';
import { useT, SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from '@web/lib/i18n';
import { TOUR_MARKER } from '../tours/cleanup';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useToggleSoldOut,
} from '../hooks/useMenu';
import {
  useItemTranslations,
  useSetManualTranslation,
  useResetTranslation,
  useRegenerateTranslations,
  type ItemTranslation,
} from '../hooks/useTranslations';
import {
  useModifierGroups,
  useItemModifierGroups,
  useSetItemModifierGroups,
} from '../hooks/useModifiers';
import type { MenuCategory, MenuItem, CategoryStation } from '../types';
import { DIETARY_TAGS, ALLERGENS } from '../types';

// Language labels for source-language hint in edit dialogs
const PRIMARY_LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  zh: '\u4E2D\u6587',
  ja: '\u65E5\u672C\u8A9E',
  ko: '\uD55C\uAD6D\uC5B4',
  fr: 'Fran\u00E7ais',
};

function useTenantPrimaryLocale(): string | undefined {
  const { tenant } = useTenant();
  if (!tenant?.settings) return undefined;
  const settings = typeof tenant.settings === 'string'
    ? (() => { try { return JSON.parse(tenant.settings as unknown as string); } catch { return {}; } })()
    : tenant.settings;
  return (settings as { primaryLocale?: string })?.primaryLocale;
}

// ---------------------------------------------------------------------------
// Category form dialog
// ---------------------------------------------------------------------------

interface CategoryFormData {
  name: string;
  description: string;
}

function CategoryDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => void;
  initial?: CategoryFormData;
  loading: boolean;
}) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
  }, [initial]);

  const isEdit = !!initial;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim() });
  };

  // Reset form when dialog opens with new initial values
  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? t('Edit Category') : t('Add Category')}
      data-tour="category-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading} className="min-h-[48px]">
            {t('Cancel')}
          </Button>
          <Button
            data-tour="category-save"
            type="submit"
            form="category-form"
            loading={loading}
            disabled={!name.trim()}
            className="min-h-[48px]"
          >
            {isEdit ? t('Save') : t('Add')}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          data-tour="category-name-input"
          label={t('Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('e.g. Mains, Drinks, Desserts')}
          required
          autoFocus
        />
        <Input
          label={t('Description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Optional description')}
          data-tour="category-description-input"
        />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Menu item form dialog
// ---------------------------------------------------------------------------

interface ItemFormData {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  tags: string;
  allergens: string;
}

// ---------------------------------------------------------------------------
// Translation field — inline editor for a single (locale, field) translation
// ---------------------------------------------------------------------------

function TranslationField({
  itemId,
  locale,
  field,
  label,
  sourceValue,
  translations,
  tenantSlug,
}: {
  itemId: string;
  locale: string;
  field: 'name' | 'description';
  label: string;
  sourceValue: string;
  translations: ItemTranslation[] | undefined;
  tenantSlug: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const setManual = useSetManualTranslation(tenantSlug);
  const resetAuto = useResetTranslation(tenantSlug);

  const current = translations?.find((tr) => tr.locale === locale && tr.field === field);
  const currentValue = current?.value ?? '';
  const source = current?.source ?? 'auto';

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);

  useEffect(() => {
    setDraft(currentValue);
  }, [currentValue, editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setManual.mutate(
      { itemId, locale, field, value: trimmed },
      {
        onSuccess: () => {
          setEditing(false);
          toast('success', t('Save translation'));
        },
        onError: (err) => {
          toast('error', err instanceof Error ? err.message : String(err));
        },
      },
    );
  };

  const handleReset = () => {
    resetAuto.mutate(
      { itemId, locale, field },
      {
        onSuccess: () => {
          toast('success', t('Reset to AI translation'));
        },
        onError: (err) => {
          toast('error', err instanceof Error ? err.message : String(err));
        },
      },
    );
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <Badge variant={source === 'manual' ? 'info' : 'default'}>
          {source === 'manual' ? t('Manual') : t('AI')}
        </Badge>
      </div>
      {sourceValue && (
        <p className="text-xs text-text-tertiary italic">
          {t('Source')}: {sourceValue}
        </p>
      )}
      {editing ? (
        <div className="space-y-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={sourceValue}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              loading={setManual.isPending}
              disabled={!draft.trim()}
            >
              {t('Save translation')}
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
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-text">
            {currentValue || <span className="italic text-text-tertiary">{t('No translation yet')}</span>}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t('Edit')}
            </Button>
            {source === 'manual' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                loading={resetAuto.isPending}
              >
                {t('Reset to AI translation')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translations section (inside ItemDialog) — shows all additional locales
// ---------------------------------------------------------------------------

function ItemTranslationsSection({
  itemId,
  tenantSlug,
  sourceName,
  sourceDescription,
}: {
  itemId: string;
  tenantSlug: string;
  sourceName: string;
  sourceDescription: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const primaryLocale = useTenantPrimaryLocale() ?? 'en';
  const { tenant } = useTenant();
  const tenantSettings = tenant?.settings
    ? typeof tenant.settings === 'string'
      ? (() => {
          try {
            return JSON.parse(tenant.settings as unknown as string);
          } catch {
            return {};
          }
        })()
      : (tenant.settings as Record<string, unknown>)
    : {};
  const additionalLocales = ((tenantSettings as { supportedLocales?: string[] })
    .supportedLocales ?? []) as string[];
  const localesToShow = additionalLocales.filter(
    (l): l is Locale =>
      l !== primaryLocale && (SUPPORTED_LOCALES as readonly string[]).includes(l),
  );

  const { data: translations } = useItemTranslations(tenantSlug, itemId);
  const regenerate = useRegenerateTranslations(tenantSlug);

  const handleRegenerate = () => {
    regenerate.mutate(
      { itemId },
      {
        onSuccess: () => toast('success', t('Regenerate all from source')),
        onError: (err) => toast('error', err instanceof Error ? err.message : String(err)),
      },
    );
  };

  if (localesToShow.length === 0) {
    return null;
  }

  return (
    <details className="mt-4 border-t border-border pt-3">
      <summary className="cursor-pointer text-sm font-medium text-text">
        {t('Translations')}
      </summary>
      <div className="mt-3 space-y-3">
        {localesToShow.map((locale) => (
          <div key={locale} className="border border-border rounded p-2 space-y-3">
            <div className="text-xs font-medium text-text">
              {LOCALE_LABELS[locale]}
            </div>
            <TranslationField
              itemId={itemId}
              locale={locale}
              field="name"
              label={t('Name')}
              sourceValue={sourceName}
              translations={translations}
              tenantSlug={tenantSlug}
            />
            {sourceDescription && (
              <TranslationField
                itemId={itemId}
                locale={locale}
                field="description"
                label={t('Description')}
                sourceValue={sourceDescription}
                translations={translations}
                tenantSlug={tenantSlug}
              />
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRegenerate}
          loading={regenerate.isPending}
        >
          {t('Regenerate all from source')}
        </Button>
      </div>
    </details>
  );
}

function ItemDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
  tenantSlug,
  itemId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => void;
  initial?: ItemFormData;
  loading: boolean;
  tenantSlug: string;
  itemId?: string;
}) {
  const t = useT();
  const primaryLocale = useTenantPrimaryLocale();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(initial?.tags?.split(',').filter(Boolean) ?? []),
  );
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(
    () => new Set(initial?.allergens?.split(',').filter(Boolean) ?? []),
  );

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setPrice(initial?.price?.toString() ?? '');
    setImageUrl(initial?.imageUrl ?? '');
    setSelectedTags(new Set(initial?.tags?.split(',').filter(Boolean) ?? []));
    setSelectedAllergens(new Set(initial?.allergens?.split(',').filter(Boolean) ?? []));
  }, [initial]);

  const isEdit = !!initial;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(allergen)) {
        next.delete(allergen);
      } else {
        next.add(allergen);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl: imageUrl.trim(),
      tags: Array.from(selectedTags).join(','),
      allergens: Array.from(selectedAllergens).join(','),
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setSelectedTags(new Set());
    setSelectedAllergens(new Set());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? t('Edit Item') : t('Add Item')}
      data-tour="item-dialog"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading} className="min-h-[48px]">
            {t('Cancel')}
          </Button>
          <Button
            data-tour="item-save"
            type="submit"
            form="item-form"
            loading={loading}
            disabled={!name.trim() || !price}
            className="min-h-[48px]"
          >
            {isEdit ? t('Save') : t('Add')}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
        {primaryLocale && primaryLocale !== 'en' && (
          <p className="text-xs text-text-secondary">
            {t('Enter in your primary language')} ({t(PRIMARY_LOCALE_LABELS[primaryLocale] ?? primaryLocale)})
          </p>
        )}
        <Input
          data-tour="item-name-input"
          label={t('Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('e.g. Margherita Pizza')}
          required
          autoFocus
        />
        <Input
          label={t('Description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Optional description')}
          data-tour="item-description-input"
        />
        <Input
          label={t('Price')}
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          data-tour="item-price-input"
          required
        />
        <ImageUpload
          label={t('Image')}
          value={imageUrl || null}
          onChange={(url) => setImageUrl(url ?? '')}
          tenantSlug={tenantSlug}
          aspectRatio="16:9"
        />
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            {t('Tags')}
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((tag) => {
              const isSelected = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={[
                    'min-h-[44px] px-2.5 py-2.5 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-primary text-text-inverse border-primary'
                      : 'bg-bg-muted text-text-secondary border-border hover:border-border-strong',
                  ].join(' ')}
                >
                  {t(tag)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            {t('Allergens')}
          </label>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((allergen) => {
              const isSelected = selectedAllergens.has(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  className={[
                    'min-h-[44px] px-2.5 py-2.5 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    isSelected
                      ? 'bg-warning text-text-inverse border-warning'
                      : 'bg-bg-muted text-text-secondary border-border hover:border-border-strong',
                  ].join(' ')}
                >
                  {t(allergen)}
                </button>
              );
            })}
          </div>
        </div>
        {itemId && (
          <ItemTranslationsSection
            itemId={itemId}
            tenantSlug={tenantSlug}
            sourceName={name}
            sourceDescription={description}
          />
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Category list (left panel)
// ---------------------------------------------------------------------------

const STATION_OPTIONS: { value: CategoryStation; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bar', label: 'Bar' },
];

function StationBadge({ station }: { station: CategoryStation }) {
  const t = useT();
  if (!station || station === 'all') return null;
  return (
    <Badge variant={station === 'kitchen' ? 'warning' : 'info'} className="text-[10px] px-1.5 py-0">
      {station === 'kitchen' ? t('Kitchen') : t('Bar')}
    </Badge>
  );
}

function CategoryList({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onMove,
  onStationChange,
  itemCountByCategory,
}: {
  categories: MenuCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (cat: MenuCategory) => void;
  onDelete: (id: string) => void;
  onMove: (catId: string, direction: 'up' | 'down') => void;
  onStationChange: (catId: string, station: CategoryStation) => void;
  itemCountByCategory: Record<string, number>;
}) {
  const t = useT();
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('Categories')}</CardTitle>
        <Button data-tour="add-category" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {t('Add')}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {categories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={t('No categories')}
            description={t('Create your first menu category to start adding items.')}
            action={{ label: t('Add Category'), onClick: onAdd }}
          />
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((cat, idx) => (
              <li key={cat.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(cat.id)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(cat.id);
                    }
                  }}
                  className={[
                    'w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    selectedId === cat.id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-bg-muted',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text truncate">
                        {cat.name}
                      </p>
                      <StationBadge station={cat.station} />
                    </div>
                    {cat.description && cat.description !== TOUR_MARKER && (
                      <p className="text-xs text-text-secondary truncate">
                        {cat.description}
                      </p>
                    )}
                    <select
                      value={cat.station || 'all'}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onStationChange(cat.id, e.target.value as CategoryStation);
                      }}
                      className="mt-1 h-7 text-[11px] px-1.5 rounded border border-border bg-bg text-text-secondary appearance-none cursor-pointer hover:border-border-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                      aria-label={`${t('Station for')} ${cat.name}`}
                    >
                      {STATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {t(opt.label)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(cat.id, 'up');
                      }}
                      disabled={idx === 0}
                      className="min-h-[44px] min-w-[44px] p-2 sm:p-1 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`${t('Move')} ${cat.name} ${t('up')}`}
                    >
                      <ChevronUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(cat.id, 'down');
                      }}
                      disabled={idx === categories.length - 1}
                      className="min-h-[44px] min-w-[44px] p-2 sm:p-1 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`${t('Move')} ${cat.name} ${t('down')}`}
                    >
                      <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(cat);
                      }}
                      className="min-h-[44px] min-w-[44px] p-2 sm:p-1 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`${t('Edit')} ${cat.name}`}
                    >
                      <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      onConfirm={() => onDelete(cat.id)}
                      confirmText={
                        (itemCountByCategory[cat.id] ?? 0) > 0
                          ? `${t('Delete')} ${cat.name}? (${itemCountByCategory[cat.id]} ${t(itemCountByCategory[cat.id] === 1 ? 'item' : 'items')} ${t('will be hidden')})`
                          : t('Delete?')
                      }
                      className="min-h-[44px] min-w-[44px] !p-1 text-text-tertiary hover:text-danger"
                    >
                      <span className="text-xs">{t('Del')}</span>
                    </ConfirmButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Item modifier link dialog
// ---------------------------------------------------------------------------

function ItemModifiersDialog({
  open,
  onClose,
  tenantSlug,
  item,
}: {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  item: MenuItem;
}) {
  const t = useT();
  const { toast } = useToast();
  const allGroupsQuery = useModifierGroups(tenantSlug);
  const allGroups = allGroupsQuery.data ?? [];
  const linkedQuery = useItemModifierGroups(tenantSlug, item.id);
  const linkedGroups = linkedQuery.data ?? [];
  const setGroups = useSetItemModifierGroups(tenantSlug);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Per-group price overrides: { groupId: { optionId: { priceDelta: number } } }
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, { priceDelta: number }>>
  >({});
  const [initialized, setInitialized] = useState(false);

  // Sync selected state and overrides when linked groups load
  useEffect(() => {
    if (!initialized && linkedQuery.isSuccess) {
      setSelected(new Set(linkedGroups.map((g) => g.id)));

      // Detect existing overrides by comparing linked option prices to all-groups defaults
      const detectedOverrides: Record<string, Record<string, { priceDelta: number }>> = {};
      for (const linked of linkedGroups) {
        const allGroup = allGroups.find((g) => g.id === linked.id);
        if (!allGroup) continue;
        for (const linkedOpt of linked.options) {
          const defaultOpt = allGroup.options.find((o) => o.id === linkedOpt.id);
          if (defaultOpt && linkedOpt.priceDelta !== defaultOpt.priceDelta) {
            if (!detectedOverrides[linked.id]) detectedOverrides[linked.id] = {};
            detectedOverrides[linked.id][linkedOpt.id] = { priceDelta: linkedOpt.priceDelta };
          }
        }
      }
      setOverrides(detectedOverrides);
      setInitialized(true);
    }
  }, [linkedQuery.isSuccess, linkedGroups, initialized, allGroups]);

  // Reset init on open
  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  const toggleGroup = (groupId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
        // Clear overrides for this group
        setOverrides((prev) => {
          const updated = { ...prev };
          delete updated[groupId];
          return updated;
        });
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const setOptionOverride = (groupId: string, optionId: string, value: string) => {
    setOverrides((prev) => {
      const updated = { ...prev };
      if (!value.trim()) {
        // Clear this override
        if (updated[groupId]) {
          const groupOverrides = { ...updated[groupId] };
          delete groupOverrides[optionId];
          if (Object.keys(groupOverrides).length === 0) {
            delete updated[groupId];
          } else {
            updated[groupId] = groupOverrides;
          }
        }
        return updated;
      }
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        if (!updated[groupId]) updated[groupId] = {};
        updated[groupId] = { ...updated[groupId], [optionId]: { priceDelta: parsed } };
      }
      return updated;
    });
  };

  const clearOptionOverride = (groupId: string, optionId: string) => {
    setOverrides((prev) => {
      const updated = { ...prev };
      if (updated[groupId]) {
        const groupOverrides = { ...updated[groupId] };
        delete groupOverrides[optionId];
        if (Object.keys(groupOverrides).length === 0) {
          delete updated[groupId];
        } else {
          updated[groupId] = groupOverrides;
        }
      }
      return updated;
    });
  };

  const handleSave = () => {
    const groups = Array.from(selected).map((groupId) => ({
      groupId,
      ...(overrides[groupId] && Object.keys(overrides[groupId]).length > 0
        ? { priceOverrides: overrides[groupId] }
        : {}),
    }));

    setGroups.mutate(
      { itemId: item.id, groups },
      {
        onSuccess: () => {
          toast('success', t('Item modifiers updated'));
          onClose();
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update item modifiers'));
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${t('Modifiers for')} ${item.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            loading={setGroups.isPending}
          >
            {t('Save')}
          </Button>
        </>
      }
    >
      {allGroups.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {t('No modifier groups created yet. Go to the Modifiers page to create groups first.')}
        </p>
      ) : (
        <div className="space-y-3 max-h-[28rem] overflow-y-auto">
          {allGroups.map((group) => {
            const isSelected = selected.has(group.id);
            return (
              <div
                key={group.id}
                className="rounded-lg border border-border overflow-hidden"
              >
                <label className="flex items-center gap-3 p-3 hover:bg-bg-muted cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleGroup(group.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{group.name}</p>
                    <p className="text-xs text-text-secondary">
                      {group.options.length} option
                      {group.options.length !== 1 ? 's' : ''}
                      {group.minSelections > 0 ? ' \u00b7 Required' : ' \u00b7 Optional'}
                    </p>
                  </div>
                </label>

                {isSelected && group.options.length > 0 && (
                  <div className="border-t border-border bg-bg-surface px-3 py-2 space-y-1.5">
                    <p className="text-xs font-medium text-text-secondary">
                      Price overrides for this item
                    </p>
                    {group.options.map((option) => {
                      const hasOverride = !!overrides[group.id]?.[option.id];
                      const overrideValue = overrides[group.id]?.[option.id]?.priceDelta;
                      return (
                        <div
                          key={option.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="flex-1 text-text truncate">
                            {option.name}
                          </span>
                          <span className="text-text-tertiary whitespace-nowrap">
                            Default: +${option.priceDelta.toFixed(2)}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={option.priceDelta.toFixed(2)}
                            value={hasOverride ? overrideValue : ''}
                            onChange={(e) =>
                              setOptionOverride(group.id, option.id, e.target.value)
                            }
                            className={[
                              'w-20 px-2 py-1 rounded border text-xs text-right',
                              hasOverride
                                ? 'border-primary text-primary bg-primary/5'
                                : 'border-border text-text bg-bg',
                            ].join(' ')}
                          />
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => clearOptionOverride(group.id, option.id)}
                              className="text-primary hover:text-primary-hover text-xs whitespace-nowrap"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Item card
// ---------------------------------------------------------------------------

function MenuItemCard({
  item,
  tenantSlug,
  onEdit,
  onDelete,
  onToggleAvailability,
  onToggleSoldOut,
  onManageModifiers,
  onMove,
  isFirst,
  isLast,
}: {
  item: MenuItem;
  tenantSlug: string;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (item: MenuItem) => void;
  onToggleSoldOut: (item: MenuItem) => void;
  onManageModifiers: (item: MenuItem) => void;
  onMove: (itemId: string, direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useT();
  const isSoldOut = !!item.isSoldOut;
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-16 w-16 rounded-md object-cover shrink-0 bg-bg-muted"
          />
        ) : (
          <div className="h-16 w-16 rounded-md bg-bg-muted flex items-center justify-center shrink-0">
            <UtensilsCrossed className="h-6 w-6 text-text-tertiary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {item.name}
              </p>
              {item.description && item.description !== TOUR_MARKER && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-text shrink-0">
              {formatPrice(item.price)}
            </p>
          </div>

          {item.tags && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {parseTags(item.tags).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-bg-muted text-text-secondary"
                >
                  {t(tag)}
                </span>
              ))}
            </div>
          )}

          {item.modifierGroupIds && item.modifierGroupIds.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-text-secondary mt-1.5">
              <Settings2 className="h-3 w-3" />
              <span>
                {item.modifierGroupIds.length}{' '}
                {t(item.modifierGroupIds.length !== 1 ? 'modifiers' : 'modifier')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              <Toggle
                checked={item.isAvailable === 1}
                onChange={() => onToggleAvailability(item)}
                label={item.isAvailable === 1 ? t('Available') : t('Unavailable')}
              />
              {isSoldOut ? (
                <div className="flex items-center gap-1.5">
                  <Badge variant="error">SOLD OUT</Badge>
                  <button
                    type="button"
                    onClick={() => onToggleSoldOut(item)}
                    className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    {t('Undo')}
                  </button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleSoldOut(item)}
                  className="!min-h-0 !px-2 !py-1 text-xs text-text-tertiary hover:text-danger"
                >
                  {t('Mark Sold Out')}
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => onMove(item.id, 'up')}
                disabled={isFirst}
                className="min-h-[44px] min-w-[44px] p-1.5 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`${t('Move')} ${item.name} ${t('up')}`}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMove(item.id, 'down')}
                disabled={isLast}
                className="min-h-[44px] min-w-[44px] p-1.5 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`${t('Move')} ${item.name} ${t('down')}`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageModifiers(item)}
                aria-label={`${t('Manage modifiers for')} ${item.name}`}
                className="min-h-[44px]"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t('Modifiers')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                aria-label={`${t('Edit')} ${item.name}`}
                className="min-h-[44px]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('Edit')}
              </Button>
              <ConfirmButton
                variant="ghost"
                size="sm"
                onConfirm={() => onDelete(item.id)}
                confirmText={t('Delete?')}
                className="min-h-[44px]"
              >
                {t('Delete')}
              </ConfirmButton>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function MenuManagement() {
  const t = useT();
  const { tenantSlug } = useTenant();
  const { toast } = useToast();

  // Data
  const categoriesQuery = useCategories(tenantSlug);
  const categories = categoriesQuery.data ?? [];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // Auto-select first category if none selected
  const activeCategoryId =
    selectedCategoryId ??
    (categories.length > 0 ? categories[0].id : null);

  const itemsQuery = useMenuItems(
    tenantSlug,
    activeCategoryId ?? undefined,
  );
  const items = itemsQuery.data ?? [];

  // Fetch all items (no category filter) to compute per-category counts
  const allItemsQuery = useMenuItems(tenantSlug);
  const allItems = allItemsQuery.data ?? [];
  const itemCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [allItems]);

  // Mutations
  const createCategory = useCreateCategory(tenantSlug);
  const updateCategory = useUpdateCategory(tenantSlug);
  const deleteCategory = useDeleteCategory(tenantSlug);
  const createItem = useCreateMenuItem(tenantSlug);
  const updateItem = useUpdateMenuItem(tenantSlug);
  const deleteItem = useDeleteMenuItem(tenantSlug);
  const toggleSoldOut = useToggleSoldOut(tenantSlug);

  // Dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null,
  );
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [modifierLinkItem, setModifierLinkItem] = useState<MenuItem | null>(
    null,
  );

  // --- Category handlers ---

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (cat: MenuCategory) => {
    setEditingCategory(cat);
    setCategoryDialogOpen(true);
  };

  const handleCategorySubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, ...data },
        {
          onSuccess: () => {
            setCategoryDialogOpen(false);
            toast('success', t('Category updated'));
          },
          onError: (err: Error) => {
            toast('error', err.message || t('Failed to update category'));
          },
        },
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => {
          setCategoryDialogOpen(false);
          toast('success', t('Category created'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to create category'));
        },
      });
    }
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory.mutate(id, {
      onSuccess: () => {
        if (selectedCategoryId === id) {
          setSelectedCategoryId(null);
        }
        toast('success', t('Category deleted'));
      },
      onError: (err: Error) => {
        toast('error', err.message || t('Failed to delete category'));
      },
    });
  };

  // --- Item handlers ---

  const handleAddItem = () => {
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const handleItemSubmit = (data: ItemFormData) => {
    if (editingItem) {
      updateItem.mutate(
        {
          id: editingItem.id,
          name: data.name,
          description: data.description || null,
          price: parseFloat(data.price),
          imageUrl: data.imageUrl || null,
          tags: data.tags || null,
          allergens: data.allergens || null,
        },
        {
          onSuccess: () => {
            setItemDialogOpen(false);
            toast('success', t('Item updated'));
          },
          onError: (err: Error) => {
            toast('error', err.message || t('Failed to update item'));
          },
        },
      );
    } else if (activeCategoryId) {
      createItem.mutate(
        {
          categoryId: activeCategoryId,
          name: data.name,
          description: data.description || undefined,
          price: parseFloat(data.price),
          imageUrl: data.imageUrl || undefined,
          tags: data.tags || undefined,
          allergens: data.allergens || undefined,
        },
        {
          onSuccess: () => {
            setItemDialogOpen(false);
            toast('success', t('Item created'));
          },
          onError: (err: Error) => {
            toast('error', err.message || t('Failed to create item'));
          },
        },
      );
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => {
        toast('success', t('Item deleted'));
      },
      onError: (err: Error) => {
        toast('error', err.message || t('Failed to delete item'));
      },
    });
  };

  const handleToggleAvailability = (item: MenuItem) => {
    updateItem.mutate(
      { id: item.id, isAvailable: item.isAvailable === 1 ? 0 : 1 },
      {
        onSuccess: () => {
          toast('success', item.isAvailable === 1 ? t('Item marked unavailable') : t('Item marked available'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update availability'));
        },
      },
    );
  };

  const handleToggleSoldOut = (item: MenuItem) => {
    const newSoldOut = !item.isSoldOut;
    toggleSoldOut.mutate(
      { itemId: item.id, isSoldOut: newSoldOut },
      {
        onSuccess: () => {
          toast('success', newSoldOut ? t('Item marked as sold out') : t('Item no longer sold out'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update sold out status'));
        },
      },
    );
  };

  const handleStationChange = (catId: string, station: CategoryStation) => {
    updateCategory.mutate(
      { id: catId, station },
      {
        onSuccess: () => {
          toast('success', `${t('Station updated to')} ${station === 'all' ? t('All') : t(station.charAt(0).toUpperCase() + station.slice(1))}`);
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update station'));
        },
      },
    );
  };

  // --- Reorder handlers ---

  const handleMoveCategory = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === catId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const currentOrder = sorted[idx].sortOrder;
    const adjacentOrder = sorted[swapIdx].sortOrder;
    // If both have the same sortOrder, nudge them apart
    const newCurrent = adjacentOrder;
    const newAdjacent = currentOrder === adjacentOrder ? currentOrder + 1 : currentOrder;

    updateCategory.mutate(
      { id: sorted[idx].id, sortOrder: newCurrent },
      { onError: (err: Error) => toast('error', err.message || t('Failed to reorder')) },
    );
    updateCategory.mutate(
      { id: sorted[swapIdx].id, sortOrder: newAdjacent },
      { onError: (err: Error) => toast('error', err.message || t('Failed to reorder')) },
    );
  };

  const handleMoveItem = (itemId: string, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((i) => i.id === itemId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const currentOrder = sorted[idx].sortOrder;
    const adjacentOrder = sorted[swapIdx].sortOrder;
    const newCurrent = adjacentOrder;
    const newAdjacent = currentOrder === adjacentOrder ? currentOrder + 1 : currentOrder;

    updateItem.mutate(
      { id: sorted[idx].id, sortOrder: newCurrent },
      { onError: (err: Error) => toast('error', err.message || t('Failed to reorder')) },
    );
    updateItem.mutate(
      { id: sorted[swapIdx].id, sortOrder: newAdjacent },
      { onError: (err: Error) => toast('error', err.message || t('Failed to reorder')) },
    );
  };

  // Selected category object for item panel header
  const selectedCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text">{t('Menu Management')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-[60vh]">
        {/* Left panel: categories */}
        <div className="lg:col-span-1">
          <CategoryList
            categories={categories}
            selectedId={activeCategoryId}
            onSelect={setSelectedCategoryId}
            onAdd={handleAddCategory}
            onEdit={handleEditCategory}
            onDelete={handleDeleteCategory}
            onMove={handleMoveCategory}
            onStationChange={handleStationChange}
            itemCountByCategory={itemCountByCategory}
          />
        </div>

        {/* Right panel: items for selected category */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedCategory
                  ? `${selectedCategory.name} ${t('Items')}`
                  : t('Menu Items')}
              </CardTitle>
              {activeCategoryId && (
                <Button data-tour="add-item" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                  {t('Add Item')}
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!activeCategoryId ? (
                <EmptyState
                  icon={FolderOpen}
                  title={t('No category selected')}
                  description={t('Select a category from the left panel to see its items, or create one first.')}
                />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title={t('No items yet')}
                  description={t('Add your first menu item to this category.')}
                  action={{ label: t('Add Item'), onClick: handleAddItem }}
                />
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      tenantSlug={tenantSlug}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onToggleAvailability={handleToggleAvailability}
                      onToggleSoldOut={handleToggleSoldOut}
                      onManageModifiers={setModifierLinkItem}
                      onMove={handleMoveItem}
                      isFirst={idx === 0}
                      isLast={idx === items.length - 1}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Category dialog — key forces remount so useState reinitializes */}
      <CategoryDialog
        key={editingCategory?.id ?? 'new-category'}
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        onSubmit={handleCategorySubmit}
        initial={
          editingCategory
            ? {
                name: editingCategory.name,
                description: editingCategory.description ?? '',
              }
            : undefined
        }
        loading={createCategory.isPending || updateCategory.isPending}
      />

      {/* Item dialog — key forces remount so useState reinitializes */}
      <ItemDialog
        key={editingItem?.id ?? 'new-item'}
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        onSubmit={handleItemSubmit}
        tenantSlug={tenantSlug}
        itemId={editingItem?.id}
        initial={
          editingItem
            ? {
                name: editingItem.name,
                description: editingItem.description ?? '',
                price: editingItem.price.toString(),
                imageUrl: editingItem.imageUrl ?? '',
                tags: editingItem.tags ?? '',
                allergens: editingItem.allergens ?? '',
              }
            : undefined
        }
        loading={createItem.isPending || updateItem.isPending}
      />

      {/* Item modifier link dialog */}
      {modifierLinkItem && (
        <ItemModifiersDialog
          key={modifierLinkItem.id}
          open={!!modifierLinkItem}
          onClose={() => setModifierLinkItem(null)}
          tenantSlug={tenantSlug}
          item={modifierLinkItem}
        />
      )}
    </div>
  );
}

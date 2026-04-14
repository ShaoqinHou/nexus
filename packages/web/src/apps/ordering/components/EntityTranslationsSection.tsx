import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Badge, Button, Input } from '@web/components/ui';
import { useT, SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from '@web/lib/i18n';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  useEntityTranslations,
  useSetManualTranslation,
  useResetTranslation,
  useRegenerateTranslations,
  type EntityType,
  type EntityTranslation,
} from '../hooks/useEntityTranslations';

// ---------------------------------------------------------------------------
// Translatable field descriptor (used by the parent dialog)
// ---------------------------------------------------------------------------

export interface TranslatableField {
  /** Field key — must match a column on the backend entity (e.g. 'name', 'description'). */
  name: string;
  /** Display label, already passed through t(). */
  label: string;
  /** Source-language value (read-only reference shown to the merchant). */
  sourceValue: string;
}

// ---------------------------------------------------------------------------
// Internal: read tenant primary locale from settings
// ---------------------------------------------------------------------------

function useTenantPrimaryLocale(): string | undefined {
  const { tenant } = useTenant();
  if (!tenant?.settings) return undefined;
  const settings = typeof tenant.settings === 'string'
    ? (() => {
        try {
          return JSON.parse(tenant.settings as unknown as string);
        } catch {
          return {};
        }
      })()
    : tenant.settings;
  return (settings as { primaryLocale?: string })?.primaryLocale;
}

function useTenantAdditionalLocales(): string[] {
  const { tenant } = useTenant();
  if (!tenant?.settings) return [];
  const settings = typeof tenant.settings === 'string'
    ? (() => {
        try {
          return JSON.parse(tenant.settings as unknown as string);
        } catch {
          return {};
        }
      })()
    : tenant.settings;
  return ((settings as { supportedLocales?: string[] }).supportedLocales ?? []) as string[];
}

// ---------------------------------------------------------------------------
// Single-cell translation editor: badge + source hint + inline edit/reset
// ---------------------------------------------------------------------------

function TranslationFieldRow({
  entityType,
  entityId,
  locale,
  field,
  label,
  sourceValue,
  translations,
  tenantSlug,
}: {
  entityType: EntityType;
  entityId: string;
  locale: string;
  field: string;
  label: string;
  sourceValue: string;
  translations: EntityTranslation[] | undefined;
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
      { entityType, entityId, locale, field, value: trimmed },
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
      { entityType, entityId, locale, field },
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
            {currentValue || (
              <span className="italic text-text-tertiary">{t('No translation yet')}</span>
            )}
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
// Collapsible per-locale translations panel — drop into any merchant edit dialog
// ---------------------------------------------------------------------------

export function EntityTranslationsSection({
  entityType,
  entityId,
  fields,
  tenantSlug,
}: {
  entityType: EntityType;
  entityId: string;
  fields: TranslatableField[];
  tenantSlug: string;
}) {
  const t = useT();
  const { toast } = useToast();
  const primaryLocale = useTenantPrimaryLocale() ?? 'en';
  const additionalLocales = useTenantAdditionalLocales();

  const localesToShow = additionalLocales.filter(
    (l): l is Locale =>
      l !== primaryLocale && (SUPPORTED_LOCALES as readonly string[]).includes(l),
  );

  const { data: translations } = useEntityTranslations(tenantSlug, entityType, entityId);
  const regenerate = useRegenerateTranslations(tenantSlug);

  const handleRegenerate = () => {
    regenerate.mutate(
      { entityType, entityId },
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
        {/* Inline info banner — explains that translations happen automatically. */}
        <div className="flex gap-2 p-3 rounded-md bg-primary-light/50 text-xs text-text-secondary">
          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            {t('Translations are automatically generated by AI whenever you save this item. You only need to edit here if you want to override the AI output.')}
            {' '}
            <Link
              to="/t/$tenantSlug/ordering/settings"
              params={{ tenantSlug }}
              className="text-primary underline"
            >
              {t('Manage languages')}
            </Link>
          </div>
        </div>
        {localesToShow.map((locale) => (
          <div key={locale} className="border border-border rounded p-2 space-y-3">
            <div className="text-xs font-medium text-text">{LOCALE_LABELS[locale]}</div>
            {fields
              .filter((f) => f.sourceValue.trim().length > 0)
              .map((f) => (
                <TranslationFieldRow
                  key={f.name}
                  entityType={entityType}
                  entityId={entityId}
                  locale={locale}
                  field={f.name}
                  label={f.label}
                  sourceValue={f.sourceValue}
                  translations={translations}
                  tenantSlug={tenantSlug}
                />
              ))}
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

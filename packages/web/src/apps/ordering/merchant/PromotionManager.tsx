import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Tag,
  Percent,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Copy,
  Ticket,
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
  Select,
  Toggle,
} from '@web/components/ui';
import { ConfirmButton, EmptyState } from '@web/components/patterns';
import { formatDate, formatPrice } from '@web/lib/format';
import { useT } from '@web/lib/i18n';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  usePromotions,
  useCreatePromotion,
  useUpdatePromotion,
  useDeletePromotion,
  useCreatePromoCode,
  useDeletePromoCode,
} from '../hooks/usePromotions';
import { useCategories } from '../hooks/useMenu';
import { EntityTranslationsSection } from '../components/EntityTranslationsSection';
import type { Promotion, PromoCode } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDiscount(type: Promotion['type'], value: number, t: (key: string) => string): string {
  if (type === 'percentage') {
    return `${value}% ${t('OFF')}`;
  }
  return `${formatPrice(value)} ${t('OFF')}`;
}

function isExpired(promo: Promotion): boolean {
  if (!promo.endsAt) return false;
  return new Date(promo.endsAt) < new Date();
}

function isActive(promo: Promotion): boolean {
  if (promo.isActive !== 1) return false;
  if (isExpired(promo)) return false;
  const now = new Date();
  if (new Date(promo.startsAt) > now) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Promotion form dialog
// ---------------------------------------------------------------------------

interface PromotionFormData {
  name: string;
  description: string;
  type: 'percentage' | 'fixed_amount';
  discountValue: string;
  minOrderAmount: string;
  applicableCategories: string;
  startsAt: string;
  endsAt: string;
}

function PromotionDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
  tenantSlug,
  promotionId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PromotionFormData) => void;
  initial?: PromotionFormData;
  loading: boolean;
  tenantSlug: string;
  promotionId?: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<'percentage' | 'fixed_amount'>(
    initial?.type ?? 'percentage',
  );
  const [discountValue, setDiscountValue] = useState(initial?.discountValue ?? '');
  const [minOrderAmount, setMinOrderAmount] = useState(initial?.minOrderAmount ?? '');
  const [applicableCategories, setApplicableCategories] = useState(
    initial?.applicableCategories ?? '',
  );
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? '');

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setType(initial?.type ?? 'percentage');
    setDiscountValue(initial?.discountValue ?? '');
    setMinOrderAmount(initial?.minOrderAmount ?? '');
    setApplicableCategories(initial?.applicableCategories ?? '');
    setStartsAt(initial?.startsAt ?? '');
    setEndsAt(initial?.endsAt ?? '');
  }, [initial]);

  const categoriesQuery = useCategories(tenantSlug);
  const allCategories = categoriesQuery.data ?? [];

  const selectedCategoryIds = new Set(
    applicableCategories ? applicableCategories.split(',').map((s) => s.trim()).filter(Boolean) : [],
  );

  const toggleCategory = (categoryId: string) => {
    const next = new Set(selectedCategoryIds);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    setApplicableCategories(Array.from(next).join(','));
  };

  const isEdit = !!initial;
  const t = useT();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !discountValue || !startsAt) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      type,
      discountValue,
      minOrderAmount,
      applicableCategories: applicableCategories.trim(),
      startsAt,
      endsAt,
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setType('percentage');
    setDiscountValue('');
    setMinOrderAmount('');
    setApplicableCategories('');
    setStartsAt('');
    setEndsAt('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? t('Edit Promotion') : t('Add Promotion')}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            form="promotion-form"
            loading={loading}
            disabled={!name.trim() || !discountValue || !startsAt}
          >
            {isEdit ? t('Save') : t('Create')}
          </Button>
        </>
      }
    >
      <form id="promotion-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('Name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('e.g. Summer Sale 20%')}
          required
          autoFocus
        />
        <Input
          label={t('Description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Optional description')}
        />
        <Select
          label={t('Discount Type')}
          options={[
            { value: 'percentage', label: t('Percentage (%)') },
            { value: 'fixed_amount', label: t('Fixed Amount ($)') },
          ]}
          value={type}
          onChange={(val) => setType(val as 'percentage' | 'fixed_amount')}
        />
        <Input
          label={type === 'percentage' ? t('Discount (%)') : t('Discount ($)')}
          type="number"
          step={type === 'percentage' ? '1' : '0.01'}
          min="0"
          max={type === 'percentage' ? '100' : undefined}
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder={type === 'percentage' ? t('e.g. 20') : t('e.g. 5.00')}
          required
        />
        <Input
          label={t('Minimum Order Amount ($)')}
          type="number"
          step="0.01"
          min="0"
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(e.target.value)}
          placeholder={t('Optional')}
          helperText={t('Leave empty for no minimum')}
        />
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            {t('Applicable Categories')}
          </label>
          {allCategories.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border border-border p-2">
              {allCategories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 cursor-pointer text-sm text-text hover:bg-bg-muted rounded px-1 py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryIds.has(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">{t('No categories found.')}</p>
          )}
          <p className="text-xs text-text-tertiary mt-1">
            {t('Leave empty to apply to all items')}
          </p>
        </div>
        <Input
          label={t('Start Date')}
          type="date"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
        <Input
          label={t('End Date')}
          type="date"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          helperText={t('Leave empty for no end date')}
        />
        {promotionId && (
          <EntityTranslationsSection
            entityType="promotion"
            entityId={promotionId}
            tenantSlug={tenantSlug}
            fields={[
              { name: 'name', label: t('Name'), sourceValue: name },
              { name: 'description', label: t('Description'), sourceValue: description },
            ]}
          />
        )}
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Promo code dialog
// ---------------------------------------------------------------------------

function PromoCodeDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; usageLimit: string }) => void;
  loading: boolean;
}) {
  const [code, setCode] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const t = useT();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim()) return;
    onSubmit({ code: code.trim().toUpperCase(), usageLimit });
  };

  const handleClose = () => {
    setCode('');
    setUsageLimit('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('Add Promo Code')}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            form="promo-code-form"
            loading={loading}
            disabled={!code.trim()}
          >
            {t('Add Code')}
          </Button>
        </>
      }
    >
      <form id="promo-code-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('Promo Code')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('e.g. SUMMER20')}
          required
          autoFocus
          helperText={t('Will be stored in uppercase')}
        />
        <Input
          label={t('Usage Limit')}
          type="number"
          min="1"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder={t('Optional')}
          helperText={t('Leave empty for unlimited uses')}
        />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Promo code list within a promotion card
// ---------------------------------------------------------------------------

function PromoCodeList({
  codes,
  onDelete,
  deletingId,
}: {
  codes: PromoCode[];
  onDelete: (codeId: string) => void;
  deletingId: string | null;
}) {
  const t = useT();

  if (codes.length === 0) {
    return (
      <p className="text-xs text-text-tertiary py-2">
        {t('No promo codes yet. Add one to let customers use this promotion.')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {codes.map((pc) => (
        <div
          key={pc.id}
          className="flex items-center justify-between p-2 rounded border border-border bg-bg"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Copy className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
            <span className="text-sm font-mono font-medium text-text">
              {pc.code}
            </span>
            <span className="text-xs text-text-tertiary">
              {pc.usageCount}/{pc.usageLimit ?? '\u221E'} {t('uses')}
            </span>
          </div>
          <ConfirmButton
            variant="ghost"
            size="sm"
            onConfirm={() => onDelete(pc.id)}
            confirmText={t('Delete?')}
            disabled={deletingId === pc.id}
          >
            <span className="text-xs">{t('Del')}</span>
          </ConfirmButton>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single promotion card
// ---------------------------------------------------------------------------

function PromotionCard({
  promo,
  onEdit,
  onDelete,
  onToggleActive,
  onAddCode,
  onDeleteCode,
  deletingCodeId,
}: {
  promo: Promotion;
  onEdit: (promo: Promotion) => void;
  onDelete: (id: string) => void;
  onToggleActive: (promo: Promotion) => void;
  onAddCode: (promoId: string) => void;
  onDeleteCode: (codeId: string) => void;
  deletingCodeId: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const active = isActive(promo);
  const expired = isExpired(promo);
  const codes = promo.promoCodes ?? [];
  const t = useT();

  return (
    <Card>
      <CardContent>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-text">{promo.name}</h3>
              <Badge variant={promo.type === 'percentage' ? 'info' : 'success'}>
                {promo.type === 'percentage' ? (
                  <Percent className="h-3 w-3 mr-0.5 inline" />
                ) : (
                  <DollarSign className="h-3 w-3 mr-0.5 inline" />
                )}
                {promo.type === 'percentage' ? t('Percentage') : t('Fixed')}
              </Badge>
              {active ? (
                <Badge variant="success">{t('Active')}</Badge>
              ) : expired ? (
                <Badge variant="error">{t('Expired')}</Badge>
              ) : (
                <Badge variant="default">{t('Inactive')}</Badge>
              )}
            </div>
            {promo.description && (
              <p className="text-xs text-text-secondary mt-1">
                {promo.description}
              </p>
            )}
          </div>
          <span className="text-base font-bold text-primary shrink-0">
            {formatDiscount(promo.type, promo.discountValue, t)}
          </span>
        </div>

        {/* Details row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-text-secondary">
          <span>
            {formatDate(promo.startsAt)}
            {promo.endsAt ? ` - ${formatDate(promo.endsAt)}` : ` - ${t('No end')}`}
          </span>
          {promo.minOrderAmount != null && promo.minOrderAmount > 0 && (
            <span>{t('Min:')} {formatPrice(promo.minOrderAmount)}</span>
          )}
          <span>
            {promo.currentUses}
            {promo.maxUses != null ? `/${promo.maxUses}` : ''} {t('uses')}
          </span>
          <span>{codes.length} {codes.length !== 1 ? t('codes') : t('code')}</span>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between mt-3">
          <Toggle
            checked={promo.isActive === 1}
            onChange={() => onToggleActive(promo)}
            label={promo.isActive === 1 ? t('Active') : t('Inactive')}
          />

          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="min-h-[var(--hit-sm)]"
            >
              <Ticket className="h-3.5 w-3.5" />
              {t('Codes')}
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(promo)}
              aria-label={`Edit ${promo.name}`}
              className="min-h-[var(--hit-sm)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              {t('Edit')}
            </Button>
            <ConfirmButton
              variant="ghost"
              size="sm"
              onConfirm={() => onDelete(promo.id)}
              confirmText={t('Delete?')}
              className="min-h-[var(--hit-sm)]"
            >
              {t('Delete')}
            </ConfirmButton>
          </div>
        </div>

        {/* Expandable codes section */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                {t('Promo Codes')}
              </h4>
              <Button size="sm" onClick={() => onAddCode(promo.id)}>
                <Plus className="h-3.5 w-3.5" />
                {t('Add Code')}
              </Button>
            </div>
            <PromoCodeList
              codes={codes}
              onDelete={onDeleteCode}
              deletingId={deletingCodeId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PromotionManager() {
  const { tenantSlug } = useTenant();
  const { toast } = useToast();
  const t = useT();

  // Data
  const promotionsQuery = usePromotions(tenantSlug);
  const promotions = promotionsQuery.data ?? [];

  // Mutations
  const createPromotion = useCreatePromotion(tenantSlug);
  const updatePromotion = useUpdatePromotion(tenantSlug);
  const deletePromotion = useDeletePromotion(tenantSlug);
  const createPromoCode = useCreatePromoCode(tenantSlug);
  const deletePromoCode = useDeletePromoCode(tenantSlug);

  // Dialog state
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeDialogPromoId, setCodeDialogPromoId] = useState<string | null>(null);
  const [deletingCodeId, setDeletingCodeId] = useState<string | null>(null);

  // --- Promotion handlers ---

  const handleAddPromotion = () => {
    setEditingPromo(null);
    setPromoDialogOpen(true);
  };

  const handleEditPromotion = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoDialogOpen(true);
  };

  const handlePromotionSubmit = (data: PromotionFormData) => {
    const payload = {
      name: data.name,
      description: data.description || undefined,
      type: data.type,
      discountValue: parseFloat(data.discountValue),
      minOrderAmount: data.minOrderAmount
        ? parseFloat(data.minOrderAmount)
        : undefined,
      applicableCategories: data.applicableCategories || undefined,
      startsAt: data.startsAt,
      endsAt: data.endsAt || undefined,
    };

    if (editingPromo) {
      updatePromotion.mutate(
        { id: editingPromo.id, ...payload },
        {
          onSuccess: () => {
            setPromoDialogOpen(false);
            toast('success', t('Promotion updated'));
          },
          onError: (err: Error) => {
            toast('error', err.message || t('Failed to update promotion'));
          },
        },
      );
    } else {
      createPromotion.mutate(payload, {
        onSuccess: () => {
          setPromoDialogOpen(false);
          toast('success', t('Promotion created'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to create promotion'));
        },
      });
    }
  };

  const handleDeletePromotion = (id: string) => {
    deletePromotion.mutate(id, {
      onSuccess: () => {
        toast('success', t('Promotion deleted'));
      },
      onError: (err: Error) => {
        toast('error', err.message || t('Failed to delete promotion'));
      },
    });
  };

  const handleToggleActive = (promo: Promotion) => {
    updatePromotion.mutate(
      { id: promo.id, isActive: promo.isActive === 1 ? 0 : 1 },
      {
        onSuccess: () => {
          toast(
            'success',
            promo.isActive === 1
              ? t('Promotion deactivated')
              : t('Promotion activated'),
          );
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to update promotion'));
        },
      },
    );
  };

  // --- Promo code handlers ---

  const handleAddCode = (promoId: string) => {
    setCodeDialogPromoId(promoId);
    setCodeDialogOpen(true);
  };

  const handleCodeSubmit = (data: { code: string; usageLimit: string }) => {
    if (!codeDialogPromoId) return;

    createPromoCode.mutate(
      {
        promotionId: codeDialogPromoId,
        code: data.code,
        usageLimit: data.usageLimit ? parseInt(data.usageLimit, 10) : undefined,
      },
      {
        onSuccess: () => {
          setCodeDialogOpen(false);
          setCodeDialogPromoId(null);
          toast('success', t('Promo code created'));
        },
        onError: (err: Error) => {
          toast('error', err.message || t('Failed to create promo code'));
        },
      },
    );
  };

  const handleDeleteCode = (codeId: string) => {
    setDeletingCodeId(codeId);
    deletePromoCode.mutate(codeId, {
      onSuccess: () => {
        setDeletingCodeId(null);
        toast('success', t('Promo code deleted'));
      },
      onError: (err: Error) => {
        setDeletingCodeId(null);
        toast('error', err.message || t('Failed to delete promo code'));
      },
    });
  };

  // Build initial form data for editing
  const editInitial: PromotionFormData | undefined = editingPromo
    ? {
        name: editingPromo.name,
        description: editingPromo.description ?? '',
        type: editingPromo.type,
        discountValue: editingPromo.discountValue.toString(),
        minOrderAmount: editingPromo.minOrderAmount?.toString() ?? '',
        applicableCategories: editingPromo.applicableCategories ?? '',
        startsAt: editingPromo.startsAt.split('T')[0],
        endsAt: editingPromo.endsAt ? editingPromo.endsAt.split('T')[0] : '',
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{t('Promotions')}</h1>
        <Button onClick={handleAddPromotion} className="min-h-[var(--hit-md)]">
          <Plus className="h-4 w-4" />
          {t('Add Promotion')}
        </Button>
      </div>

      {/* Promotion list */}
      {promotionsQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-secondary">{t('Loading promotions...')}</p>
        </div>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={t('No promotions')}
          description={t('Create your first promotion to offer discounts to customers.')}
          action={{ label: t('Add Promotion'), onClick: handleAddPromotion }}
        />
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <PromotionCard
              key={promo.id}
              promo={promo}
              onEdit={handleEditPromotion}
              onDelete={handleDeletePromotion}
              onToggleActive={handleToggleActive}
              onAddCode={handleAddCode}
              onDeleteCode={handleDeleteCode}
              deletingCodeId={deletingCodeId}
            />
          ))}
        </div>
      )}

      {/* Promotion dialog */}
      <PromotionDialog
        key={editingPromo?.id ?? 'new-promotion'}
        open={promoDialogOpen}
        onClose={() => setPromoDialogOpen(false)}
        onSubmit={handlePromotionSubmit}
        initial={editInitial}
        loading={createPromotion.isPending || updatePromotion.isPending}
        tenantSlug={tenantSlug}
        promotionId={editingPromo?.id}
      />

      {/* Promo code dialog */}
      <PromoCodeDialog
        key={codeDialogPromoId ?? 'new-code'}
        open={codeDialogOpen}
        onClose={() => {
          setCodeDialogOpen(false);
          setCodeDialogPromoId(null);
        }}
        onSubmit={handleCodeSubmit}
        loading={createPromoCode.isPending}
      />
    </div>
  );
}

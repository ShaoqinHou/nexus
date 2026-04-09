import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Package, GripVertical } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
  Badge,
  Toggle,
} from '@web/components/ui';
import { ConfirmButton, EmptyState } from '@web/components/patterns';
import { formatPrice } from '@web/lib/format';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import { useMenuItems } from '../hooks/useMenu';
import {
  useCombos,
  useCreateComboDeal,
  useUpdateComboDeal,
  useDeleteComboDeal,
} from '../hooks/useCombos';
import type { ComboDeal, MenuItem } from '../types';

// ---------------------------------------------------------------------------
// Types for the combo form state
// ---------------------------------------------------------------------------

interface SlotOptionDraft {
  menuItemId: string;
  menuItemName: string;
  priceModifier: string;
  isDefault: boolean;
}

interface SlotDraft {
  name: string;
  minSelections: string;
  maxSelections: string;
  options: SlotOptionDraft[];
}

interface ComboFormData {
  name: string;
  description: string;
  basePrice: string;
  imageUrl: string;
  slots: SlotDraft[];
}

function emptySlot(): SlotDraft {
  return {
    name: '',
    minSelections: '1',
    maxSelections: '1',
    options: [],
  };
}

function emptyForm(): ComboFormData {
  return {
    name: '',
    description: '',
    basePrice: '',
    imageUrl: '',
    slots: [emptySlot()],
  };
}

// ---------------------------------------------------------------------------
// Item picker (inline multi-select for a slot)
// ---------------------------------------------------------------------------

function ItemPicker({
  allItems,
  selectedItemIds,
  onAdd: onAddItem,
}: {
  allItems: MenuItem[];
  selectedItemIds: Set<string>;
  onAdd: (item: MenuItem) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = allItems.filter(
    (item) =>
      !selectedItemIds.has(item.id) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search menu items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto space-y-1 border border-border rounded-md p-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-text-tertiary p-2 text-center">
            {search ? 'No matching items' : 'No items available'}
          </p>
        ) : (
          filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onAddItem(item);
                setSearch('');
              }}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded text-left text-sm hover:bg-bg-muted transition-colors"
            >
              <span className="text-text truncate">{item.name}</span>
              <span className="text-text-secondary text-xs shrink-0 ml-2">
                {formatPrice(item.price)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slot editor
// ---------------------------------------------------------------------------

function SlotEditor({
  slot,
  index,
  allItems,
  onChange,
  onRemove,
  canRemove,
}: {
  slot: SlotDraft;
  index: number;
  allItems: MenuItem[];
  onChange: (index: number, slot: SlotDraft) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}) {
  const selectedItemIds = new Set(slot.options.map((o) => o.menuItemId));

  const handleAddOption = useCallback(
    (item: MenuItem) => {
      const newOption: SlotOptionDraft = {
        menuItemId: item.id,
        menuItemName: item.name,
        priceModifier: '0',
        isDefault: slot.options.length === 0,
      };
      onChange(index, { ...slot, options: [...slot.options, newOption] });
    },
    [slot, index, onChange],
  );

  const handleRemoveOption = useCallback(
    (optIndex: number) => {
      const next = slot.options.filter((_, i) => i !== optIndex);
      onChange(index, { ...slot, options: next });
    },
    [slot, index, onChange],
  );

  const handleOptionChange = useCallback(
    (optIndex: number, field: keyof SlotOptionDraft, value: string | boolean) => {
      const next = slot.options.map((opt, i) => {
        if (i !== optIndex) {
          // If setting a new default and maxSelections is 1, unset others
          if (field === 'isDefault' && value === true && slot.maxSelections === '1') {
            return { ...opt, isDefault: false };
          }
          return opt;
        }
        return { ...opt, [field]: value };
      });
      onChange(index, { ...slot, options: next });
    },
    [slot, index, onChange],
  );

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-bg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-text-tertiary" />
          <h4 className="text-sm font-semibold text-text">Slot {index + 1}</h4>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 rounded text-text-tertiary hover:text-danger transition-colors"
            aria-label="Remove slot"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Input
        label="Slot Name"
        placeholder="e.g. Choose your Main"
        value={slot.name}
        onChange={(e) => onChange(index, { ...slot, name: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Min Selections"
          type="number"
          min="0"
          value={slot.minSelections}
          onChange={(e) =>
            onChange(index, { ...slot, minSelections: e.target.value })
          }
        />
        <Input
          label="Max Selections"
          type="number"
          min="1"
          value={slot.maxSelections}
          onChange={(e) =>
            onChange(index, { ...slot, maxSelections: e.target.value })
          }
        />
      </div>

      {/* Current options */}
      {slot.options.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary">
            Options
          </label>
          {slot.options.map((opt, optIdx) => (
            <div
              key={opt.menuItemId}
              className="flex items-center gap-2 p-2 rounded border border-border bg-bg-surface"
            >
              <span className="text-sm text-text flex-1 truncate">
                {opt.menuItemName}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1 text-xs text-text-secondary">
                  <span>+$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={opt.priceModifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleOptionChange(optIdx, 'priceModifier', e.target.value)
                    }
                    className="w-16 text-xs px-1.5 py-1 rounded border border-border bg-bg text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opt.isDefault}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleOptionChange(optIdx, 'isDefault', e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Default</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(optIdx)}
                  className="p-0.5 rounded text-text-tertiary hover:text-danger transition-colors"
                  aria-label={`Remove ${opt.menuItemName}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add items to slot */}
      <div>
        <label className="text-xs font-medium text-text-secondary block mb-1.5">
          Add Menu Items
        </label>
        <ItemPicker
          allItems={allItems}
          selectedItemIds={selectedItemIds}
          onAdd={handleAddOption}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combo dialog (create/edit)
// ---------------------------------------------------------------------------

function ComboDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
  allItems,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ComboFormData) => void;
  initial?: ComboFormData;
  loading: boolean;
  allItems: MenuItem[];
}) {
  const [form, setForm] = useState<ComboFormData>(initial ?? emptyForm());

  useEffect(() => {
    setForm(initial ?? emptyForm());
  }, [initial]);

  const isEdit = !!initial;

  const handleSlotChange = useCallback(
    (index: number, slot: SlotDraft) => {
      setForm((prev) => ({
        ...prev,
        slots: prev.slots.map((s, i) => (i === index ? slot : s)),
      }));
    },
    [],
  );

  const handleAddSlot = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      slots: [...prev.slots, emptySlot()],
    }));
  }, []);

  const handleRemoveSlot = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.basePrice) return;
    onSubmit(form);
  };

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const hasValidSlots = form.slots.every(
    (s) => s.name.trim() && s.options.length > 0,
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Combo Deal' : 'Create Combo Deal'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="combo-form"
            loading={loading}
            disabled={!form.name.trim() || !form.basePrice || !hasValidSlots}
          >
            {isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        id="combo-form"
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
      >
        {/* Basic info */}
        <Input
          label="Combo Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Classic Meal Deal"
          required
          autoFocus
        />
        <Input
          label="Description"
          value={form.description}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Optional description"
        />
        <Input
          label="Base Price"
          type="number"
          step="0.01"
          min="0"
          value={form.basePrice}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, basePrice: e.target.value }))
          }
          placeholder="0.00"
          required
        />
        <Input
          label="Image URL"
          value={form.imageUrl}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
          }
          placeholder="https://..."
        />

        {/* Slots section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Slots</h3>
            <Button variant="secondary" size="sm" onClick={handleAddSlot}>
              <Plus className="h-3.5 w-3.5" />
              Add Slot
            </Button>
          </div>

          {form.slots.map((slot, idx) => (
            <SlotEditor
              key={idx}
              slot={slot}
              index={idx}
              allItems={allItems}
              onChange={handleSlotChange}
              onRemove={handleRemoveSlot}
              canRemove={form.slots.length > 1}
            />
          ))}
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Combo card (list item)
// ---------------------------------------------------------------------------

function ComboCard({
  combo,
  tenantSlug,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  combo: ComboDeal;
  tenantSlug: string;
  onEdit: (combo: ComboDeal) => void;
  onDelete: (id: string) => void;
  onToggleActive: (combo: ComboDeal) => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        {combo.imageUrl ? (
          <img
            src={combo.imageUrl}
            alt={combo.name}
            className="h-16 w-16 rounded-md object-cover shrink-0 bg-bg-muted"
          />
        ) : (
          <div className="h-16 w-16 rounded-md bg-bg-muted flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-text-tertiary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {combo.name}
              </p>
              {combo.description && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                  {combo.description}
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-text shrink-0">
              {formatPrice(combo.basePrice)}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="info">
              {combo.slots.length} slot{combo.slots.length !== 1 ? 's' : ''}
            </Badge>
            {combo.slots.map((slot) => (
              <Badge key={slot.id} variant="default">
                {slot.name}: {slot.options.length} option
                {slot.options.length !== 1 ? 's' : ''}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Toggle
              checked={combo.isActive === 1}
              onChange={() => onToggleActive(combo)}
              label={combo.isActive === 1 ? 'Active' : 'Inactive'}
            />

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(combo)}
              >
                Edit
              </Button>
              <ConfirmButton
                variant="ghost"
                size="sm"
                onConfirm={() => onDelete(combo.id)}
                confirmText="Delete?"
              >
                Delete
              </ConfirmButton>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main ComboManager page
// ---------------------------------------------------------------------------

export function ComboManager() {
  const { tenantSlug } = useTenant();
  const { toast } = useToast();

  // Data
  const combosQuery = useCombos(tenantSlug);
  const combos = combosQuery.data ?? [];
  const itemsQuery = useMenuItems(tenantSlug);
  const allItems = itemsQuery.data ?? [];

  // Mutations
  const createCombo = useCreateComboDeal(tenantSlug);
  const updateCombo = useUpdateComboDeal(tenantSlug);
  const deleteCombo = useDeleteComboDeal(tenantSlug);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboDeal | null>(null);

  const handleAdd = () => {
    setEditingCombo(null);
    setDialogOpen(true);
  };

  const handleEdit = (combo: ComboDeal) => {
    setEditingCombo(combo);
    setDialogOpen(true);
  };

  const handleSubmit = (data: ComboFormData) => {
    if (editingCombo) {
      updateCombo.mutate(
        {
          id: editingCombo.id,
          name: data.name,
          description: data.description || null,
          basePrice: parseFloat(data.basePrice),
          imageUrl: data.imageUrl || null,
          slots: data.slots.map((slot) => ({
            name: slot.name,
            minSelections: parseInt(slot.minSelections, 10) || 1,
            maxSelections: parseInt(slot.maxSelections, 10) || 1,
            options: slot.options.map((opt) => ({
              menuItemId: opt.menuItemId,
              priceModifier: parseFloat(opt.priceModifier) || 0,
              isDefault: opt.isDefault ? 1 : 0,
            })),
          })),
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast('success', 'Combo deal updated');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to update combo deal');
          },
        },
      );
    } else {
      createCombo.mutate(
        {
          name: data.name,
          description: data.description || undefined,
          basePrice: parseFloat(data.basePrice),
          imageUrl: data.imageUrl || undefined,
          slots: data.slots.map((slot) => ({
            name: slot.name,
            minSelections: parseInt(slot.minSelections, 10) || 1,
            maxSelections: parseInt(slot.maxSelections, 10) || 1,
            options: slot.options.map((opt) => ({
              menuItemId: opt.menuItemId,
              priceModifier: parseFloat(opt.priceModifier) || 0,
              isDefault: opt.isDefault ? 1 : 0,
            })),
          })),
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            toast('success', 'Combo deal created');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to create combo deal');
          },
        },
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteCombo.mutate(id, {
      onSuccess: () => {
        toast('success', 'Combo deal deleted');
      },
      onError: (err: Error) => {
        toast('error', err.message || 'Failed to delete combo deal');
      },
    });
  };

  const handleToggleActive = (combo: ComboDeal) => {
    updateCombo.mutate(
      { id: combo.id, isActive: combo.isActive === 1 ? 0 : 1 },
      {
        onSuccess: () => {
          toast(
            'success',
            combo.isActive === 1 ? 'Combo deal deactivated' : 'Combo deal activated',
          );
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update combo deal');
        },
      },
    );
  };

  // Build initial form data when editing
  const editFormData: ComboFormData | undefined = editingCombo
    ? {
        name: editingCombo.name,
        description: editingCombo.description ?? '',
        basePrice: editingCombo.basePrice.toString(),
        imageUrl: editingCombo.imageUrl ?? '',
        slots: editingCombo.slots.map((slot) => ({
          name: slot.name,
          minSelections: slot.minSelections.toString(),
          maxSelections: slot.maxSelections.toString(),
          options: slot.options.map((opt) => ({
            menuItemId: opt.menuItemId,
            menuItemName: opt.menuItemName ?? 'Unknown Item',
            priceModifier: opt.priceModifier.toString(),
            isDefault: opt.isDefault === 1,
          })),
        })),
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Combo Deals</h1>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Create Combo
        </Button>
      </div>

      {combos.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Package}
              title="No combo deals"
              description="Create your first combo deal to offer meal bundles to customers."
              action={{ label: 'Create Combo', onClick: handleAdd }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              tenantSlug={tenantSlug}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <ComboDialog
        key={editingCombo?.id ?? 'new-combo'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        initial={editFormData}
        loading={createCombo.isPending || updateCombo.isPending}
        allItems={allItems}
      />
    </div>
  );
}

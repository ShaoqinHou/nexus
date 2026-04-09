import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus } from 'lucide-react';
import { Badge, Button } from '@web/components/ui';
import { formatPrice, formatPriceDelta } from '@web/lib/format';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import type { CartItemModifier } from '@web/apps/ordering/customer/CartProvider';
import type { ComboDeal, ComboSlot, ModifierGroup, ModifierOption } from '@web/apps/ordering/types';

interface ComboSheetProps {
  combo: ComboDeal;
  onClose: () => void;
}

export function ComboSheet({ combo, onClose }: ComboSheetProps) {
  const { addItem } = useCart();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Initialize selections with defaults for each slot
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const slot of combo.slots) {
      const defaultOption = slot.options.find((o) => o.isDefault === 1);
      if (defaultOption) {
        initial[slot.id] = defaultOption.menuItemId;
      }
    }
    return initial;
  });

  // Track modifier selections per slot: { [slotId]: { [groupId]: Set<optionId> } }
  const [modifierSelections, setModifierSelections] = useState<
    Record<string, Record<string, Set<string>>>
  >(() => {
    // Initialize defaults for all slot options that have modifier groups
    const initial: Record<string, Record<string, Set<string>>> = {};
    for (const slot of combo.slots) {
      const defaultOption = slot.options.find((o) => o.isDefault === 1);
      if (defaultOption?.modifierGroups) {
        const groups: Record<string, Set<string>> = {};
        for (const group of defaultOption.modifierGroups) {
          const defaults = group.options
            .filter((o) => o.isDefault === 1)
            .map((o) => o.id);
          groups[group.id] = new Set(defaults);
        }
        initial[slot.id] = groups;
      }
    }
    return initial;
  });

  const [quantity, setQuantity] = useState(1);

  // Prevent body scroll, save/restore scroll position
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelectOption = useCallback(
    (slotId: string, menuItemId: string) => {
      setSelections((prev) => ({ ...prev, [slotId]: menuItemId }));

      // Initialize modifier defaults for the newly selected option
      const slot = combo.slots.find((s) => s.id === slotId);
      const option = slot?.options.find((o) => o.menuItemId === menuItemId);
      if (option?.modifierGroups && option.modifierGroups.length > 0) {
        const groups: Record<string, Set<string>> = {};
        for (const group of option.modifierGroups) {
          const defaults = group.options
            .filter((o) => o.isDefault === 1)
            .map((o) => o.id);
          groups[group.id] = new Set(defaults);
        }
        setModifierSelections((prev) => ({ ...prev, [slotId]: groups }));
      } else {
        // Clear any previous modifier selections for this slot
        setModifierSelections((prev) => {
          const next = { ...prev };
          delete next[slotId];
          return next;
        });
      }
    },
    [combo.slots],
  );

  const handleToggleModifier = useCallback(
    (slotId: string, group: ModifierGroup, optionId: string) => {
      setModifierSelections((prev) => {
        const slotGroups = prev[slotId] ?? {};
        const current = new Set(slotGroups[group.id] ?? []);
        if (group.maxSelections === 1) {
          // Radio behavior: replace selection
          return {
            ...prev,
            [slotId]: { ...slotGroups, [group.id]: new Set([optionId]) },
          };
        }
        // Checkbox behavior
        if (current.has(optionId)) {
          current.delete(optionId);
        } else if (current.size < group.maxSelections) {
          current.add(optionId);
        }
        return {
          ...prev,
          [slotId]: { ...slotGroups, [group.id]: current },
        };
      });
    },
    [],
  );

  // Calculate running total (slot price modifiers + item modifier deltas)
  const modifierTotal = useMemo(() => {
    let total = 0;
    for (const slot of combo.slots) {
      const selectedItemId = selections[slot.id];
      if (selectedItemId) {
        const option = slot.options.find((o) => o.menuItemId === selectedItemId);
        if (option) {
          total += option.priceModifier;

          // Add modifier deltas for this slot's selection
          const slotModGroups = modifierSelections[slot.id];
          if (slotModGroups && option.modifierGroups) {
            for (const group of option.modifierGroups) {
              const selected = slotModGroups[group.id];
              if (selected) {
                for (const opt of group.options) {
                  if (selected.has(opt.id)) {
                    total += opt.priceDelta;
                  }
                }
              }
            }
          }
        }
      }
    }
    return total;
  }, [combo.slots, selections, modifierSelections]);

  const unitPrice = combo.basePrice + modifierTotal;
  const lineTotal = unitPrice * quantity;

  // Validation: every slot with minSelections > 0 must have a selection,
  // and all required modifier groups must be satisfied
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    for (const slot of combo.slots) {
      if (slot.minSelections > 0 && !selections[slot.id]) {
        errors.push(`${slot.name}: please make a selection`);
        continue;
      }
      // Validate modifier groups for selected option
      const selectedItemId = selections[slot.id];
      if (selectedItemId) {
        const option = slot.options.find((o) => o.menuItemId === selectedItemId);
        if (option?.modifierGroups) {
          const slotModGroups = modifierSelections[slot.id] ?? {};
          for (const group of option.modifierGroups) {
            const count = (slotModGroups[group.id] ?? new Set()).size;
            if (count < group.minSelections) {
              errors.push(
                `${slot.name} - ${group.name}: select at least ${group.minSelections}`,
              );
            }
          }
        }
      }
    }
    return errors;
  }, [combo.slots, selections, modifierSelections]);

  const isValid = validationErrors.length === 0;

  // Build combo selections for cart (including modifier data)
  const comboSelections = useMemo(() => {
    const result: Array<{
      slotId: string;
      slotName: string;
      menuItemId: string;
      itemName: string;
      priceModifier: number;
      modifiers?: CartItemModifier[];
    }> = [];

    for (const slot of combo.slots) {
      const selectedItemId = selections[slot.id];
      if (selectedItemId) {
        const option = slot.options.find((o) => o.menuItemId === selectedItemId);
        if (option) {
          // Collect selected modifiers for this slot
          let mods: CartItemModifier[] | undefined;
          const slotModGroups = modifierSelections[slot.id];
          if (slotModGroups && option.modifierGroups) {
            const collected: CartItemModifier[] = [];
            for (const group of option.modifierGroups) {
              const selected = slotModGroups[group.id];
              if (selected) {
                for (const opt of group.options) {
                  if (selected.has(opt.id)) {
                    collected.push({
                      optionId: opt.id,
                      name: opt.name,
                      price: opt.priceDelta,
                    });
                  }
                }
              }
            }
            if (collected.length > 0) {
              mods = collected;
            }
          }

          result.push({
            slotId: slot.id,
            slotName: slot.name,
            menuItemId: option.menuItemId,
            itemName: option.menuItemName ?? 'Unknown',
            priceModifier: option.priceModifier,
            modifiers: mods,
          });
        }
      }
    }
    return result;
  }, [combo.slots, selections, modifierSelections]);

  const handleAddToCart = useCallback(() => {
    if (!isValid) return;

    addItem({
      menuItemId: combo.id,
      name: combo.name,
      price: unitPrice,
      quantity,
      comboDealId: combo.id,
      comboSelections,
    });
    onClose();
  }, [
    isValid,
    addItem,
    combo.id,
    combo.name,
    unitPrice,
    quantity,
    comboSelections,
    onClose,
  ]);

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-lg max-h-[90vh] bg-bg-elevated rounded-t-2xl sm:rounded-2xl shadow-lg border border-border flex flex-col overflow-hidden">
        {/* Hero image */}
        {combo.imageUrl && (
          <div className="relative shrink-0">
            <img
              src={combo.imageUrl}
              alt={combo.name}
              className="w-full h-[200px] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).hidden = true;
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-text">{combo.name}</h2>
            {combo.description && (
              <p className="text-sm text-text-secondary mt-0.5">
                {combo.description}
              </p>
            )}
            <p className="text-base font-semibold text-primary mt-1">
              from {formatPrice(combo.basePrice)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable slot selections */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-5 min-h-0">
          {combo.slots.map((slot) => (
            <SlotSelection
              key={slot.id}
              slot={slot}
              selectedItemId={selections[slot.id] ?? null}
              onSelect={handleSelectOption}
              modifierSelections={modifierSelections[slot.id] ?? {}}
              onToggleModifier={handleToggleModifier}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-bold text-text w-8 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add to cart button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!isValid}
          >
            Add to Cart &mdash; {formatPrice(lineTotal)}
          </Button>

          {/* Validation hints */}
          {validationErrors.length > 0 && (
            <div className="text-center">
              {validationErrors.map((err) => (
                <p key={err} className="text-xs text-danger">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Slot selection component
// ---------------------------------------------------------------------------

function SlotSelection({
  slot,
  selectedItemId,
  onSelect,
  modifierSelections,
  onToggleModifier,
}: {
  slot: ComboSlot;
  selectedItemId: string | null;
  onSelect: (slotId: string, menuItemId: string) => void;
  modifierSelections: Record<string, Set<string>>;
  onToggleModifier: (slotId: string, group: ModifierGroup, optionId: string) => void;
}) {
  const isRequired = slot.minSelections > 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text">{slot.name}</h3>
        {isRequired ? (
          <Badge variant="warning">Required</Badge>
        ) : (
          <Badge variant="default">Optional</Badge>
        )}
      </div>
      <div className="space-y-1.5">
        {slot.options.map((option) => {
          const isSelected = selectedItemId === option.menuItemId;

          return (
            <div key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(slot.id, option.menuItemId)}
                className={[
                  'w-full flex items-center justify-between px-3 py-3 rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-bg-muted',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  {/* Radio indicator */}
                  <div
                    className={[
                      'h-5 w-5 flex items-center justify-center shrink-0 border-2 rounded-full transition-colors',
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border-strong',
                    ].join(' ')}
                  >
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-text-inverse" />
                    )}
                  </div>
                  <span className="text-sm text-text">
                    {option.menuItemName ?? 'Unknown Item'}
                  </span>
                </div>
                {option.priceModifier !== 0 && (
                  <span className="text-sm text-text-secondary shrink-0 ml-2">
                    {formatPriceDelta(option.priceModifier)}
                  </span>
                )}
              </button>

              {/* Inline modifier groups for selected option */}
              {isSelected && option.modifierGroups && option.modifierGroups.length > 0 && (
                <div className="ml-8 mt-2 mb-1 space-y-3">
                  {option.modifierGroups.map((group) => {
                    const isGroupRequired = group.minSelections > 0;
                    const isSingle = group.maxSelections === 1;
                    const selectedSet = modifierSelections[group.id] ?? new Set<string>();

                    return (
                      <div key={group.id}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-text-secondary">
                            {group.name}
                          </span>
                          {isGroupRequired ? (
                            <Badge variant="warning">Required</Badge>
                          ) : (
                            <Badge variant="default">Optional</Badge>
                          )}
                          {!isSingle && (
                            <span className="text-xs text-text-tertiary">
                              Up to {group.maxSelections}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {group.options
                            .filter((o: ModifierOption) => o.isActive === 1)
                            .map((modOption: ModifierOption) => {
                              const isModSelected = selectedSet.has(modOption.id);
                              const atMax =
                                !isSingle && selectedSet.size >= group.maxSelections;
                              const isDisabled = !isModSelected && atMax;

                              return (
                                <button
                                  key={modOption.id}
                                  type="button"
                                  onClick={() =>
                                    onToggleModifier(slot.id, group, modOption.id)
                                  }
                                  disabled={isDisabled}
                                  className={[
                                    'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                    isModSelected
                                      ? 'border-primary bg-primary/5'
                                      : 'border-border hover:bg-bg-muted',
                                    isDisabled
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'cursor-pointer',
                                  ].join(' ')}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={[
                                        'h-4 w-4 flex items-center justify-center shrink-0 border-2 transition-colors',
                                        isSingle ? 'rounded-full' : 'rounded',
                                        isModSelected
                                          ? 'border-primary bg-primary'
                                          : 'border-border-strong',
                                      ].join(' ')}
                                    >
                                      {isModSelected && (
                                        <div
                                          className={[
                                            'bg-text-inverse',
                                            isSingle
                                              ? 'h-1.5 w-1.5 rounded-full'
                                              : 'h-2 w-2 rounded-sm',
                                          ].join(' ')}
                                        />
                                      )}
                                    </div>
                                    <span className="text-sm text-text">
                                      {modOption.name}
                                    </span>
                                  </div>
                                  {modOption.priceDelta !== 0 && (
                                    <span className="text-xs text-text-secondary shrink-0 ml-2">
                                      {formatPriceDelta(modOption.priceDelta)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

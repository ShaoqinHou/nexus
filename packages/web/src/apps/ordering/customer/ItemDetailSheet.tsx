import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus } from 'lucide-react';
import { Badge, Button } from '@web/components/ui';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import type { MenuItem, ModifierGroup, ModifierOption, DietaryTag } from '@web/apps/ordering/types';

function getTagColor(tag: string): string {
  switch (tag as DietaryTag) {
    case 'vegetarian':
    case 'vegan':
      return 'bg-success-light text-success';
    case 'gluten-free':
    case 'dairy-free':
    case 'nut-free':
      return 'bg-primary-light text-primary';
    case 'halal':
      return 'bg-primary-light text-primary';
    case 'spicy':
      return 'bg-warning-light text-warning';
    case 'new':
    case 'popular':
      return 'bg-warning-light text-warning';
    default:
      return 'bg-bg-muted text-text-secondary';
  }
}

interface ItemDetailSheetProps {
  item: MenuItem;
  onClose: () => void;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

function formatPriceDelta(delta: number): string {
  if (delta > 0) return `+$${delta.toFixed(2)}`;
  if (delta < 0) return `-$${Math.abs(delta).toFixed(2)}`;
  return '';
}

export function ItemDetailSheet({ item, onClose }: ItemDetailSheetProps) {
  const { addItem } = useCart();
  const overlayRef = useRef<HTMLDivElement>(null);

  const groups = item.modifierGroups ?? [];

  // Initialize selections with defaults
  const [selections, setSelections] = useState<Record<string, Set<string>>>(
    () => {
      const initial: Record<string, Set<string>> = {};
      for (const group of groups) {
        const defaults = group.options
          .filter((o) => o.isDefault === 1)
          .map((o) => o.id);
        initial[group.id] = new Set(defaults);
      }
      return initial;
    },
  );

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Prevent body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
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

  const toggleOption = useCallback(
    (group: ModifierGroup, optionId: string) => {
      setSelections((prev) => {
        const current = new Set(prev[group.id] ?? []);
        if (group.maxSelections === 1) {
          // Radio behavior: replace selection
          return { ...prev, [group.id]: new Set([optionId]) };
        }
        // Checkbox behavior
        if (current.has(optionId)) {
          current.delete(optionId);
        } else if (current.size < group.maxSelections) {
          current.add(optionId);
        }
        return { ...prev, [group.id]: current };
      });
    },
    [],
  );

  // Calculate total with selected modifiers
  const selectedModifiers = useMemo(() => {
    const result: Array<{ optionId: string; name: string; price: number }> = [];
    for (const group of groups) {
      const selected = selections[group.id] ?? new Set<string>();
      for (const option of group.options) {
        if (selected.has(option.id)) {
          result.push({
            optionId: option.id,
            name: option.name,
            price: option.priceDelta,
          });
        }
      }
    }
    return result;
  }, [groups, selections]);

  const modifierTotal = useMemo(
    () => selectedModifiers.reduce((sum, m) => sum + m.price, 0),
    [selectedModifiers],
  );

  const lineTotal = (item.price + modifierTotal) * quantity;

  // Validation: check all required groups have min selections met
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    for (const group of groups) {
      const count = (selections[group.id] ?? new Set()).size;
      if (count < group.minSelections) {
        errors.push(
          `${group.name}: select at least ${group.minSelections}`,
        );
      }
    }
    return errors;
  }, [groups, selections]);

  const isValid = validationErrors.length === 0;

  const handleAddToCart = useCallback(() => {
    if (!isValid) return;

    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity,
      notes: notes.trim() || undefined,
      modifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
    });
    onClose();
  }, [
    isValid,
    addItem,
    item.id,
    item.name,
    item.price,
    quantity,
    notes,
    selectedModifiers,
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
        {item.imageUrl && (
          <div className="relative shrink-0">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-[200px] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-text break-words">{item.name}</h2>
            {item.description && (
              <p className="text-sm text-text-secondary mt-0.5">
                {item.description}
              </p>
            )}
            {item.tags && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.tags.split(',').filter(Boolean).map((tag) => (
                  <span
                    key={tag}
                    className={[
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                      getTagColor(tag),
                    ].join(' ')}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-base font-semibold text-primary mt-1">
              {formatPrice(item.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-5 min-h-0">
          {/* Modifier groups */}
          {groups.map((group) => {
            const isRequired = group.minSelections > 0;
            const isSingle = group.maxSelections === 1;
            const selectedSet = selections[group.id] ?? new Set<string>();

            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-text">
                    {group.name}
                  </h3>
                  {isRequired ? (
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
                <div className="space-y-1.5">
                  {group.options
                    .filter((o) => o.isActive === 1)
                    .map((option) => {
                      const isSelected = selectedSet.has(option.id);
                      const atMax =
                        !isSingle && selectedSet.size >= group.maxSelections;
                      const isDisabled = !isSelected && atMax;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(group, option.id)}
                          disabled={isDisabled}
                          className={[
                            'w-full flex items-center justify-between px-3 py-3 rounded-lg border text-left transition-colors',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-bg-muted',
                            isDisabled
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3">
                            {/* Radio or checkbox indicator */}
                            <div
                              className={[
                                'h-5 w-5 flex items-center justify-center shrink-0 border-2 transition-colors',
                                isSingle ? 'rounded-full' : 'rounded',
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-border-strong',
                              ].join(' ')}
                            >
                              {isSelected && (
                                <div
                                  className={[
                                    'bg-text-inverse',
                                    isSingle
                                      ? 'h-2 w-2 rounded-full'
                                      : 'h-2.5 w-2.5 rounded-sm',
                                  ].join(' ')}
                                />
                              )}
                            </div>
                            <span className="text-sm text-text">
                              {option.name}
                            </span>
                          </div>
                          {option.priceDelta !== 0 && (
                            <span className="text-sm text-text-secondary shrink-0 ml-2">
                              {formatPriceDelta(option.priceDelta)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-text block mb-1.5">
              Special Requests
            </label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(e.target.value)
              }
              placeholder="Any special requests..."
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
          {/* Quantity selector */}
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-11 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors"
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
              className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors"
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

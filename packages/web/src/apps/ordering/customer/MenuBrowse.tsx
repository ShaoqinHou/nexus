import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, UtensilsCrossed, Package } from 'lucide-react';
import { apiClient } from '@web/lib/api';
import { formatPrice, parseTags } from '@web/lib/format';
import { Button } from '@web/components/ui';
import { EmptyState } from '@web/components/patterns';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import { ItemDetailSheet } from '@web/apps/ordering/customer/ItemDetailSheet';
import { ComboSheet } from '@web/apps/ordering/customer/ComboSheet';
import type { MenuCategory, MenuItem, ModifierGroup, ComboDeal } from '@web/apps/ordering/types';
import type { DietaryTag } from '@web/apps/ordering/types';

interface PublicMenuItem extends MenuItem {
  modifierGroups?: ModifierGroup[];
}

interface PublicMenuCategory {
  category: MenuCategory;
  items: PublicMenuItem[];
}

interface PublicMenuResponse {
  categories: PublicMenuCategory[];
  combos: ComboDeal[];
}

interface MenuBrowseProps {
  tenantSlug: string;
}

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

function DietaryTagBadges({ tags }: { tags: string | null }) {
  const parsed = parseTags(tags);
  if (parsed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {parsed.map((tag) => (
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
  );
}

function MenuItemCard({
  item,
  onOpenDetail,
}: {
  item: PublicMenuItem;
  onOpenDetail: (item: PublicMenuItem) => void;
}) {
  const { items, addItem, updateQuantity } = useCart();

  const hasModifiers =
    (item.modifierGroups ?? []).length > 0;

  // For items without modifiers, count total quantity across all cart entries
  // For items with modifiers, show total across all variants
  const totalQuantity = items
    .filter((ci) => ci.menuItemId === item.id)
    .reduce((sum, ci) => sum + ci.quantity, 0);

  const handleAdd = useCallback(() => {
    if (hasModifiers) {
      onOpenDetail(item);
    } else {
      addItem({ menuItemId: item.id, name: item.name, price: item.price });
    }
  }, [hasModifiers, onOpenDetail, addItem, item]);

  const handleDecrement = useCallback(() => {
    if (totalQuantity > 0) {
      // Find the last cart entry for this item and decrement
      const lastIndex = items.reduce<number>(
        (last, ci, i) => (ci.menuItemId === item.id ? i : last),
        -1,
      );
      if (lastIndex >= 0) {
        updateQuantity(lastIndex, items[lastIndex].quantity - 1);
      }
    }
  }, [updateQuantity, items, item.id, totalQuantity]);

  const isUnavailable = !item.isAvailable;

  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={[
        'flex gap-3 p-3 rounded-lg border border-border bg-bg-elevated',
        isUnavailable ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Item image thumbnail */}
      {item.imageUrl && !imgError ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-bg-muted"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-bg-muted flex items-center justify-center shrink-0">
          <UtensilsCrossed className="h-6 w-6 text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text truncate">
            {item.name}
          </h3>
          <span className="text-sm font-semibold text-primary whitespace-nowrap">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
            {item.description}
          </p>
        )}
        <DietaryTagBadges tags={item.tags} />
        {hasModifiers && (
          <p className="mt-0.5 text-xs text-text-tertiary">Customizable</p>
        )}
        {isUnavailable && (
          <p className="mt-1 text-xs font-medium text-danger">Unavailable</p>
        )}
      </div>

      <div className="flex items-end shrink-0">
        {isUnavailable ? null : totalQuantity === 0 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            className="h-10 w-10 !p-0"
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDecrement}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Decrease ${item.name} quantity`}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="text-sm font-semibold text-text w-5 text-center">
              {totalQuantity}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Increase ${item.name} quantity`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  items,
  sectionRef,
  onOpenDetail,
}: {
  category: MenuCategory;
  items: PublicMenuItem[];
  sectionRef: (el: HTMLDivElement | null) => void;
  onOpenDetail: (item: PublicMenuItem) => void;
}) {
  return (
    <div ref={sectionRef} className="scroll-mt-24">
      <h2 className="text-base font-bold text-text mb-2 px-1">
        {category.name}
      </h2>
      {category.description && (
        <p className="text-xs text-text-secondary mb-3 px-1">
          {category.description}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </div>
  );
}

function ComboCard({
  combo,
  onSelect,
}: {
  combo: ComboDeal;
  onSelect: (combo: ComboDeal) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(combo)}
      className="flex gap-3 p-3 rounded-lg border border-border bg-bg-elevated text-left transition-colors hover:bg-bg-muted w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Combo image */}
      {combo.imageUrl ? (
        <img
          src={combo.imageUrl}
          alt={combo.name}
          loading="lazy"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-bg-muted"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-bg-muted flex items-center justify-center shrink-0">
          <Package className="h-6 w-6 text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text truncate">
            {combo.name}
          </h3>
          <span className="text-sm font-semibold text-primary whitespace-nowrap">
            from {formatPrice(combo.basePrice)}
          </span>
        </div>
        {combo.description && (
          <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
            {combo.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          {combo.slots.map((slot) => (
            <span
              key={slot.id}
              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-primary-light text-primary"
            >
              {slot.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function MenuSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Category pills skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-full bg-bg-muted shrink-0"
          />
        ))}
      </div>
      {/* Menu items skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg border border-border">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-bg-muted" />
            <div className="h-3 w-1/2 rounded bg-bg-muted" />
          </div>
          <div className="h-8 w-8 rounded bg-bg-muted shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function MenuBrowse({ tenantSlug }: MenuBrowseProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PublicMenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<ComboDeal | null>(null);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const {
    data: menuData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ordering', 'public-menu', tenantSlug],
    queryFn: () =>
      apiClient.get<{ data: PublicMenuResponse | PublicMenuCategory[] }>(
        `/order/${tenantSlug}/ordering/menu`,
      ),
    select: (res) => {
      const payload = res.data;
      // Handle both old shape (array) and new shape (object with categories + combos)
      if (Array.isArray(payload)) {
        return { categories: payload, combos: [] };
      }
      return {
        categories: payload.categories ?? [],
        combos: payload.combos ?? [],
      };
    },
  });

  const scrollToCategory = useCallback((categoryId: string) => {
    setActiveCategory(categoryId);
    const el = sectionRefs.current.get(categoryId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const setSectionRef = useCallback(
    (categoryId: string) => (el: HTMLDivElement | null) => {
      if (el) {
        sectionRefs.current.set(categoryId, el);
      } else {
        sectionRefs.current.delete(categoryId);
      }
    },
    [],
  );

  if (isLoading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4">
        <EmptyState
          icon={UtensilsCrossed}
          title="Unable to load menu"
          description="Something went wrong loading the menu. Please try again."
          action={{
            label: 'Retry',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  // Filter to only active categories with available items
  const visibleCategories = (menuData?.categories ?? []).filter(
    (entry) => entry.category.isActive && entry.items.length > 0,
  );

  // Active combo deals
  const activeCombos = (menuData?.combos ?? []).filter(
    (combo) => combo.isActive === 1,
  );

  if (visibleCategories.length === 0 && activeCombos.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={UtensilsCrossed}
          title="Menu not available"
          description="This restaurant hasn't added any items to their menu yet."
        />
      </div>
    );
  }

  // Set default active category
  const activeCatId =
    activeCategory ?? visibleCategories[0]?.category.id ?? null;

  return (
    <div className="flex flex-col">
      {/* Category pills */}
      <div className="sticky top-[53px] z-10 bg-bg/95 backdrop-blur-sm border-b border-border">
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          {visibleCategories.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollToCategory(category.id)}
              className={[
                'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                activeCatId === category.id
                  ? 'bg-primary text-text-inverse'
                  : 'bg-bg-muted text-text-secondary hover:text-text',
              ].join(' ')}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu sections */}
      <div className="flex flex-col gap-6 p-4">
        {visibleCategories.map(({ category, items }) => (
          <CategorySection
            key={category.id}
            category={category}
            items={items}
            sectionRef={setSectionRef(category.id)}
            onOpenDetail={setDetailItem}
          />
        ))}

        {/* Combo Deals section */}
        {activeCombos.length > 0 && (
          <div className="scroll-mt-24">
            <h2 className="text-base font-bold text-text mb-2 px-1">
              Combo Deals
            </h2>
            <p className="text-xs text-text-secondary mb-3 px-1">
              Save with our meal bundles
            </p>
            <div className="flex flex-col gap-2">
              {activeCombos.map((combo) => (
                <ComboCard
                  key={combo.id}
                  combo={combo}
                  onSelect={setSelectedCombo}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Item detail sheet for modifier selection */}
      {detailItem && (
        <ItemDetailSheet
          key={detailItem.id}
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Combo customization sheet */}
      {selectedCombo && (
        <ComboSheet
          key={selectedCombo.id}
          combo={selectedCombo}
          onClose={() => setSelectedCombo(null)}
        />
      )}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, UtensilsCrossed, Package, Search, X, AlertTriangle, ArrowUp, Moon, Sun } from 'lucide-react';
import { apiClient } from '@web/lib/api';
import { formatPrice, parseTags } from '@web/lib/format';
import { Button } from '@web/components/ui';
import { EmptyState, PullToRefreshIndicator } from '@web/components/patterns';
import { useCart } from '@web/apps/ordering/customer/CartProvider';
import { ItemDetailSheet } from '@web/apps/ordering/customer/ItemDetailSheet';
import { ComboSheet } from '@web/apps/ordering/customer/ComboSheet';
import { useTheme } from '@web/platform/theme/ThemeProvider';
import { usePullToRefresh } from '@web/lib/hooks/usePullToRefresh';
import type { MenuCategory, MenuItem, ModifierGroup, ComboDeal } from '@web/apps/ordering/types';
import type { DietaryTag } from '@web/apps/ordering/types';
import { ALLERGENS } from '@web/apps/ordering/types';

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
  featured: PublicMenuItem[];
}

interface MenuBrowseProps {
  tenantSlug: string;
  tableNumber?: string;
  disabled?: boolean;
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

function AllergenBadges({ allergens }: { allergens: string | null }) {
  const parsed = parseTags(allergens);
  if (parsed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {parsed.map((allergen) => (
        <span
          key={allergen}
          className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium bg-danger-light text-danger"
        >
          {allergen}
        </span>
      ))}
    </div>
  );
}

function MenuItemCard({
  item,
  onOpenDetail,
  disabled = false,
  tourTarget,
}: {
  item: PublicMenuItem;
  onOpenDetail: (item: PublicMenuItem) => void;
  disabled?: boolean;
  tourTarget?: string;
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

  const isUnavailable = !item.isAvailable || disabled;

  const [imgError, setImgError] = useState(false);

  // Build modifier group names for desktop preview
  const modifierPreview = hasModifiers
    ? (item.modifierGroups ?? []).map((g) => g.name).join(', ')
    : '';

  return (
    <div
      className={[
        'flex gap-3 p-3 rounded-lg border border-border bg-bg-elevated',
        'lg:flex-col lg:gap-0 lg:p-0 lg:overflow-hidden',
        isUnavailable ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Item image thumbnail — row on mobile, full-width top on desktop */}
      {item.imageUrl && !imgError ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-bg-muted lg:w-full lg:h-36 lg:rounded-none"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-bg-muted flex items-center justify-center shrink-0 lg:w-full lg:h-36 lg:rounded-none">
          <UtensilsCrossed className="h-6 w-6 text-text-tertiary" />
        </div>
      )}

      <div className="flex-1 min-w-0 lg:p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text truncate">
            {item.name}
          </h3>
          <span className="text-sm font-semibold text-primary whitespace-nowrap">
            {formatPrice(item.price)}
          </span>
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs text-text-secondary line-clamp-2 lg:line-clamp-3">
            {item.description}
          </p>
        )}
        <DietaryTagBadges tags={item.tags} />
        <AllergenBadges allergens={item.allergens} />
        {hasModifiers && (
          <p className="mt-0.5 text-xs text-text-tertiary">
            <span className="lg:hidden">Customizable</span>
            <span className="hidden lg:inline">Customizable{modifierPreview ? ` \u00b7 ${modifierPreview}` : ''}</span>
          </p>
        )}
        {isUnavailable && (
          <p className="mt-1 text-xs font-medium text-danger">Unavailable</p>
        )}
      </div>

      <div className="flex items-end shrink-0 lg:px-3 lg:pb-3">
        {isUnavailable ? null : totalQuantity === 0 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            className="min-h-[48px] min-w-[48px] !p-0 active:scale-[0.97] transition-transform"
            aria-label={`Add ${item.name} to cart`}
            {...(tourTarget ? { 'data-tour': tourTarget } : {})}
          >
            <Plus className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDecrement}
              className="h-12 w-12 flex items-center justify-center rounded-full border border-border text-text-secondary hover:bg-bg-muted active:scale-[0.92] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Decrease ${item.name} quantity`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-text w-8 text-center">
              {totalQuantity}
            </span>
            <button
              type="button"
              onClick={handleAdd}
              className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-text-inverse hover:bg-primary-hover active:scale-[0.92] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label={`Increase ${item.name} quantity`}
            >
              <Plus className="h-4 w-4" />
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
  disabled = false,
  isFirstSection = false,
}: {
  category: MenuCategory;
  items: PublicMenuItem[];
  sectionRef: (el: HTMLDivElement | null) => void;
  onOpenDetail: (item: PublicMenuItem) => void;
  disabled?: boolean;
  isFirstSection?: boolean;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((item, idx) => (
          <MenuItemCard
            key={item.id}
            item={item}
            onOpenDetail={onOpenDetail}
            disabled={disabled}
            tourTarget={isFirstSection && idx === 0 ? 'first-add-button' : undefined}
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
      className="flex gap-3 p-3 rounded-lg border border-border bg-bg-elevated text-left transition-all hover:bg-bg-muted w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
    >
      {/* Combo image */}
      {combo.imageUrl ? (
        <img
          src={combo.imageUrl}
          alt={combo.name}
          loading="lazy"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            (e.target as HTMLImageElement).hidden = true;
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
    <div className="flex flex-col lg:flex-row">
      {/* Desktop sidebar skeleton */}
      <nav className="hidden lg:block w-52 shrink-0 sticky top-0 self-start h-screen overflow-y-auto border-r border-border pt-4 px-3">
        {/* Search skeleton */}
        <div className="h-12 rounded-lg bg-bg-muted mb-4 animate-shimmer" />
        {/* Category links skeleton */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-bg-muted mb-2 animate-shimmer"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </nav>

      {/* Main content skeleton */}
      <div className="flex-1 min-w-0 p-4 space-y-4">
        {/* Category pills skeleton */}
        <div className="flex gap-2 overflow-hidden lg:hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-20 rounded-full bg-bg-muted shrink-0 animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>

        {/* Featured items skeleton */}
        <div>
          <div className="h-5 w-20 rounded bg-bg-muted mb-2 animate-shimmer" />
          <div className="flex gap-3 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="shrink-0 w-40 rounded-xl border border-border overflow-hidden"
              >
                <div className="w-full h-20 bg-bg-muted animate-shimmer" />
                <div className="p-2 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-bg-muted animate-shimmer" />
                  <div className="h-4 w-1/2 rounded bg-bg-muted animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu items skeleton */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex gap-3 p-3 rounded-lg border border-border"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {/* Image skeleton */}
            <div className="w-16 h-16 lg:w-full lg:h-36 rounded-lg bg-bg-muted shrink-0 animate-shimmer" />
            {/* Content skeleton */}
            <div className="flex-1 min-w-0 lg:p-3 space-y-2">
              <div className="h-4 w-3/4 rounded bg-bg-muted animate-shimmer" />
              <div className="h-3 w-full rounded bg-bg-muted animate-shimmer" />
              <div className="h-3 w-1/2 rounded bg-bg-muted animate-shimmer" />
              <div className="h-6 w-6 rounded-full bg-bg-muted mt-2 animate-shimmer" />
            </div>
            {/* Action button skeleton */}
            <div className="flex items-end shrink-0 lg:px-3 lg:pb-3">
              <div className="h-12 w-12 rounded-full bg-bg-muted animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const SEARCH_HISTORY_KEY = 'nexus_search_history';
const MAX_SEARCH_HISTORY = 5;

export function MenuBrowse({ tenantSlug, tableNumber, disabled = false }: MenuBrowseProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<PublicMenuItem | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<ComboDeal | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hiddenAllergens, setHiddenAllergens] = useState<Set<string>>(new Set());
  const [allergenFilterOpen, setAllergenFilterOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const sectionRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { addItem } = useCart();
  const { theme, toggleTheme } = useTheme();

  // Search history state
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q !== query);
      const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleAllergenFilter = useCallback((allergen: string) => {
    setHiddenAllergens((prev) => {
      const next = new Set(prev);
      if (next.has(allergen)) {
        next.delete(allergen);
      } else {
        next.add(allergen);
      }
      return next;
    });
  }, []);

  const filterByAllergens = useCallback((items: PublicMenuItem[]) => {
    if (hiddenAllergens.size === 0) return items;
    return items.filter((item) => {
      const itemAllergens = parseTags(item.allergens);
      return !itemAllergens.some((a) => hiddenAllergens.has(a));
    });
  }, [hiddenAllergens]);

  const {
    data: menuData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ordering', 'public-menu', tenantSlug],
    queryFn: () =>
      apiClient.get<{ data: PublicMenuResponse | PublicMenuCategory[] }>(
        `/order/${tenantSlug}/ordering/menu`,
      ),
    select: (res) => {
      const payload = res.data;
      // Handle both old shape (array) and new shape (object with categories + combos + featured)
      if (Array.isArray(payload)) {
        return { categories: payload, combos: [], featured: [] };
      }
      return {
        categories: payload.categories ?? [],
        combos: payload.combos ?? [],
        featured: payload.featured ?? [],
      };
    },
  });

  // Pull-to-refresh hook
  const { pullDistance, isRefreshing, touchAreaProps } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    threshold: 80,
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

  // Scroll-spy: update active category as user scrolls
  const isScrollingRef = useRef(false);
  useEffect(() => {
    const sections = sectionRefs.current;
    if (sections.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = Array.from(sections.entries()).find(
              ([, el]) => el === entry.target,
            )?.[0];
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  // Show back-to-top button after scrolling 1.5 screen heights
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const screenHeight = window.innerHeight;
      setShowBackToTop(scrollY > screenHeight * 1.5);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Track searches and add to history
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      // Debounce: add to history after user stops typing for 500ms
      const timer = setTimeout(() => {
        addToSearchHistory(searchQuery.trim());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, addToSearchHistory]);

  // Temporarily disable scroll-spy during programmatic scroll
  const scrollToWithSpy = useCallback((categoryId: string) => {
    isScrollingRef.current = true;
    setActiveCategory(categoryId);
    const el = sectionRefs.current.get(categoryId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  }, []);

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

  // Featured items
  const featuredItems = menuData?.featured ?? [];

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
    <>
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        threshold={80}
        isRefreshing={isRefreshing}
      />

      <div className="flex flex-col lg:flex-row" {...touchAreaProps}>
      {/* Desktop category rail — sticky sidebar on lg+ */}
      <nav className="hidden lg:block w-52 shrink-0 sticky top-0 self-start h-screen overflow-y-auto border-r border-border pt-4 px-3">
        {/* Table number chip */}
        {tableNumber && (
          <span className="shrink-0 px-2 py-1 rounded-full bg-bg-muted text-xs font-semibold text-text-secondary inline-block mb-3">
            Table {tableNumber}
          </span>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-muted transition-colors mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        {/* Always-visible search on desktop */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            className="w-full text-base pl-10 pr-10 py-3 h-12 rounded-lg border border-border bg-bg text-text placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-bg-muted text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Allergen filter */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setAllergenFilterOpen((p) => !p)}
            className={[
              'flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors w-full text-left',
              hiddenAllergens.size > 0
                ? 'text-danger bg-danger-light'
                : 'text-text-secondary hover:bg-bg-muted',
            ].join(' ')}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Allergen Filter
            {hiddenAllergens.size > 0 && (
              <span className="ml-auto text-xs font-bold">{hiddenAllergens.size}</span>
            )}
          </button>
          {allergenFilterOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              {ALLERGENS.map((allergen) => {
                const isHidden = hiddenAllergens.has(allergen);
                return (
                  <button
                    key={allergen}
                    type="button"
                    onClick={() => toggleAllergenFilter(allergen)}
                    className={[
                      'px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                      isHidden
                        ? 'bg-danger text-text-inverse border-danger'
                        : 'bg-bg-muted text-text-secondary border-border hover:border-border-strong',
                    ].join(' ')}
                  >
                    {allergen}
                  </button>
                );
              })}
              {hiddenAllergens.size > 0 && (
                <button
                  type="button"
                  onClick={() => setHiddenAllergens(new Set())}
                  className="ml-auto text-xs text-primary hover:text-primary-hover font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {/* Category links */}
        <div className="flex flex-col gap-0.5">
          {visibleCategories.map(({ category }) => (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollToWithSpy(category.id)}
              className={[
                'text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                activeCatId === category.id
                  ? 'bg-primary text-text-inverse shadow-sm'
                  : 'text-text-secondary hover:bg-bg-muted hover:text-text',
              ].join(' ')}
            >
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Featured items — horizontal scroll on mobile, grid on desktop */}
        {featuredItems.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <h2 className="text-sm font-bold text-text mb-2">Popular</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible">
              {featuredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    if ((item.modifierGroups ?? []).length > 0) {
                      setDetailItem(item);
                    } else {
                      addItem({ menuItemId: item.id, name: item.name, price: item.price });
                    }
                  }}
                  className={[
                    'shrink-0 w-40 lg:w-auto rounded-xl border border-border bg-bg-elevated overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] transition-all',
                    disabled ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-20 object-cover"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).hidden = true; }}
                    />
                  ) : (
                    <div className="w-full h-20 bg-bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="h-6 w-6 text-text-tertiary" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-semibold text-text truncate">{item.name}</p>
                    <p className="text-xs font-semibold text-primary mt-0.5">{formatPrice(item.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category pills + search — mobile/tablet only */}
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-border lg:hidden">
          {searchOpen ? (
            <>
              <div className="flex items-center gap-2 px-4 min-h-[48px]">
                <Search className="h-5 w-5 text-text-tertiary shrink-0" />
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search menu..."
                    autoFocus
                    className="w-full bg-transparent text-base text-text placeholder:text-text-tertiary outline-none pr-10 py-2"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-bg-muted text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="shrink-0 text-base font-medium text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1"
                >
                  Done
                </button>
              </div>
              {/* Recent searches */}
              {!searchQuery.trim() && searchHistory.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-bg-surface">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-text-secondary">Recent Searches</p>
                    <button
                      type="button"
                      onClick={clearSearchHistory}
                      className="text-xs text-primary hover:text-primary-hover font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {searchHistory.map((query) => (
                      <button
                        key={query}
                        type="button"
                        onClick={() => {
                          setSearchQuery(query);
                          addToSearchHistory(query);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Search className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
                        <span className="text-sm text-text">{query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div data-tour="category-pills" className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
                {visibleCategories.map(({ category }) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => scrollToWithSpy(category.id)}
                    className={[
                      'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.95]',
                      activeCatId === category.id
                        ? 'bg-primary text-text-inverse shadow-sm'
                        : 'bg-bg-muted text-text-secondary hover:text-text hover:bg-bg-strong',
                    ].join(' ')}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-bg-muted text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Search menu"
              >
                <Search className="h-5 w-5" />
              </button>
              {/* Allergen filter toggle */}
              <button
                type="button"
                onClick={() => setAllergenFilterOpen((p) => !p)}
                className={[
                  'shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  hiddenAllergens.size > 0
                    ? 'text-danger bg-danger-light relative'
                    : 'text-text-secondary hover:bg-bg-muted',
                ].join(' ')}
                aria-label={`Allergen filter${hiddenAllergens.size > 0 ? ` (${hiddenAllergens.size} filtered)` : ''}`}
              >
                <AlertTriangle className="h-5 w-5" />
                {hiddenAllergens.size > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-danger text-text-inverse text-xs font-bold flex items-center justify-center">
                    {hiddenAllergens.size}
                  </span>
                )}
              </button>
              {/* Theme toggle button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-bg-muted text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </button>
              {tableNumber && (
                <span className="shrink-0 px-2 py-1 rounded-full bg-bg-muted text-xs font-semibold text-text-secondary">
                  Table {tableNumber}
                </span>
              )}
            </div>
          )}
          {/* Mobile allergen filter panel */}
          {allergenFilterOpen && (
            <div className="px-4 py-2 border-t border-border bg-bg-surface lg:hidden">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-text-secondary">
                  Hide items containing:
                </p>
                {hiddenAllergens.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setHiddenAllergens(new Set())}
                    className="text-xs text-primary hover:text-primary-hover font-medium min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALLERGENS.map((allergen) => {
                  const isHidden = hiddenAllergens.has(allergen);
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => toggleAllergenFilter(allergen)}
                      className={[
                        'px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                        isHidden
                          ? 'bg-danger text-text-inverse border-danger'
                          : 'bg-bg-muted text-text-secondary border-border hover:border-border-strong',
                      ].join(' ')}
                    >
                      {allergen}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Menu sections */}
        <div className="flex flex-col gap-6 p-4">
          {searchQuery.trim() ? (
            // Search results
            (() => {
              const q = searchQuery.toLowerCase();
              const results = filterByAllergens(visibleCategories.flatMap(({ items }) =>
                items.filter(
                  (item) =>
                    item.name.toLowerCase().includes(q) ||
                    (item.description ?? '').toLowerCase().includes(q) ||
                    (item.tags ?? '').toLowerCase().includes(q)
                )
              ));
              if (results.length === 0) {
                return (
                  <EmptyState
                    icon={Search}
                    title="No results"
                    description={`Nothing matched "${searchQuery}"`}
                    action={{ label: 'Clear search', onClick: () => { setSearchQuery(''); setSearchOpen(false); } }}
                  />
                );
              }
              return (
                <div>
                  <p className="text-xs text-text-secondary mb-3 px-1">
                    {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {results.map((item) => (
                      <MenuItemCard key={item.id} item={item} onOpenDetail={setDetailItem} disabled={disabled} />
                    ))}
                  </div>
                </div>
              );
            })()
          ) : (
            // Normal category layout
            (() => {
              let firstRendered = false;
              return visibleCategories.map(({ category, items }) => {
                const filtered = filterByAllergens(items);
                if (filtered.length === 0) return null;
                const isFirst = !firstRendered;
                firstRendered = true;
                return (
                  <CategorySection
                    key={category.id}
                    category={category}
                    items={filtered}
                    sectionRef={setSectionRef(category.id)}
                    onOpenDetail={setDetailItem}
                    disabled={disabled}
                    isFirstSection={isFirst}
                  />
                );
              });
            })()
          )}

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

      {/* Back-to-top button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 lg:bottom-4 lg:right-8 z-30 min-h-[48px] min-w-[48px] h-14 w-14 flex items-center justify-center rounded-full bg-primary text-text-inverse shadow-lg hover:bg-primary-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          aria-label="Back to top"
        >
          <ArrowUp className="h-6 w-6" />
        </button>
      )}
    </div>
    </>
  );
}

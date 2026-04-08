import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  FolderOpen,
  UtensilsCrossed,
  Settings2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
  Toggle,
} from '@web/components/ui';
import { ConfirmButton, EmptyState } from '@web/components/patterns';
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
} from '../hooks/useMenu';
import {
  useModifierGroups,
  useItemModifierGroups,
  useSetItemModifierGroups,
} from '../hooks/useModifiers';
import type { MenuCategory, MenuItem } from '../types';
import { DIETARY_TAGS } from '../types';

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
      title={isEdit ? 'Edit Category' : 'Add Category'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-form"
            loading={loading}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mains, Drinks, Desserts"
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
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
}

function ItemDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ItemFormData) => void;
  initial?: ItemFormData;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [price, setPrice] = useState(initial?.price ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(initial?.tags?.split(',').filter(Boolean) ?? []),
  );

  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setPrice(initial?.price?.toString() ?? '');
    setImageUrl(initial?.imageUrl ?? '');
    setSelectedTags(new Set(initial?.tags?.split(',').filter(Boolean) ?? []));
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      price,
      imageUrl: imageUrl.trim(),
      tags: Array.from(selectedTags).join(','),
    });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setSelectedTags(new Set());
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Item' : 'Add Item'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="item-form"
            loading={loading}
            disabled={!name.trim() || !price}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Margherita Pizza"
          required
          autoFocus
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
        <Input
          label="Price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
          required
        />
        <Input
          label="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            Tags
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
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    isSelected
                      ? 'bg-primary text-text-inverse border-primary'
                      : 'bg-bg-muted text-text-secondary border-border hover:border-border-strong',
                  ].join(' ')}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Category list (left panel)
// ---------------------------------------------------------------------------

function CategoryList({
  categories,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: {
  categories: MenuCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (cat: MenuCategory) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Categories</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {categories.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No categories"
            description="Create your first menu category to start adding items."
            action={{ label: 'Add Category', onClick: onAdd }}
          />
        ) : (
          <ul className="divide-y divide-border">
            {categories.map((cat) => (
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
                    'w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-3 text-left transition-colors',
                    selectedId === cat.id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-bg-muted',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {cat.name}
                    </p>
                    {cat.description && (
                      <p className="text-xs text-text-secondary truncate">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(cat);
                      }}
                      className="p-2 sm:p-1 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      onConfirm={() => onDelete(cat.id)}
                      confirmText="Delete?"
                      className="!p-1 text-text-tertiary hover:text-danger"
                    >
                      <span className="text-xs">Del</span>
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
  const { toast } = useToast();
  const allGroupsQuery = useModifierGroups(tenantSlug);
  const allGroups = allGroupsQuery.data ?? [];
  const linkedQuery = useItemModifierGroups(tenantSlug, item.id);
  const linkedGroups = linkedQuery.data ?? [];
  const setGroups = useSetItemModifierGroups(tenantSlug);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Sync selected state when linked groups load
  useEffect(() => {
    if (!initialized && linkedQuery.isSuccess) {
      setSelected(new Set(linkedGroups.map((g) => g.id)));
      setInitialized(true);
    }
  }, [linkedQuery.isSuccess, linkedGroups, initialized]);

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
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleSave = () => {
    setGroups.mutate(
      { itemId: item.id, groupIds: Array.from(selected) },
      {
        onSuccess: () => {
          toast('success', 'Item modifiers updated');
          onClose();
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update item modifiers');
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Modifiers for ${item.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={setGroups.isPending}
          >
            Save
          </Button>
        </>
      }
    >
      {allGroups.length === 0 ? (
        <p className="text-sm text-text-secondary">
          No modifier groups created yet. Go to the Modifiers page to create
          groups first.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {allGroups.map((group) => (
            <label
              key={group.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-muted cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(group.id)}
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
          ))}
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
  onManageModifiers,
}: {
  item: MenuItem;
  tenantSlug: string;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggleAvailability: (item: MenuItem) => void;
  onManageModifiers: (item: MenuItem) => void;
}) {
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
              {item.description && (
                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <p className="text-sm font-semibold text-text shrink-0">
              ${item.price.toFixed(2)}
            </p>
          </div>

          {item.tags && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.tags.split(',').filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-bg-muted text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <Toggle
              checked={item.isAvailable === 1}
              onChange={() => onToggleAvailability(item)}
              label={item.isAvailable === 1 ? 'Available' : 'Unavailable'}
            />

            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageModifiers(item)}
                aria-label={`Manage modifiers for ${item.name}`}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Modifiers
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                aria-label={`Edit ${item.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <ConfirmButton
                variant="ghost"
                size="sm"
                onConfirm={() => onDelete(item.id)}
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
// Main page
// ---------------------------------------------------------------------------

export function MenuManagement() {
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

  // Mutations
  const createCategory = useCreateCategory(tenantSlug);
  const updateCategory = useUpdateCategory(tenantSlug);
  const deleteCategory = useDeleteCategory(tenantSlug);
  const createItem = useCreateMenuItem(tenantSlug);
  const updateItem = useUpdateMenuItem(tenantSlug);
  const deleteItem = useDeleteMenuItem(tenantSlug);

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
            toast('success', 'Category updated');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to update category');
          },
        },
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => {
          setCategoryDialogOpen(false);
          toast('success', 'Category created');
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to create category');
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
        toast('success', 'Category deleted');
      },
      onError: (err: Error) => {
        toast('error', err.message || 'Failed to delete category');
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
        },
        {
          onSuccess: () => {
            setItemDialogOpen(false);
            toast('success', 'Item updated');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to update item');
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
        },
        {
          onSuccess: () => {
            setItemDialogOpen(false);
            toast('success', 'Item created');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to create item');
          },
        },
      );
    }
  };

  const handleDeleteItem = (id: string) => {
    deleteItem.mutate(id, {
      onSuccess: () => {
        toast('success', 'Item deleted');
      },
      onError: (err: Error) => {
        toast('error', err.message || 'Failed to delete item');
      },
    });
  };

  const handleToggleAvailability = (item: MenuItem) => {
    updateItem.mutate(
      { id: item.id, isAvailable: item.isAvailable === 1 ? 0 : 1 },
      {
        onSuccess: () => {
          toast('success', item.isAvailable === 1 ? 'Item marked unavailable' : 'Item marked available');
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to update availability');
        },
      },
    );
  };

  // Selected category object for item panel header
  const selectedCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text">Menu Management</h1>

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
          />
        </div>

        {/* Right panel: items for selected category */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedCategory
                  ? `${selectedCategory.name} Items`
                  : 'Menu Items'}
              </CardTitle>
              {activeCategoryId && (
                <Button size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!activeCategoryId ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No category selected"
                  description="Select a category from the left panel to see its items, or create one first."
                />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No items yet"
                  description="Add your first menu item to this category."
                  action={{ label: 'Add Item', onClick: handleAddItem }}
                />
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      tenantSlug={tenantSlug}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onToggleAvailability={handleToggleAvailability}
                      onManageModifiers={setModifierLinkItem}
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
        initial={
          editingItem
            ? {
                name: editingItem.name,
                description: editingItem.description ?? '',
                price: editingItem.price.toString(),
                imageUrl: editingItem.imageUrl ?? '',
                tags: editingItem.tags ?? '',
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

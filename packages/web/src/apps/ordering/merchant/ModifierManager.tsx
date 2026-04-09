import { useState, useEffect } from 'react';
import { Plus, Pencil, Settings2, Layers } from 'lucide-react';
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
import { formatPriceDelta } from '@web/lib/format';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  useModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useDeleteModifierGroup,
  useCreateModifierOption,
  useUpdateModifierOption,
  useDeleteModifierOption,
} from '../hooks/useModifiers';
import type { ModifierGroup, ModifierOption } from '../types';

// ---------------------------------------------------------------------------
// Modifier group form dialog
// ---------------------------------------------------------------------------

interface GroupFormData {
  name: string;
  minSelections: string;
  maxSelections: string;
}

function GroupDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => void;
  initial?: GroupFormData;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [minSelections, setMinSelections] = useState(
    initial?.minSelections ?? '0',
  );
  const [maxSelections, setMaxSelections] = useState(
    initial?.maxSelections ?? '1',
  );

  useEffect(() => {
    setName(initial?.name ?? '');
    setMinSelections(initial?.minSelections ?? '0');
    setMaxSelections(initial?.maxSelections ?? '1');
  }, [initial]);

  const isEdit = !!initial;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      minSelections,
      maxSelections,
    });
  };

  const handleClose = () => {
    setName('');
    setMinSelections('0');
    setMaxSelections('1');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Modifier Group' : 'Add Modifier Group'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="group-form"
            loading={loading}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="group-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Size, Toppings, Spice Level"
          required
          autoFocus
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Selections"
            type="number"
            min="0"
            value={minSelections}
            onChange={(e) => setMinSelections(e.target.value)}
            helperText="0 = optional"
          />
          <Input
            label="Max Selections"
            type="number"
            min="1"
            value={maxSelections}
            onChange={(e) => setMaxSelections(e.target.value)}
            helperText="1 = single choice"
          />
        </div>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Option form dialog
// ---------------------------------------------------------------------------

interface OptionFormData {
  name: string;
  priceDelta: string;
  isDefault: boolean;
}

function OptionDialog({
  open,
  onClose,
  onSubmit,
  initial,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OptionFormData) => void;
  initial?: OptionFormData;
  loading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [priceDelta, setPriceDelta] = useState(initial?.priceDelta ?? '0');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  useEffect(() => {
    setName(initial?.name ?? '');
    setPriceDelta(initial?.priceDelta ?? '0');
    setIsDefault(initial?.isDefault ?? false);
  }, [initial]);

  const isEdit = !!initial;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), priceDelta, isDefault });
  };

  const handleClose = () => {
    setName('');
    setPriceDelta('0');
    setIsDefault(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Option' : 'Add Option'}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="option-form"
            loading={loading}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="option-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Large, Extra Cheese"
          required
          autoFocus
        />
        <Input
          label="Price Delta"
          type="number"
          step="0.01"
          value={priceDelta}
          onChange={(e) => setPriceDelta(e.target.value)}
          helperText="Extra charge (e.g. 2.50). Use 0 for no extra cost."
        />
        <Toggle
          checked={isDefault}
          onChange={setIsDefault}
          label="Default selection"
        />
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Group selection description
// ---------------------------------------------------------------------------

function selectionLabel(min: number, max: number): string {
  if (min === 0 && max === 1) return 'Optional, pick up to 1';
  if (min === 0) return `Optional, up to ${max}`;
  if (min === 1 && max === 1) return 'Required, pick 1';
  if (min === max) return `Required, pick exactly ${min}`;
  return `Required ${min}–${max}`;
}

// ---------------------------------------------------------------------------
// Group list (left panel)
// ---------------------------------------------------------------------------

function GroupList({
  groups,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: {
  groups: ModifierGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (group: ModifierGroup) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Modifier Groups</CardTitle>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-0">
        {groups.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No modifier groups"
            description="Create your first modifier group (e.g. Size, Toppings)."
            action={{ label: 'Add Group', onClick: onAdd }}
          />
        ) : (
          <ul className="divide-y divide-border">
            {groups.map((group) => (
              <li key={group.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(group.id)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(group.id);
                    }
                  }}
                  className={[
                    'w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-3 text-left transition-colors',
                    selectedId === group.id
                      ? 'bg-primary/10 border-l-2 border-primary'
                      : 'hover:bg-bg-muted',
                  ].join(' ')}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {group.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {selectionLabel(group.minSelections, group.maxSelections)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {group.minSelections > 0 && (
                      <Badge variant="warning" className="mr-1">
                        Required
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(group);
                      }}
                      className="p-2 sm:p-1 rounded text-text-tertiary hover:text-text hover:bg-bg-muted transition-colors"
                      aria-label={`Edit ${group.name}`}
                    >
                      <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      onConfirm={() => onDelete(group.id)}
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
// Option card
// ---------------------------------------------------------------------------

function OptionCard({
  option,
  onEdit,
  onDelete,
}: {
  option: ModifierOption;
  onEdit: (option: ModifierOption) => void;
  onDelete: (id: string) => void;
}) {
  const priceDeltaLabel =
    option.priceDelta === 0
      ? '$0.00'
      : formatPriceDelta(option.priceDelta);

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text truncate">
              {option.name}
            </p>
            {option.isDefault === 1 && (
              <Badge variant="info">Default</Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {priceDeltaLabel}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(option)}
            aria-label={`Edit ${option.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <ConfirmButton
            variant="ghost"
            size="sm"
            onConfirm={() => onDelete(option.id)}
            confirmText="Delete?"
          >
            Delete
          </ConfirmButton>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ModifierManager() {
  const { tenantSlug } = useTenant();
  const { toast } = useToast();

  // Data
  const groupsQuery = useModifierGroups(tenantSlug);
  const groups = groupsQuery.data ?? [];

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Auto-select first group if none selected
  const activeGroupId =
    selectedGroupId ?? (groups.length > 0 ? groups[0].id : null);

  const selectedGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const options = selectedGroup?.options ?? [];

  // Mutations
  const createGroup = useCreateModifierGroup(tenantSlug);
  const updateGroup = useUpdateModifierGroup(tenantSlug);
  const deleteGroup = useDeleteModifierGroup(tenantSlug);
  const createOption = useCreateModifierOption(tenantSlug);
  const updateOption = useUpdateModifierOption(tenantSlug);
  const deleteOption = useDeleteModifierOption(tenantSlug);

  // Dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null);
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(
    null,
  );

  // --- Group handlers ---

  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupDialogOpen(true);
  };

  const handleEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleGroupSubmit = (data: GroupFormData) => {
    const payload = {
      name: data.name,
      minSelections: parseInt(data.minSelections, 10) || 0,
      maxSelections: parseInt(data.maxSelections, 10) || 1,
    };

    if (editingGroup) {
      updateGroup.mutate(
        { id: editingGroup.id, ...payload },
        {
          onSuccess: () => {
            setGroupDialogOpen(false);
            toast('success', 'Modifier group updated');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to update modifier group');
          },
        },
      );
    } else {
      createGroup.mutate(payload, {
        onSuccess: () => {
          setGroupDialogOpen(false);
          toast('success', 'Modifier group created');
        },
        onError: (err: Error) => {
          toast('error', err.message || 'Failed to create modifier group');
        },
      });
    }
  };

  const handleDeleteGroup = (id: string) => {
    deleteGroup.mutate(id, {
      onSuccess: () => {
        if (selectedGroupId === id) {
          setSelectedGroupId(null);
        }
        toast('success', 'Modifier group deleted');
      },
      onError: (err: Error) => {
        toast('error', err.message || 'Failed to delete modifier group');
      },
    });
  };

  // --- Option handlers ---

  const handleAddOption = () => {
    setEditingOption(null);
    setOptionDialogOpen(true);
  };

  const handleEditOption = (option: ModifierOption) => {
    setEditingOption(option);
    setOptionDialogOpen(true);
  };

  const handleOptionSubmit = (data: OptionFormData) => {
    if (editingOption) {
      updateOption.mutate(
        {
          id: editingOption.id,
          name: data.name,
          priceDelta: parseFloat(data.priceDelta) || 0,
          isDefault: data.isDefault ? 1 : 0,
        },
        {
          onSuccess: () => {
            setOptionDialogOpen(false);
            toast('success', 'Option updated');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to update option');
          },
        },
      );
    } else if (activeGroupId) {
      createOption.mutate(
        {
          groupId: activeGroupId,
          name: data.name,
          priceDelta: parseFloat(data.priceDelta) || 0,
          isDefault: data.isDefault ? 1 : 0,
        },
        {
          onSuccess: () => {
            setOptionDialogOpen(false);
            toast('success', 'Option added');
          },
          onError: (err: Error) => {
            toast('error', err.message || 'Failed to add option');
          },
        },
      );
    }
  };

  const handleDeleteOption = (id: string) => {
    deleteOption.mutate(id, {
      onSuccess: () => {
        toast('success', 'Option deleted');
      },
      onError: (err: Error) => {
        toast('error', err.message || 'Failed to delete option');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text">Modifier Management</h1>
        <p className="text-sm text-text-secondary mt-1">
          Set default modifier groups and prices here. Individual items can override prices in Menu &rarr; item &rarr; Modifiers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:min-h-[60vh]">
        {/* Left panel: groups */}
        <div className="lg:col-span-1">
          <GroupList
            groups={groups}
            selectedId={activeGroupId}
            onSelect={setSelectedGroupId}
            onAdd={handleAddGroup}
            onEdit={handleEditGroup}
            onDelete={handleDeleteGroup}
          />
        </div>

        {/* Right panel: options for selected group */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedGroup
                  ? `${selectedGroup.name} Options`
                  : 'Options'}
              </CardTitle>
              {activeGroupId && (
                <Button size="sm" onClick={handleAddOption}>
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {!activeGroupId ? (
                <EmptyState
                  icon={Settings2}
                  title="No group selected"
                  description="Select a modifier group from the left panel to see its options, or create one first."
                />
              ) : options.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No options yet"
                  description="Add options to this modifier group."
                  action={{ label: 'Add Option', onClick: handleAddOption }}
                />
              ) : (
                <div className="space-y-3">
                  {options.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      onEdit={handleEditOption}
                      onDelete={handleDeleteOption}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Group dialog */}
      <GroupDialog
        key={editingGroup?.id ?? 'new-group'}
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        onSubmit={handleGroupSubmit}
        initial={
          editingGroup
            ? {
                name: editingGroup.name,
                minSelections: editingGroup.minSelections.toString(),
                maxSelections: editingGroup.maxSelections.toString(),
              }
            : undefined
        }
        loading={createGroup.isPending || updateGroup.isPending}
      />

      {/* Option dialog */}
      <OptionDialog
        key={editingOption?.id ?? 'new-option'}
        open={optionDialogOpen}
        onClose={() => setOptionDialogOpen(false)}
        onSubmit={handleOptionSubmit}
        initial={
          editingOption
            ? {
                name: editingOption.name,
                priceDelta: editingOption.priceDelta.toString(),
                isDefault: editingOption.isDefault === 1,
              }
            : undefined
        }
        loading={createOption.isPending || updateOption.isPending}
      />
    </div>
  );
}

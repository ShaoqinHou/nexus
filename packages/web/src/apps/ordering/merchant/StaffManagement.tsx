import { useState, useCallback } from 'react';
import { Users, Plus, Shield, UserCog, User } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
  Select,
  Badge,
  Toggle,
} from '@web/components/ui';
import { ConfirmButton, EmptyState } from '@web/components/patterns';
import { useTenant } from '@web/platform/tenant/TenantProvider';
import { useAuth } from '@web/platform/auth/AuthProvider';
import { useToast } from '@web/platform/ToastProvider';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from '../hooks/useStaff';
import type { StaffMember, CreateStaffInput } from '../hooks/useStaff';
import type { BadgeVariant } from '@web/components/ui';

// --- Role display helpers ---

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

const CREATE_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

function roleVariant(role: string): BadgeVariant {
  switch (role) {
    case 'owner':
      return 'error';
    case 'manager':
      return 'warning';
    case 'staff':
      return 'info';
    default:
      return 'default';
  }
}

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'owner':
      return <Shield className="h-4 w-4" />;
    case 'manager':
      return <UserCog className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
}

// --- Staff Card ---

interface StaffCardProps {
  member: StaffMember;
  currentUser: { id: string; role: string };
  tenantSlug: string;
}

function StaffCard({ member, currentUser, tenantSlug }: StaffCardProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateStaff(tenantSlug);
  const deleteMutation = useDeleteStaff(tenantSlug);

  const isOwner = member.role === 'owner';
  const isSelf = member.id === currentUser.id;
  const canModifyRole = currentUser.role === 'owner' && !isSelf && !isOwner;
  const canToggleActive = !isOwner && !isSelf && (
    currentUser.role === 'owner' ||
    (currentUser.role === 'manager' && member.role === 'staff')
  );
  const canDeactivate = canToggleActive && member.isActive === 1;

  const handleRoleChange = useCallback((newRole: string) => {
    updateMutation.mutate(
      { id: member.id, role: newRole as StaffMember['role'] },
      {
        onSuccess: () => toast('success', `Role updated to ${newRole}`),
        onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to update role'),
      },
    );
  }, [member.id, updateMutation, toast]);

  const handleToggleActive = useCallback((active: boolean) => {
    updateMutation.mutate(
      { id: member.id, isActive: active ? 1 : 0 },
      {
        onSuccess: () => toast('success', active ? 'Staff member reactivated' : 'Staff member deactivated'),
        onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to update status'),
      },
    );
  }, [member.id, updateMutation, toast]);

  const handleDeactivate = useCallback(() => {
    deleteMutation.mutate(member.id, {
      onSuccess: () => toast('success', 'Staff member deactivated'),
      onError: (err) => toast('error', err instanceof Error ? err.message : 'Failed to deactivate'),
    });
  }, [member.id, deleteMutation, toast]);

  return (
    <div
      className={[
        'flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border bg-bg-surface',
        member.isActive === 0 ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-full bg-bg-muted flex items-center justify-center shrink-0">
          <RoleIcon role={member.role} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text truncate">
              {member.name}
            </span>
            {isSelf && (
              <span className="text-xs text-text-tertiary">(you)</span>
            )}
          </div>
          <p className="text-xs text-text-secondary truncate">{member.email}</p>
        </div>
      </div>

      {/* Role + Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {canModifyRole ? (
          <Select
            options={ROLE_OPTIONS}
            value={member.role}
            onChange={handleRoleChange}
            className="!w-32"
          />
        ) : (
          <Badge variant={roleVariant(member.role)}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
        )}

        {canToggleActive && (
          <Toggle
            checked={member.isActive === 1}
            onChange={handleToggleActive}
            disabled={updateMutation.isPending}
          />
        )}

        {canDeactivate && (
          <ConfirmButton
            onConfirm={handleDeactivate}
            variant="destructive"
            size="sm"
            confirmText="Confirm?"
            disabled={deleteMutation.isPending}
          >
            Deactivate
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

// --- Add Staff Dialog ---

interface AddStaffDialogProps {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  currentUserRole: string;
}

function AddStaffDialog({ open, onClose, tenantSlug, currentUserRole }: AddStaffDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateStaff(tenantSlug);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Managers can only create staff-level users
  const availableRoles = currentUserRole === 'owner'
    ? CREATE_ROLE_OPTIONS
    : CREATE_ROLE_OPTIONS.filter((r) => r.value === 'staff');

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, password]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const input: CreateStaffInput = { name: name.trim(), email: email.trim(), password, role };
    createMutation.mutate(input, {
      onSuccess: () => {
        toast('success', 'Staff member created');
        setName('');
        setEmail('');
        setPassword('');
        setRole('staff');
        setErrors({});
        onClose();
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : 'Failed to create staff');
      },
    });
  }, [validate, name, email, password, role, createMutation, toast, onClose]);

  const handleClose = useCallback(() => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('staff');
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Staff Member"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={createMutation.isPending}
          >
            Add Staff
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          error={errors.name}
          placeholder="Staff member name"
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="email@example.com"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          error={errors.password}
          placeholder="Minimum 8 characters"
        />
        <Select
          label="Role"
          options={availableRoles}
          value={role}
          onChange={(val) => setRole(val as 'manager' | 'staff')}
        />
      </div>
    </Dialog>
  );
}

// --- Main Component ---

export function StaffManagement() {
  const { tenantSlug } = useTenant();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: staffList, isLoading, error } = useStaff(tenantSlug);

  const currentUserRole = user?.role ?? 'staff';
  const canAddStaff = currentUserRole === 'owner' || currentUserRole === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <EmptyState
          icon={Users}
          title="Unable to load staff"
          description="Something went wrong loading the staff list. Please try again."
          action={{
            label: 'Retry',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  // Sort: owners first, then managers, then staff. Active before inactive.
  const sortedStaff = [...(staffList ?? [])].sort((a, b) => {
    // Active first
    if (a.isActive !== b.isActive) return b.isActive - a.isActive;
    // Role hierarchy
    const roleOrder: Record<string, number> = { owner: 0, manager: 1, staff: 2 };
    const ra = roleOrder[a.role] ?? 3;
    const rb = roleOrder[b.role] ?? 3;
    if (ra !== rb) return ra - rb;
    // Alphabetical
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-text">Staff</h1>
            <p className="text-sm text-text-secondary">
              Manage your team members and their roles
            </p>
          </div>
        </div>
        {canAddStaff && (
          <Button variant="primary" size="md" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Staff list */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({sortedStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStaff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff members"
              description="Add your first team member to get started."
            />
          ) : (
            <div className="space-y-2">
              {sortedStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  currentUser={{ id: user?.id ?? '', role: currentUserRole }}
                  tenantSlug={tenantSlug}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Staff Dialog */}
      <AddStaffDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        tenantSlug={tenantSlug}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}

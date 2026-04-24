import { useState, useCallback } from 'react';
import { Users, Plus, Shield, UserCog, User, KeyRound } from 'lucide-react';
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
import { useT } from '@web/lib/i18n';
import {
  useStaff,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useResetStaffPassword,
} from '../hooks/useStaff';
import type { StaffMember, CreateStaffInput } from '../hooks/useStaff';
import type { BadgeVariant } from '@web/components/ui';

// --- Role display helpers ---

function useRoleOptions() {
  const t = useT();
  return [
    { value: 'owner', label: t('Owner') },
    { value: 'manager', label: t('Manager') },
    { value: 'staff', label: t('Staff') },
  ];
}

function useCreateRoleOptions() {
  const t = useT();
  return [
    { value: 'manager', label: t('Manager') },
    { value: 'staff', label: t('Staff') },
  ];
}

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
  onResetPassword: (member: StaffMember) => void;
}

function StaffCard({ member, currentUser, tenantSlug, onResetPassword }: StaffCardProps) {
  const t = useT();
  const { toast } = useToast();
  const roleOptions = useRoleOptions();
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
  const canResetPassword = !isSelf && !isOwner && (
    currentUser.role === 'owner' ||
    (currentUser.role === 'manager' && member.role === 'staff')
  );

  const handleRoleChange = useCallback((newRole: string) => {
    updateMutation.mutate(
      { id: member.id, role: newRole as StaffMember['role'] },
      {
        onSuccess: () => toast('success', `${t('Role updated to')} ${newRole}`),
        onError: (err) => toast('error', err instanceof Error ? err.message : t('Failed to update role')),
      },
    );
  }, [member.id, updateMutation, toast, t]);

  const handleToggleActive = useCallback((active: boolean) => {
    updateMutation.mutate(
      { id: member.id, isActive: active ? 1 : 0 },
      {
        onSuccess: () => toast('success', active ? t('Staff member reactivated') : t('Staff member deactivated')),
        onError: (err) => toast('error', err instanceof Error ? err.message : t('Failed to update status')),
      },
    );
  }, [member.id, updateMutation, toast, t]);

  const handleDeactivate = useCallback(() => {
    deleteMutation.mutate(member.id, {
      onSuccess: () => toast('success', t('Staff member deactivated')),
      onError: (err) => toast('error', err instanceof Error ? err.message : t('Failed to deactivate')),
    });
  }, [member.id, deleteMutation, toast, t]);

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
              <span className="text-xs text-text-tertiary">({t('you')})</span>
            )}
          </div>
          <p className="text-xs text-text-secondary truncate">{member.email}</p>
        </div>
      </div>

      {/* Role + Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {canModifyRole ? (
          <Select
            options={roleOptions}
            value={member.role}
            onChange={handleRoleChange}
            className="!w-32"
          />
        ) : (
          <Badge variant={roleVariant(member.role)}>
            {t(member.role.charAt(0).toUpperCase() + member.role.slice(1))}
          </Badge>
        )}

        {canToggleActive && (
          <div className="min-h-[var(--hit-sm)] flex items-center">
            <Toggle
              checked={member.isActive === 1}
              onChange={handleToggleActive}
              disabled={updateMutation.isPending}
            />
          </div>
        )}

        {canResetPassword && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onResetPassword(member)}
            aria-label={`${t('Reset password for')} ${member.name}`}
            className="min-h-[var(--hit-sm)]"
          >
            <KeyRound className="h-3.5 w-3.5" />
            {t('Reset PW')}
          </Button>
        )}

        {canDeactivate && (
          <ConfirmButton
            onConfirm={handleDeactivate}
            variant="destructive"
            size="sm"
            confirmText={t('Confirm?')}
            disabled={deleteMutation.isPending}
            className="min-h-[var(--hit-sm)]"
          >
            {t('Deactivate')}
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
  const t = useT();
  const { toast } = useToast();
  const createMutation = useCreateStaff(tenantSlug);
  const createRoleOptions = useCreateRoleOptions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('staff');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Managers can only create staff-level users
  const availableRoles = currentUserRole === 'owner'
    ? createRoleOptions
    : createRoleOptions.filter((r) => r.value === 'staff');

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('Name is required');
    if (!email.trim()) newErrors.email = t('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = t('Invalid email');
    if (!password) newErrors.password = t('Password is required');
    else if (password.length < 8) newErrors.password = t('Password must be at least 8 characters');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, password, t]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const input: CreateStaffInput = { name: name.trim(), email: email.trim(), password, role };
    createMutation.mutate(input, {
      onSuccess: () => {
        toast('success', t('Staff member created'));
        setName('');
        setEmail('');
        setPassword('');
        setRole('staff');
        setErrors({});
        onClose();
      },
      onError: (err) => {
        toast('error', err instanceof Error ? err.message : t('Failed to create staff'));
      },
    });
  }, [validate, name, email, password, role, createMutation, toast, onClose, t]);

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
      title={t('Add Staff Member')}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={handleClose} className="min-h-[var(--hit-md)]">
            {t('Cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={createMutation.isPending}
            className="min-h-[var(--hit-md)]"
          >
            {t('Add Staff')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label={t('Name')}
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          error={errors.name}
          placeholder={t('Staff member name')}
        />
        <Input
          label={t('Email')}
          type="email"
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="email@example.com"
        />
        <Input
          label={t('Password')}
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          error={errors.password}
          placeholder={t('Minimum 8 characters')}
        />
        <Select
          label={t('Role')}
          options={availableRoles}
          value={role}
          onChange={(val) => setRole(val as 'manager' | 'staff')}
        />
      </div>
    </Dialog>
  );
}

// --- Reset Password Dialog ---

interface ResetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  tenantSlug: string;
  member: StaffMember | null;
}

function ResetPasswordDialog({ open, onClose, tenantSlug, member }: ResetPasswordDialogProps) {
  const t = useT();
  const { toast } = useToast();
  const resetMutation = useResetStaffPassword(tenantSlug);

  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(() => {
    if (newPassword.length < 8) {
      setError(t('Password must be at least 8 characters'));
      return;
    }
    if (!member) return;

    resetMutation.mutate(
      { id: member.id, newPassword },
      {
        onSuccess: () => {
          toast('success', `${t('Password reset for')} ${member.name}`);
          setNewPassword('');
          setError('');
          onClose();
        },
        onError: (err) => {
          toast('error', err instanceof Error ? err.message : t('Failed to reset password'));
        },
      },
    );
  }, [newPassword, member, resetMutation, toast, onClose, t]);

  const handleClose = useCallback(() => {
    setNewPassword('');
    setError('');
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={member ? `${t('Reset Password')}: ${member.name}` : t('Reset Password')}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={handleClose} className="min-h-[var(--hit-md)]">
            {t('Cancel')}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            loading={resetMutation.isPending}
            disabled={!newPassword.trim()}
            className="min-h-[var(--hit-md)]"
          >
            {t('Reset Password')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          {t('Enter a new password for')} {member?.name ?? t('this staff member')}{t('. They will need to use this password on their next login.')}
        </p>
        <Input
          label={t('New Password')}
          type="password"
          value={newPassword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
          error={error}
          placeholder={t('Minimum 8 characters')}
          autoFocus
        />
      </div>
    </Dialog>
  );
}

// --- Main Component ---

export function StaffManagement() {
  const t = useT();
  const { tenantSlug } = useTenant();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<StaffMember | null>(null);

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
          title={t('Unable to load staff')}
          description={t('Something went wrong loading the staff list. Please try again.')}
          action={{
            label: t('Retry'),
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
            <h1 className="text-xl font-bold text-text">{t('Staff')}</h1>
            <p className="text-sm text-text-secondary">
              {t('Manage your team members and their roles')}
            </p>
          </div>
        </div>
        {canAddStaff && (
          <Button variant="primary" size="md" onClick={() => setDialogOpen(true)} className="min-h-[var(--hit-md)]">
            <Plus className="h-4 w-4" />
            {t('Add Staff')}
          </Button>
        )}
      </div>

      {/* Staff list */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Team Members')} ({sortedStaff.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedStaff.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('No staff members')}
              description={t('Add your first team member to get started.')}
            />
          ) : (
            <div className="space-y-2">
              {sortedStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  currentUser={{ id: user?.id ?? '', role: currentUserRole }}
                  tenantSlug={tenantSlug}
                  onResetPassword={setResetPasswordTarget}
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

      {/* Reset Password Dialog */}
      <ResetPasswordDialog
        open={!!resetPasswordTarget}
        onClose={() => setResetPasswordTarget(null)}
        tenantSlug={tenantSlug}
        member={resetPasswordTarget}
      />
    </div>
  );
}

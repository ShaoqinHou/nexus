import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';
import { orderingKeys } from './keys';

export interface StaffMember {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'staff';
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
  role: 'manager' | 'staff';
}

export interface UpdateStaffInput {
  id: string;
  name?: string;
  role?: 'owner' | 'manager' | 'staff';
  isActive?: number;
}

const staffKeys = {
  all: [...orderingKeys.all, 'staff'] as const,
  list: (tenantSlug: string) => [...staffKeys.all, tenantSlug] as const,
};

export function useStaff(tenantSlug: string) {
  return useQuery({
    queryKey: staffKeys.list(tenantSlug),
    queryFn: () =>
      apiClient.get<{ data: StaffMember[] }>(
        `/t/${tenantSlug}/staff`,
      ),
    select: (res) => res.data,
  });
}

export function useCreateStaff(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateStaffInput) =>
      apiClient.post<{ data: StaffMember }>(
        `/t/${tenantSlug}/staff`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list(tenantSlug) });
    },
  });
}

export function useUpdateStaff(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: UpdateStaffInput) =>
      apiClient.put<{ data: StaffMember }>(
        `/t/${tenantSlug}/staff/${id}`,
        body,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list(tenantSlug) });
    },
  });
}

export function useDeleteStaff(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/t/${tenantSlug}/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list(tenantSlug) });
    },
  });
}

export function useResetStaffPassword(tenantSlug: string) {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      apiClient.put<{ success: boolean; message: string }>(
        `/t/${tenantSlug}/staff/${id}/reset-password`,
        { newPassword },
      ),
  });
}

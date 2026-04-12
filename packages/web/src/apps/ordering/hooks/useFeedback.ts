import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@web/lib/api';

export function useSubmitFeedback(tenantSlug: string) {
  return useMutation({
    mutationFn: (data: { orderId: string; tableNumber: string; rating: number; comment?: string }) =>
      apiClient.post(`/order/${tenantSlug}/ordering/feedback`, data),
  });
}

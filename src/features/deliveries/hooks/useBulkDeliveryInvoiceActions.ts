import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDeliveryInvoice } from '@/features/deliveries/services/deliveryInvoices.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useBulkDeleteDeliveryInvoices() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => deleteDeliveryInvoice(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryInvoices', activeStoreId] });
    },
  });
}

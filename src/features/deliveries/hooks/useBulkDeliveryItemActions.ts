import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDeliveryItem } from '@/features/deliveries/services/deliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useBulkDeleteDeliveryItems() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => deleteDeliveryItem(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryItems', activeStoreId] });
    },
  });
}

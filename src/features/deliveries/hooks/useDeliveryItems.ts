import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryItems } from '@/features/deliveries/services/deliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useDeliveryItems() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['deliveryItems', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchDeliveryItems(activeStoreId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}

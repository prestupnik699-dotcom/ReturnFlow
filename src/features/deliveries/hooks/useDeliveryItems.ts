import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryItems } from '@/features/deliveries/services/deliveries.service';
import { fetchPendingDeliveries } from '@/features/deliveries/services/offlineDeliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useDeliveryItems() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['deliveryItems', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');

      const pending = await fetchPendingDeliveries(activeStoreId);

      try {
        const result = await fetchDeliveryItems(activeStoreId);
        if (!result.success) throw new Error(result.error.message);
        return [...pending, ...result.data];
      } catch (error) {
        // Offline or network failure: still show whatever is queued
        // locally instead of blanking the screen (same rule as returns,
        // D-031) — only surface the error if there's truly nothing to show.
        if (pending.length > 0) return pending;
        throw error;
      }
    },
    enabled: !!activeStoreId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryCountsByStore } from '@/features/deliveries/services/deliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useStoreDeliveryCounts() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['storeDeliveryCounts', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchDeliveryCountsByStore(activeOrganizationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchDeliveryCountsBySupplier } from '@/features/deliveries/services/deliveries.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useSupplierDeliveryCounts() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['supplierDeliveryCounts', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchDeliveryCountsBySupplier(activeOrganizationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

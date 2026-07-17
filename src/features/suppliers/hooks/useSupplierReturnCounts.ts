import { useQuery } from '@tanstack/react-query';
import { fetchReturnCountsBySupplier } from '@/features/returns/services/returns.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useSupplierReturnCounts() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['supplierReturnCounts', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchReturnCountsBySupplier(activeOrganizationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

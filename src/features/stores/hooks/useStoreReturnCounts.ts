import { useQuery } from '@tanstack/react-query';
import { fetchReturnCountsByStore } from '@/features/returns/services/returns.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useStoreReturnCounts() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['storeReturnCounts', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await fetchReturnCountsByStore(activeOrganizationId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

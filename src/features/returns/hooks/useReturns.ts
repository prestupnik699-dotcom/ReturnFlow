import { useQuery } from '@tanstack/react-query';
import { fetchReturns, type ReturnStatus } from '@/features/returns/services/returns.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useReturns(statusFilter?: ReturnStatus[]) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['returns', activeStoreId, statusFilter],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchReturns({ storeId: activeStoreId, statusFilter });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}

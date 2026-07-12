import { useQuery } from '@tanstack/react-query';
import { fetchReturns, type ReturnStatus } from '@/features/returns/services/returns.service';
import { fetchPendingReturns } from '@/features/returns/services/offlineReturns.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useReturns(statusFilter?: ReturnStatus[]) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['returns', activeStoreId, statusFilter],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');

      const [result, pending] = await Promise.all([
        fetchReturns({ storeId: activeStoreId, statusFilter }),
        fetchPendingReturns(activeStoreId),
      ]);

      if (!result.success) throw new Error(result.error.message);

      return [...pending, ...result.data];
    },
    enabled: !!activeStoreId,
  });
}

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

      const pending = await fetchPendingReturns(activeStoreId);

      try {
        const result = await fetchReturns({ storeId: activeStoreId, statusFilter });
        if (!result.success) throw new Error(result.error.message);
        return [...pending, ...result.data];
      } catch (error) {
        // Offline or network failure: still show whatever is queued locally
        // instead of blanking the whole screen (D-031). Only surface the
        // error if there's truly nothing to show at all.
        if (pending.length > 0) return pending;
        throw error;
      }
    },
    enabled: !!activeStoreId,
  });
}

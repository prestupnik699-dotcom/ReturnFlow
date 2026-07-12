import { useQuery } from '@tanstack/react-query';
import { fetchReturnStats } from '@/features/statistics/services/statistics.service';
import { useMembershipStore } from '@/stores/membership.store';

export type StatsPeriod = 'today' | 'week' | 'month' | 'all';

function periodToSinceIso(period: StatsPeriod): string | null {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start.toISOString();
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return start.toISOString();
  }
  return null;
}

export function useReturnStats(period: StatsPeriod) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['returnStats', activeStoreId, period],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchReturnStats(activeStoreId, periodToSinceIso(period));
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}

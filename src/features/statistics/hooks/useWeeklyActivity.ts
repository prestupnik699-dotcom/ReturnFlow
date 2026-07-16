import { useQuery } from '@tanstack/react-query';
import { fetchWeeklyActivity } from '@/features/statistics/services/statistics.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useWeeklyActivity() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);

  return useQuery({
    queryKey: ['weeklyActivity', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) throw new Error('No active store');
      const result = await fetchWeeklyActivity(activeStoreId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeStoreId,
  });
}

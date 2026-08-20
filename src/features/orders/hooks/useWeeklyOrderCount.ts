import { useQuery } from '@tanstack/react-query';
import { fetchWeeklyOrderSummary } from '@/features/orders/services/orders.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useWeeklyOrderCount() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['weeklyOrderSummary', activeOrganizationId],
    queryFn: async () => {
      const result = await fetchWeeklyOrderSummary(activeOrganizationId!);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

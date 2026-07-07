import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '@/features/stores/services/stores.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useStores() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['stores', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await fetchStores(activeOrganizationId);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

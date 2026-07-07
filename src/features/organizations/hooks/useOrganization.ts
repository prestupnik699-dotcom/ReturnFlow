import { useQuery } from '@tanstack/react-query';
import { fetchOrganization } from '@/features/organizations/services/organizations.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useOrganization() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['organization', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await fetchOrganization(activeOrganizationId);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

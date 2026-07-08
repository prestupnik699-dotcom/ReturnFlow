import { useQuery } from '@tanstack/react-query';
import { fetchTeamMembers } from '@/features/users/services/team.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useTeamMembers() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useQuery({
    queryKey: ['team', activeOrganizationId],
    queryFn: async () => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await fetchTeamMembers(activeOrganizationId);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    enabled: !!activeOrganizationId,
  });
}

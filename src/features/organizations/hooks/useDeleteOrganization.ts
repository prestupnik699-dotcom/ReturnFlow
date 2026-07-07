import { useMutation } from '@tanstack/react-query';
import { deleteOrganization } from '@/features/organizations/services/organizations.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { fetchMemberships } from '@/features/auth/services/membership.service';

export function useDeleteOrganization() {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useMutation({
    mutationFn: async () => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await deleteOrganization(activeOrganizationId);

      if (!result.success) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: async () => {
      if (!profile) return;

      const memberships = await fetchMemberships(profile.id);
      useMembershipStore.getState().setMemberships(memberships);

      const first = memberships[0];
      useMembershipStore
        .getState()
        .setActiveContext(first?.organizationId ?? null, first?.storeId ?? null);
    },
  });
}

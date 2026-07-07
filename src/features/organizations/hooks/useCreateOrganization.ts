import { useMutation } from '@tanstack/react-query';
import { createOrganization } from '@/features/organizations/services/organizations.service';
import { useAuthStore } from '@/stores/auth.store';
import { fetchMemberships } from '@/features/auth/services/membership.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useCreateOrganization() {
  const profile = useAuthStore((state) => state.profile);

  return useMutation({
    mutationFn: async (input: { name: string; defaultLanguage: string }) => {
      if (!profile) {
        throw new Error('No active profile');
      }

      const result = await createOrganization(input, profile.id);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
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

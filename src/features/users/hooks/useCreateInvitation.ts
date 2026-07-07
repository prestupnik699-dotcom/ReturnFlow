import { useMutation } from '@tanstack/react-query';
import { createInvitation } from '@/features/users/services/invitations.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import type { MembershipRole } from '@/features/auth/services/membership.service';

export function useCreateInvitation() {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);

  return useMutation({
    mutationFn: async (role: MembershipRole) => {
      if (!profile || !activeOrganizationId) {
        throw new Error('No active profile or organization');
      }

      const result = await createInvitation(
        { organizationId: activeOrganizationId, role },
        profile.id,
      );

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
  });
}

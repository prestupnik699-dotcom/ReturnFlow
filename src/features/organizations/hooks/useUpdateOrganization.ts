import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrganization } from '@/features/organizations/services/organizations.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useUpdateOrganization() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; defaultLanguage: string }) => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await updateOrganization(activeOrganizationId, input);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['organization', activeOrganizationId], data);
    },
  });
}

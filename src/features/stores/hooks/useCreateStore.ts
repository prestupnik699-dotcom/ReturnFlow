import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStore } from '@/features/stores/services/stores.service';
import { useMembershipStore } from '@/stores/membership.store';
import type { CreateStoreFormValues } from '@/features/stores/validators/create-store.schema';

export function useCreateStore() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStoreFormValues) => {
      if (!activeOrganizationId) {
        throw new Error('No active organization');
      }

      const result = await createStore({ organizationId: activeOrganizationId, ...input });

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', activeOrganizationId] });
    },
  });
}

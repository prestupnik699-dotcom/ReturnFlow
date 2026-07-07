import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStore } from '@/features/stores/services/stores.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useDeleteStore() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeId: string) => {
      const result = await deleteStore(storeId);

      if (!result.success) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', activeOrganizationId] });
    },
  });
}

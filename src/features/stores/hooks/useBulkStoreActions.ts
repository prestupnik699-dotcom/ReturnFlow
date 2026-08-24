import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStore } from '@/features/stores/services/stores.service';
import { useMembershipStore } from '@/stores/membership.store';

export function useBulkDeleteStores() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => deleteStore(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', activeOrganizationId] });
    },
  });
}

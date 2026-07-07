import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStore } from '@/features/stores/services/stores.service';
import { useMembershipStore } from '@/stores/membership.store';
import type { CreateStoreFormValues } from '@/features/stores/validators/create-store.schema';

export function useUpdateStore() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, input }: { storeId: string; input: CreateStoreFormValues }) => {
      const result = await updateStore(storeId, input);

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

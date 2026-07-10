import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateReturn } from '@/features/returns/services/returns.service';
import { useMembershipStore } from '@/stores/membership.store';
import type { CreateReturnFormValues } from '@/features/returns/validators/create-return.schema';

export function useUpdateReturn(returnId: string) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateReturnFormValues) => {
      const result = await updateReturn(returnId, { ...values, quantity: Number(values.quantity) });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
    },
  });
}

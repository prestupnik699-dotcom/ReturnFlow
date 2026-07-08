import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReturn } from '@/features/returns/services/returns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import type { CreateReturnFormValues } from '@/features/returns/validators/create-return.schema';

export function useCreateReturn() {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateReturnFormValues) => {
      if (!profile || !activeOrganizationId || !activeStoreId) {
        throw new Error('Missing active organization, store, or profile');
      }

      const result = await createReturn({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: values.supplierId,
        createdBy: profile.id,
        title: values.title,
        quantity: Number(values.quantity),
        reason: values.reason,
        priority: values.priority,
      });

      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
    },
  });
}

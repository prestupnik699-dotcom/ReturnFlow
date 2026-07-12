import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReturn } from '@/features/returns/services/returns.service';
import { enqueueCreateReturn } from '@/features/returns/services/offlineReturns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { CreateReturnFormValues } from '@/features/returns/validators/create-return.schema';

type SupplierLookup = { id: string; name: string };

export function useCreateReturn(suppliers: SupplierLookup[] = []) {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const isOnline = useNetworkStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateReturnFormValues) => {
      if (!profile || !activeOrganizationId || !activeStoreId) {
        throw new Error('Missing active organization, store, or profile');
      }

      const basePayload = {
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId: values.supplierId,
        createdBy: profile.id,
        title: values.title,
        quantity: Number(values.quantity),
        reason: values.reason,
        priority: values.priority,
      };

      if (!isOnline) {
        const supplierName = suppliers.find((s) => s.id === values.supplierId)?.name ?? '';
        await enqueueCreateReturn({ ...basePayload, supplierName });
        return null;
      }

      const result = await createReturn(basePayload);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
    },
  });
}

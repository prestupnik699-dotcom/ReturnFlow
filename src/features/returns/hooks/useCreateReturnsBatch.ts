import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReturn } from '@/features/returns/services/returns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';

type BatchLine = { title: string; quantity: number; barcode: string };

type BatchInput = { supplierId: string; isExchange: boolean; lines: BatchLine[] };

export function useCreateReturnsBatch() {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, isExchange, lines }: BatchInput) => {
      if (!profile || !activeOrganizationId || !activeStoreId) {
        throw new Error('Missing active organization, store, or profile');
      }

      const results = await Promise.all(
        lines.map((line) =>
          createReturn({
            organizationId: activeOrganizationId,
            storeId: activeStoreId,
            supplierId,
            createdBy: profile.id,
            title: line.title,
            quantity: line.quantity,
            reason: '',
            priority: 'normal',
            barcode: line.barcode,
            isExchange,
          }),
        ),
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        throw new Error(`${failed.length} из ${lines.length} не удалось сохранить`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
    },
  });
}

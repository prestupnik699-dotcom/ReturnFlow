import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createDeliveryItem } from '@/features/deliveries/services/deliveries.service';
import { enqueueCreateDelivery } from '@/features/deliveries/services/offlineDeliveries.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

type BatchLine = { title: string; quantity: number; barcode: string };

type BatchInput = { supplierId: string; supplierName: string; lines: BatchLine[] };

export function useCreateDeliveriesBatch() {
  const profile = useAuthStore((state) => state.profile);
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const isOnline = useNetworkStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ supplierId, supplierName, lines }: BatchInput) => {
      if (!profile || !activeOrganizationId || !activeStoreId) {
        throw new Error('Missing active organization, store, or profile');
      }

      if (!isOnline) {
        // Same one-queued-operation-per-row shape as single return
        // creation, just repeated for each scanned line — keeps
        // fetchPendingDeliveries' merge logic uniform regardless of
        // whether an item was created via the single form or a batch.
        await Promise.all(
          lines.map((line) =>
            enqueueCreateDelivery({
              organizationId: activeOrganizationId,
              storeId: activeStoreId,
              supplierId,
              supplierName,
              createdBy: profile.id,
              title: line.title,
              quantity: line.quantity,
              barcode: line.barcode,
            }),
          ),
        );
        return;
      }

      const results = await Promise.all(
        lines.map((line) =>
          createDeliveryItem({
            organizationId: activeOrganizationId,
            storeId: activeStoreId,
            supplierId,
            createdBy: profile.id,
            title: line.title,
            quantity: line.quantity,
            barcode: line.barcode,
          }),
        ),
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        throw new Error(`${failed.length} из ${lines.length} не удалось сохранить`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryItems', activeStoreId] });
      queryClient.invalidateQueries({ queryKey: ['deliveryCounts', activeOrganizationId] });
    },
  });
}

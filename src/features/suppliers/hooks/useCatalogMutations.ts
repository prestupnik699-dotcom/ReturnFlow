import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  placeCatalogOrder,
  type OrderLine,
  type CatalogItem,
} from '@/features/suppliers/services/catalog.service';
import {
  enqueueCreateCatalogItem,
  enqueuePlaceOrder,
} from '@/features/orders/services/offlineOrders.service';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';

function useInvalidateCatalog(supplierId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['supplierCatalog', supplierId] });
}

type CatalogItemFormValues = {
  name: string;
  defaultPrice: number | null;
  barcode: string | null;
};

export function useCreateCatalogItem(supplierId: string) {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const profile = useAuthStore((state) => state.profile);
  const isConnected = useNetworkStatus();
  const invalidate = useInvalidateCatalog(supplierId);

  return useMutation({
    mutationFn: async (values: CatalogItemFormValues): Promise<CatalogItem | null> => {
      if (!activeOrganizationId || !profile) throw new Error('No active organization');

      const input = {
        organizationId: activeOrganizationId,
        supplierId,
        createdBy: profile.id,
        name: values.name,
        defaultPrice: values.defaultPrice,
        barcode: values.barcode,
      };

      // Offline: queue it and return null instead of a real item — the
      // catalog list picks the queued entry up on its own via
      // fetchPendingCatalogItems, so callers that need the created row
      // back (like scan-to-add, which opens it for editing) simply won't
      // have one to open until sync completes, which is the correct
      // behavior rather than fabricating a fake id that would break once
      // the real sync happens.
      if (!isConnected) {
        await enqueueCreateCatalogItem(input);
        return null;
      }

      const result = await createCatalogItem(input);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateCatalogItem(supplierId: string, itemId: string) {
  const invalidate = useInvalidateCatalog(supplierId);

  return useMutation({
    mutationFn: async (values: CatalogItemFormValues) => {
      const result = await updateCatalogItem(itemId, values);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteCatalogItem(supplierId: string) {
  const invalidate = useInvalidateCatalog(supplierId);

  return useMutation({
    mutationFn: async (itemId: string) => {
      const result = await deleteCatalogItem(itemId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function usePlaceCatalogOrder(supplierId: string) {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const profile = useAuthStore((state) => state.profile);
  const isConnected = useNetworkStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lines: OrderLine[]) => {
      if (!activeOrganizationId || !activeStoreId || !profile) {
        throw new Error('No active store');
      }

      const input = {
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId,
        createdBy: profile.id,
        lines,
      };

      // Offline: the order is queued and will be written to
      // catalog_order_items once connectivity returns — history for this
      // order simply won't show up until then, same tradeoff as offline
      // returns.
      if (!isConnected) {
        await enqueuePlaceOrder(input);
        return;
      }

      const result = await placeCatalogOrder(input);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['supplierOrderHistory', supplierId] }),
  });
}

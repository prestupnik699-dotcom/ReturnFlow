import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  placeCatalogOrder,
  type OrderLine,
} from '@/features/suppliers/services/catalog.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';

function useInvalidateCatalog(supplierId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['supplierCatalog', supplierId] });
}

type CatalogItemFormValues = {
  name: string;
  defaultPrice: number | null;
};

export function useCreateCatalogItem(supplierId: string) {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const profile = useAuthStore((state) => state.profile);
  const invalidate = useInvalidateCatalog(supplierId);

  return useMutation({
    mutationFn: async (values: CatalogItemFormValues) => {
      if (!activeOrganizationId || !profile) throw new Error('No active organization');
      const result = await createCatalogItem({
        organizationId: activeOrganizationId,
        supplierId,
        createdBy: profile.id,
        name: values.name,
        defaultPrice: values.defaultPrice,
      });
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lines: OrderLine[]) => {
      if (!activeOrganizationId || !activeStoreId || !profile) {
        throw new Error('No active store');
      }
      const result = await placeCatalogOrder({
        organizationId: activeOrganizationId,
        storeId: activeStoreId,
        supplierId,
        createdBy: profile.id,
        lines,
      });
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['supplierOrderHistory', supplierId] }),
  });
}

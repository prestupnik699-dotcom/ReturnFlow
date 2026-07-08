import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toggleSupplierFavorite,
} from '@/features/suppliers/services/suppliers.service';
import { useMembershipStore } from '@/stores/membership.store';
import type { CreateSupplierFormValues } from '@/features/suppliers/validators/create-supplier.schema';

function useInvalidateSuppliers() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['suppliers', activeOrganizationId] });
}

export function useCreateSupplier() {
  const activeOrganizationId = useMembershipStore((state) => state.activeOrganizationId);
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: async (input: CreateSupplierFormValues) => {
      if (!activeOrganizationId) throw new Error('No active organization');
      const result = await createSupplier({ organizationId: activeOrganizationId, ...input });
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateSupplier() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: async ({
      supplierId,
      input,
    }: {
      supplierId: string;
      input: CreateSupplierFormValues;
    }) => {
      const result = await updateSupplier(supplierId, input);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSupplier() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      const result = await deleteSupplier(supplierId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useToggleSupplierFavorite() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: async ({ supplierId, favorite }: { supplierId: string; favorite: boolean }) => {
      const result = await toggleSupplierFavorite(supplierId, favorite);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

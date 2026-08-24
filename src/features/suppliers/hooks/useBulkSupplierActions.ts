import { useMutation } from '@tanstack/react-query';
import { deleteSupplier } from '@/features/suppliers/services/suppliers.service';
import { useInvalidateSuppliers } from '@/features/suppliers/hooks/useSupplierMutations';

export function useBulkDeleteSuppliers() {
  const invalidate = useInvalidateSuppliers();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => deleteSupplier(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: invalidate,
  });
}

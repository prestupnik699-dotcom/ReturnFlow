import { useQuery } from '@tanstack/react-query';
import { fetchSupplierCatalog } from '@/features/suppliers/services/catalog.service';

export function useSupplierCatalog(supplierId: string) {
  return useQuery({
    queryKey: ['supplierCatalog', supplierId],
    queryFn: async () => {
      const result = await fetchSupplierCatalog(supplierId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!supplierId,
  });
}

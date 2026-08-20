import { useQuery } from '@tanstack/react-query';
import { fetchSupplierOrderHistory } from '@/features/suppliers/services/catalog.service';

export function useCatalogOrderHistory(supplierId: string) {
  return useQuery({
    queryKey: ['supplierOrderHistory', supplierId],
    queryFn: async () => {
      const result = await fetchSupplierOrderHistory(supplierId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!supplierId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchSupplierCatalog } from '@/features/suppliers/services/catalog.service';
import { fetchPendingCatalogItems } from '@/features/orders/services/offlineOrders.service';

export function useSupplierCatalog(supplierId: string) {
  return useQuery({
    queryKey: ['supplierCatalog', supplierId],
    queryFn: async () => {
      const [result, pending] = await Promise.all([
        fetchSupplierCatalog(supplierId),
        fetchPendingCatalogItems(supplierId),
      ]);
      if (!result.success) throw new Error(result.error.message);
      // Pending items appear first so a just-added-while-offline product
      // is immediately visible at the top rather than buried in an
      // alphabetically sorted list, making it obvious it's new.
      return [...pending, ...result.data];
    },
    enabled: !!supplierId,
  });
}

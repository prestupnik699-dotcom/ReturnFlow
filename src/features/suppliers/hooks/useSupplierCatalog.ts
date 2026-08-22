import { useQuery } from '@tanstack/react-query';
import {
  fetchSupplierCatalog,
  type CatalogItem,
} from '@/features/suppliers/services/catalog.service';
import { fetchPendingCatalogItems } from '@/features/orders/services/offlineOrders.service';

export function useSupplierCatalog(supplierId: string) {
  return useQuery({
    queryKey: ['supplierCatalog', supplierId],
    queryFn: async () => {
      // Pending items always come from local SQLite and must never be
      // lost just because the network call failed — offline is exactly
      // the situation where the person most needs to see them. Only the
      // server fetch is allowed to fail silently (falling back to an
      // empty list); a failed pending-items read is a real local bug and
      // should surface normally.
      const pending = await fetchPendingCatalogItems(supplierId);
      let serverItems: CatalogItem[] = [];

      try {
        const result = await fetchSupplierCatalog(supplierId);
        if (result.success) {
          serverItems = result.data;
        }
      } catch {
        // No network — serverItems stays empty, pending items still show.
      }

      return [...pending, ...serverItems];
    },
    enabled: !!supplierId,
  });
}

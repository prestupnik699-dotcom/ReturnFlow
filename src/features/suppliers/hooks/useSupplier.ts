import { useQuery } from '@tanstack/react-query';
import { fetchSupplierById } from '@/features/suppliers/services/suppliers.service';

export function useSupplier(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: async () => {
      if (!supplierId) throw new Error('No supplier id');
      const result = await fetchSupplierById(supplierId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!supplierId,
  });
}

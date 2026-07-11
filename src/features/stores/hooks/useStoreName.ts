import { useQuery } from '@tanstack/react-query';
import { fetchStoreName } from '@/features/stores/services/stores.service';

export function useStoreName(storeId: string | null) {
  return useQuery({
    queryKey: ['storeName', storeId],
    queryFn: async () => {
      if (!storeId) throw new Error('No store id');
      const result = await fetchStoreName(storeId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!storeId,
  });
}

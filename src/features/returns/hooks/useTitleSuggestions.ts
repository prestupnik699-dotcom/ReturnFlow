import { useQuery } from '@tanstack/react-query';
import { fetchTitleSuggestions } from '@/features/returns/services/returns.service';

export function useTitleSuggestions(storeId: string | null, supplierId: string) {
  return useQuery({
    queryKey: ['titleSuggestions', storeId, supplierId],
    queryFn: async () => {
      const result = await fetchTitleSuggestions(storeId ?? '', supplierId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!storeId && !!supplierId,
    staleTime: 60_000,
  });
}

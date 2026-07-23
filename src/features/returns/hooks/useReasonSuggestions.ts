import { useQuery } from '@tanstack/react-query';
import { fetchReasonSuggestions } from '@/features/returns/services/returns.service';

export function useReasonSuggestions(storeId: string | null, supplierId: string) {
  return useQuery({
    queryKey: ['reasonSuggestions', storeId, supplierId],
    queryFn: async () => {
      const result = await fetchReasonSuggestions(storeId ?? '', supplierId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!storeId && !!supplierId,
    staleTime: 60_000,
  });
}

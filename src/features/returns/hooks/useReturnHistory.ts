import { useQuery } from '@tanstack/react-query';
import { fetchReturnHistory } from '@/features/returns/services/history.service';

export function useReturnHistory(returnId: string | null) {
  return useQuery({
    queryKey: ['returnHistory', returnId],
    queryFn: async () => {
      if (!returnId) throw new Error('No return id');
      const result = await fetchReturnHistory(returnId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!returnId,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchReturnById } from '@/features/returns/services/returns.service';

export function useReturn(returnId: string | null) {
  return useQuery({
    queryKey: ['return', returnId],
    queryFn: async () => {
      if (!returnId) throw new Error('No return id');
      const result = await fetchReturnById(returnId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!returnId,
  });
}

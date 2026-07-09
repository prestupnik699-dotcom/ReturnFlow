import { useQuery } from '@tanstack/react-query';
import { fetchReturnComments } from '@/features/returns/services/comments.service';

export function useReturnComments(returnId: string | null) {
  return useQuery({
    queryKey: ['returnComments', returnId],
    queryFn: async () => {
      if (!returnId) throw new Error('No return id');
      const result = await fetchReturnComments(returnId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!returnId,
  });
}

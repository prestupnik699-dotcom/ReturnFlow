import { useQuery } from '@tanstack/react-query';
import { fetchReturnImages } from '@/features/returns/services/images.service';

export function useReturnImages(returnId: string | null) {
  return useQuery({
    queryKey: ['returnImages', returnId],
    queryFn: async () => {
      if (!returnId) throw new Error('No return id');
      const result = await fetchReturnImages(returnId);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    enabled: !!returnId,
  });
}

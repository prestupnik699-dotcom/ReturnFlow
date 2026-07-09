import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteReturnImage, type ReturnImage } from '@/features/returns/services/images.service';

export function useDeleteReturnImage(returnId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (image: ReturnImage) => {
      const result = await deleteReturnImage(image);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnImages', returnId] });
    },
  });
}

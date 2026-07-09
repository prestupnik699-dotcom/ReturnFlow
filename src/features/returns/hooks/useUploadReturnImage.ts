import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadReturnImage } from '@/features/returns/services/images.service';
import { useAuthStore } from '@/stores/auth.store';

export function useUploadReturnImage(returnId: string) {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (localUri: string) => {
      if (!profile) throw new Error('No profile');
      const result = await uploadReturnImage(returnId, localUri, profile.id);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnImages', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
    },
  });
}

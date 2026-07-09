import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReturnComment } from '@/features/returns/services/comments.service';
import { useAuthStore } from '@/stores/auth.store';

export function useCreateReturnComment(returnId: string) {
  const profile = useAuthStore((state) => state.profile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: string) => {
      if (!profile) throw new Error('No profile');
      const result = await createReturnComment(returnId, profile.id, comment);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['returnComments', returnId] });
      queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
    },
  });
}

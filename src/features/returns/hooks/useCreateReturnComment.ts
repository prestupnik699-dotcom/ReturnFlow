import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReturnComment } from '@/features/returns/services/comments.service';
import { enqueueCreateComment } from '@/features/returns/services/offlineReturns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function useCreateReturnComment(returnId: string) {
  const profile = useAuthStore((state) => state.profile);
  const isOnline = useNetworkStatus();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: string): Promise<{ synced: boolean }> => {
      if (!profile) throw new Error('No profile');

      if (!isOnline) {
        await enqueueCreateComment({ returnItemId: returnId, authorId: profile.id, comment });
        return { synced: false };
      }

      const result = await createReturnComment(returnId, profile.id, comment);
      if (!result.success) throw new Error(result.error.message);
      return { synced: true };
    },
    onSuccess: ({ synced }, comment) => {
      if (synced) {
        queryClient.invalidateQueries({ queryKey: ['returnComments', returnId] });
        queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
        return;
      }

      if (!profile) return;

      queryClient.setQueryData(['returnComments', returnId], (old: unknown) => [
        ...(Array.isArray(old) ? old : []),
        {
          id: `pending-${Date.now()}`,
          comment,
          authorId: profile.id,
          authorName: `${profile.firstName} ${profile.lastName}`,
          createdAt: new Date().toISOString(),
          pendingSync: true,
        },
      ]);
    },
  });
}

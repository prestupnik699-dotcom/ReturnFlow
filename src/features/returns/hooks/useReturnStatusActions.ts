import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markReturnAsReturned,
  archiveReturn,
  restoreReturn,
} from '@/features/returns/services/returns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';

function useInvalidateReturn(returnId: string) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['return', returnId] });
    queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
    queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
  };
}

export function useMarkReturned(returnId: string) {
  const profile = useAuthStore((state) => state.profile);
  const invalidate = useInvalidateReturn(returnId);

  return useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('No profile');
      const result = await markReturnAsReturned(returnId, profile.id);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useArchiveReturn(returnId: string) {
  const invalidate = useInvalidateReturn(returnId);

  return useMutation({
    mutationFn: async () => {
      const result = await archiveReturn(returnId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

export function useRestoreReturn(returnId: string) {
  const invalidate = useInvalidateReturn(returnId);

  return useMutation({
    mutationFn: async () => {
      const result = await restoreReturn(returnId);
      if (!result.success) throw new Error(result.error.message);
    },
    onSuccess: invalidate,
  });
}

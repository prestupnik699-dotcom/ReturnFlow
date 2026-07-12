import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markReturnAsReturned,
  archiveReturn,
  restoreReturn,
  type ReturnStatus,
} from '@/features/returns/services/returns.service';
import { enqueueUpdateReturnStatus } from '@/features/returns/services/offlineReturns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

function useInvalidateReturn(returnId: string) {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['return', returnId] });
    queryClient.invalidateQueries({ queryKey: ['returnHistory', returnId] });
    queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] });
  };
}

// Only used while offline: patches the item wherever it's cached (the
// detail screen's ['return', id] entry, and any ['returns', ...] list
// variant currently holding it) so the change is visible immediately,
// without triggering a real refetch — a refetch would fail while offline
// and could wipe the already-loaded list (D-032).
function useApplyOptimisticStatus(returnId: string, newStatus: ReturnStatus) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.setQueryData(['return', returnId], (old: unknown) =>
      old && typeof old === 'object' ? { ...old, status: newStatus, pendingStatusSync: true } : old,
    );

    queryClient.setQueriesData({ queryKey: ['returns'] }, (old: unknown) => {
      if (!Array.isArray(old)) return old;
      return old.map((item) =>
        item && typeof item === 'object' && 'id' in item && item.id === returnId
          ? { ...item, status: newStatus, pendingStatusSync: true }
          : item,
      );
    });
  };
}

export function useMarkReturned(returnId: string) {
  const profile = useAuthStore((state) => state.profile);
  const isOnline = useNetworkStatus();
  const invalidate = useInvalidateReturn(returnId);
  const applyOptimistic = useApplyOptimisticStatus(returnId, 'returned');

  return useMutation({
    mutationFn: async (): Promise<{ synced: boolean }> => {
      if (!profile) throw new Error('No profile');

      if (!isOnline) {
        await enqueueUpdateReturnStatus({
          returnId,
          action: 'mark_returned',
          profileId: profile.id,
        });
        return { synced: false };
      }

      const result = await markReturnAsReturned(returnId, profile.id);
      if (!result.success) throw new Error(result.error.message);
      return { synced: true };
    },
    onSuccess: ({ synced }) => (synced ? invalidate() : applyOptimistic()),
  });
}

export function useArchiveReturn(returnId: string) {
  const isOnline = useNetworkStatus();
  const invalidate = useInvalidateReturn(returnId);
  const applyOptimistic = useApplyOptimisticStatus(returnId, 'archived');

  return useMutation({
    mutationFn: async (): Promise<{ synced: boolean }> => {
      if (!isOnline) {
        const profile = useAuthStore.getState().profile;
        await enqueueUpdateReturnStatus({
          returnId,
          action: 'archive',
          profileId: profile?.id ?? '',
        });
        return { synced: false };
      }

      const result = await archiveReturn(returnId);
      if (!result.success) throw new Error(result.error.message);
      return { synced: true };
    },
    onSuccess: ({ synced }) => (synced ? invalidate() : applyOptimistic()),
  });
}

export function useRestoreReturn(returnId: string) {
  const isOnline = useNetworkStatus();
  const invalidate = useInvalidateReturn(returnId);
  const applyOptimistic = useApplyOptimisticStatus(returnId, 'pending');

  return useMutation({
    mutationFn: async (): Promise<{ synced: boolean }> => {
      if (!isOnline) {
        const profile = useAuthStore.getState().profile;
        await enqueueUpdateReturnStatus({
          returnId,
          action: 'restore',
          profileId: profile?.id ?? '',
        });
        return { synced: false };
      }

      const result = await restoreReturn(returnId);
      if (!result.success) throw new Error(result.error.message);
      return { synced: true };
    },
    onSuccess: ({ synced }) => (synced ? invalidate() : applyOptimistic()),
  });
}

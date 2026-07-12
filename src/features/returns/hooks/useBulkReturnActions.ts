import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markReturnAsReturned,
  archiveReturn,
  deleteReturn,
} from '@/features/returns/services/returns.service';
import { useAuthStore } from '@/stores/auth.store';
import { useMembershipStore } from '@/stores/membership.store';

export function useBulkMarkReturned() {
  const profile = useAuthStore((state) => state.profile);
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!profile) throw new Error('No profile');
      const results = await Promise.all(ids.map((id) => markReturnAsReturned(id, profile.id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] }),
  });
}

export function useBulkArchive() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => archiveReturn(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] }),
  });
}

export function useBulkDeleteReturns() {
  const activeStoreId = useMembershipStore((state) => state.activeStoreId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.all(ids.map((id) => deleteReturn(id)));
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) throw new Error(`${failed.length} of ${ids.length} failed`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['returns', activeStoreId] }),
  });
}

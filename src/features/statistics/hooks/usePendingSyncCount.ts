import { useQuery } from '@tanstack/react-query';
import { getPendingOperations } from '@/lib/sync/syncQueue';

export function usePendingSyncCount() {
  return useQuery({
    queryKey: ['pendingSyncCount'],
    queryFn: async () => {
      const pending = await getPendingOperations();
      return pending.length;
    },
    // The offline queue is local (SQLite), so this is cheap to refetch
    // often — keeps the Dashboard's "Ожидают отправки" card honest as
    // items sync in the background via useSyncOnReconnect.
    refetchInterval: 15000,
  });
}

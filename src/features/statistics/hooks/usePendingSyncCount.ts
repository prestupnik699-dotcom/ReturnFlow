import { useQuery } from '@tanstack/react-query';
import { getPendingOperations } from '@/lib/sync/syncQueue';

const ORDER_OPERATIONS = new Set(['create_catalog_item', 'place_order']);

export type PendingSyncCounts = {
  total: number;
  returns: number;
  orders: number;
};

// Split by operation type rather than one lump count — a pending return
// and a pending order belong on different screens, so the Dashboard's
// attention card needs to know which is which to link correctly instead
// of guessing.
export function usePendingSyncCount() {
  return useQuery({
    queryKey: ['pendingSyncCount'],
    queryFn: async (): Promise<PendingSyncCounts> => {
      const pending = await getPendingOperations();
      const orders = pending.filter((op) => ORDER_OPERATIONS.has(op.operation)).length;
      return {
        total: pending.length,
        orders,
        returns: pending.length - orders,
      };
    },
    // The offline queue is local (SQLite), so this is cheap to refetch
    // often — keeps the Dashboard's "Ожидают отправки" cards honest as
    // items sync in the background via useSyncOnReconnect.
    refetchInterval: 15000,
  });
}

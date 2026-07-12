import {
  getPendingOperations,
  markOperationStatus,
  incrementRetryCount,
  removeOperation,
} from '@/lib/sync/syncQueue';

type SyncHandler = (payload: unknown) => Promise<void>;

const handlers = new Map<string, SyncHandler>();

/** Called by a feature's service module to handle its own operation types. */
export function registerSyncHandler(operation: string, handler: SyncHandler): void {
  handlers.set(operation, handler);
  if (__DEV__) console.log('[sync] handler registered for:', operation);
}

export async function processSyncQueue(): Promise<void> {
  const pending = await getPendingOperations();
  if (__DEV__)
    console.log(
      '[sync] pending operations found:',
      pending.length,
      pending.map((p) => p.operation),
    );

  for (const item of pending) {
    const handler = handlers.get(item.operation);

    if (!handler) {
      if (__DEV__) console.log('[sync] no handler for operation:', item.operation);
      continue;
    }

    await markOperationStatus(item.id, 'processing');

    try {
      await handler(item.payload);
      await removeOperation(item.id);
      if (__DEV__) console.log('[sync] operation succeeded and removed:', item.id, item.operation);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      if (__DEV__) console.error('[sync] operation failed:', item.id, item.operation, message);
      await incrementRetryCount(item.id);
      await markOperationStatus(item.id, 'failed', message);
    }
  }
}

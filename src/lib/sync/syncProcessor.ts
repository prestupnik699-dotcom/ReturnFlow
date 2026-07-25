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
}

export async function processSyncQueue(): Promise<number> {
  const pending = await getPendingOperations();
  let succeeded = 0;

  for (const item of pending) {
    const handler = handlers.get(item.operation);

    if (!handler) {
      continue;
    }

    await markOperationStatus(item.id, 'processing');

    try {
      await handler(item.payload);
      await removeOperation(item.id);
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await incrementRetryCount(item.id);
      await markOperationStatus(item.id, 'failed', message);
    }
  }

  return succeeded;
}

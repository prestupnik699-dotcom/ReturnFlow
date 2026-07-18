const mockGetPendingOperations = jest.fn();
const mockMarkOperationStatus = jest.fn();
const mockIncrementRetryCount = jest.fn();
const mockRemoveOperation = jest.fn();

jest.mock('@/lib/sync/syncQueue', () => ({
  getPendingOperations: () => mockGetPendingOperations(),
  markOperationStatus: (...args: unknown[]) => mockMarkOperationStatus(...args),
  incrementRetryCount: (...args: unknown[]) => mockIncrementRetryCount(...args),
  removeOperation: (...args: unknown[]) => mockRemoveOperation(...args),
}));

import { registerSyncHandler, processSyncQueue } from '@/lib/sync/syncProcessor';
import type { SyncOperation } from '@/lib/sync/syncQueue';

function makeOperation(overrides: Partial<SyncOperation> = {}): SyncOperation {
  return {
    id: 'op-1',
    operation: 'unregistered_op',
    payload: { foo: 'bar' },
    status: 'pending',
    retryCount: 0,
    errorMessage: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetPendingOperations.mockReset();
  mockMarkOperationStatus.mockReset();
  mockIncrementRetryCount.mockReset();
  mockRemoveOperation.mockReset();
});

describe('processSyncQueue', () => {
  it('skips queue items whose operation type has no registered handler', async () => {
    mockGetPendingOperations.mockResolvedValue([
      makeOperation({ id: 'op-skip', operation: 'nobody_handles_this_type' }),
    ]);

    await processSyncQueue();

    expect(mockMarkOperationStatus).not.toHaveBeenCalled();
    expect(mockRemoveOperation).not.toHaveBeenCalled();
    expect(mockIncrementRetryCount).not.toHaveBeenCalled();
  });

  it('marks processing, runs the handler, then removes the item on success', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    registerSyncHandler('create_widget_success', handler);
    mockGetPendingOperations.mockResolvedValue([
      makeOperation({ id: 'op-ok', operation: 'create_widget_success', payload: { name: 'x' } }),
    ]);

    await processSyncQueue();

    expect(mockMarkOperationStatus).toHaveBeenCalledWith('op-ok', 'processing');
    expect(handler).toHaveBeenCalledWith({ name: 'x' });
    expect(mockRemoveOperation).toHaveBeenCalledWith('op-ok');
    // A successful run must never also mark the item failed.
    expect(mockMarkOperationStatus).not.toHaveBeenCalledWith('op-ok', 'failed', expect.anything());
  });

  it('increments retry count and marks failed with the error message when the handler throws', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('server said no'));
    registerSyncHandler('create_widget_fail', handler);
    mockGetPendingOperations.mockResolvedValue([
      makeOperation({ id: 'op-fail', operation: 'create_widget_fail' }),
    ]);

    await processSyncQueue();

    expect(mockIncrementRetryCount).toHaveBeenCalledWith('op-fail');
    expect(mockMarkOperationStatus).toHaveBeenCalledWith('op-fail', 'failed', 'server said no');
    // A failed run must never be removed from the queue — that would
    // silently drop offline work instead of retrying it later.
    expect(mockRemoveOperation).not.toHaveBeenCalled();
  });

  it('falls back to a generic message when the handler throws a non-Error value', async () => {
    const handler = jest.fn().mockRejectedValue('a plain string rejection');
    registerSyncHandler('create_widget_weird_throw', handler);
    mockGetPendingOperations.mockResolvedValue([
      makeOperation({ id: 'op-weird', operation: 'create_widget_weird_throw' }),
    ]);

    await processSyncQueue();

    expect(mockMarkOperationStatus).toHaveBeenCalledWith(
      'op-weird',
      'failed',
      'Unknown sync error',
    );
  });

  it('processes multiple queued items independently, one failure does not block the others', async () => {
    const okHandler = jest.fn().mockResolvedValue(undefined);
    const failHandler = jest.fn().mockRejectedValue(new Error('boom'));
    registerSyncHandler('multi_ok', okHandler);
    registerSyncHandler('multi_fail', failHandler);
    mockGetPendingOperations.mockResolvedValue([
      makeOperation({ id: 'multi-1', operation: 'multi_fail' }),
      makeOperation({ id: 'multi-2', operation: 'multi_ok' }),
    ]);

    await processSyncQueue();

    expect(mockRemoveOperation).toHaveBeenCalledWith('multi-2');
    expect(mockRemoveOperation).not.toHaveBeenCalledWith('multi-1');
    expect(mockMarkOperationStatus).toHaveBeenCalledWith('multi-1', 'failed', 'boom');
  });
});

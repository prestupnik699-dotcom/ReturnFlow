import { enqueueOperation, getPendingOperations } from '@/lib/sync/syncQueue';
import type { ReturnItem, ReturnPriority } from '@/features/returns/services/returns.service';

export type CreateReturnQueuePayload = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
  title: string;
  quantity: number;
  reason: string;
  priority: ReturnPriority;
};

export async function enqueueCreateReturn(payload: CreateReturnQueuePayload): Promise<void> {
  await enqueueOperation('create_return', payload);
}

export async function fetchPendingReturns(storeId: string): Promise<ReturnItem[]> {
  const pending = await getPendingOperations();

  return pending
    .filter((op) => op.operation === 'create_return')
    .map((op) => ({ op, payload: op.payload as CreateReturnQueuePayload }))
    .filter(({ payload }) => payload.storeId === storeId)
    .map(({ op, payload }) => ({
      id: `pending-${op.id}`,
      organizationId: payload.organizationId,
      storeId: payload.storeId,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName,
      createdBy: payload.createdBy,
      title: payload.title,
      quantity: payload.quantity,
      reason: payload.reason,
      comment: null,
      status: 'pending' as const,
      priority: payload.priority,
      createdAt: op.createdAt,
      returnedAt: null,
      pendingSync: true,
    }));
}

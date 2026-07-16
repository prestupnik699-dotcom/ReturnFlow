import { enqueueOperation, getPendingOperations } from '@/lib/sync/syncQueue';
import {
  initialStatusForPriority,
  type ReturnItem,
  type ReturnPriority,
} from '@/features/returns/services/returns.service';

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
  barcode: string;
  isExchange: boolean;
};

export type UpdateReturnStatusQueuePayload = {
  returnId: string;
  action: 'mark_returned' | 'archive' | 'restore';
  profileId: string;
};

export type CreateCommentQueuePayload = {
  returnItemId: string;
  authorId: string;
  comment: string;
};

export async function enqueueCreateReturn(payload: CreateReturnQueuePayload): Promise<void> {
  await enqueueOperation('create_return', payload);
}

export async function enqueueUpdateReturnStatus(
  payload: UpdateReturnStatusQueuePayload,
): Promise<void> {
  await enqueueOperation('update_return_status', payload);
}

export async function enqueueCreateComment(payload: CreateCommentQueuePayload): Promise<void> {
  await enqueueOperation('create_comment', payload);
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
      status: initialStatusForPriority(payload.priority),
      priority: payload.priority,
      barcode: payload.barcode || null,
      isExchange: payload.isExchange,
      createdAt: op.createdAt,
      returnedAt: null,
      pendingSync: true,
    }));
}

import { registerSyncHandler } from '@/lib/sync/syncProcessor';
import {
  createReturn,
  markReturnAsReturned,
  archiveReturn,
  restoreReturn,
} from '@/features/returns/services/returns.service';
import { createReturnComment } from '@/features/returns/services/comments.service';
import type {
  CreateReturnQueuePayload,
  UpdateReturnStatusQueuePayload,
  CreateCommentQueuePayload,
} from '@/features/returns/services/offlineReturns.service';

registerSyncHandler('create_return', async (rawPayload) => {
  const payload = rawPayload as CreateReturnQueuePayload;

  const result = await createReturn({
    organizationId: payload.organizationId,
    storeId: payload.storeId,
    supplierId: payload.supplierId,
    createdBy: payload.createdBy,
    title: payload.title,
    quantity: payload.quantity,
    reason: payload.reason,
    priority: payload.priority,
    barcode: payload.barcode,
    isExchange: payload.isExchange,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

registerSyncHandler('update_return_status', async (rawPayload) => {
  const payload = rawPayload as UpdateReturnStatusQueuePayload;

  const result =
    payload.action === 'mark_returned'
      ? await markReturnAsReturned(payload.returnId, payload.profileId)
      : payload.action === 'archive'
        ? await archiveReturn(payload.returnId)
        : await restoreReturn(payload.returnId);

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

registerSyncHandler('create_comment', async (rawPayload) => {
  const payload = rawPayload as CreateCommentQueuePayload;

  const result = await createReturnComment(payload.returnItemId, payload.authorId, payload.comment);

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

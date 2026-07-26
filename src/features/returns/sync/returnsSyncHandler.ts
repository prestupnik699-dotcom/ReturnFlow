import * as Sentry from '@sentry/react-native';
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
      ? await markReturnAsReturned(
          payload.returnId,
          payload.profileId,
          payload.expectedPreviousStatus,
        )
      : payload.action === 'archive'
        ? await archiveReturn(payload.returnId, payload.expectedPreviousStatus)
        : await restoreReturn(payload.returnId, payload.expectedPreviousStatus);

  if (!result.success) {
    // A status conflict means someone else already changed this return
    // while we were offline — the queued action is now stale and
    // re-applying it would silently overwrite their change. Don't retry
    // (retrying can't resolve a conflict that's already happened) and
    // don't surface it to the user as a failure either; just record it
    // so it's visible in Sentry rather than disappearing unnoticed.
    if (result.error.code === 'STATUS_CONFLICT') {
      Sentry.captureMessage('Return status sync conflict — action skipped', {
        level: 'info',
        extra: {
          returnId: payload.returnId,
          action: payload.action,
          expectedPreviousStatus: payload.expectedPreviousStatus,
        },
      });
      return;
    }

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

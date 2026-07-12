import { registerSyncHandler } from '@/lib/sync/syncProcessor';
import { createReturn } from '@/features/returns/services/returns.service';
import type { CreateReturnQueuePayload } from '@/features/returns/services/offlineReturns.service';

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
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

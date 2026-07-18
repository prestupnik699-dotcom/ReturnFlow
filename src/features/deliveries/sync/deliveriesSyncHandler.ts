import { registerSyncHandler } from '@/lib/sync/syncProcessor';
import { createDeliveryItem } from '@/features/deliveries/services/deliveries.service';
import type { CreateDeliveryQueuePayload } from '@/features/deliveries/services/offlineDeliveries.service';

registerSyncHandler('create_delivery', async (rawPayload) => {
  const payload = rawPayload as CreateDeliveryQueuePayload;

  const result = await createDeliveryItem({
    organizationId: payload.organizationId,
    storeId: payload.storeId,
    supplierId: payload.supplierId,
    createdBy: payload.createdBy,
    title: payload.title,
    quantity: payload.quantity,
    barcode: payload.barcode,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

import { registerSyncHandler } from '@/lib/sync/syncProcessor';
import {
  createCatalogItem,
  placeCatalogOrder,
} from '@/features/suppliers/services/catalog.service';
import type {
  CreateCatalogItemQueuePayload,
  PlaceOrderQueuePayload,
} from '@/features/orders/services/offlineOrders.service';

registerSyncHandler('create_catalog_item', async (rawPayload) => {
  const payload = rawPayload as CreateCatalogItemQueuePayload;

  const result = await createCatalogItem({
    organizationId: payload.organizationId,
    supplierId: payload.supplierId,
    createdBy: payload.createdBy,
    name: payload.name,
    defaultPrice: payload.defaultPrice,
    barcode: payload.barcode,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

registerSyncHandler('place_order', async (rawPayload) => {
  const payload = rawPayload as PlaceOrderQueuePayload;

  const result = await placeCatalogOrder({
    organizationId: payload.organizationId,
    storeId: payload.storeId,
    supplierId: payload.supplierId,
    createdBy: payload.createdBy,
    lines: payload.lines,
  });

  if (!result.success) {
    throw new Error(result.error.message);
  }
});

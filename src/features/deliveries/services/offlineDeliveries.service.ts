import { enqueueOperation, getPendingOperations } from '@/lib/sync/syncQueue';
import type { DeliveryItem } from '@/features/deliveries/services/deliveries.service';

export type CreateDeliveryQueuePayload = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
  title: string;
  quantity: number;
  barcode: string;
};

export async function enqueueCreateDelivery(payload: CreateDeliveryQueuePayload): Promise<void> {
  await enqueueOperation('create_delivery', payload);
}

export async function fetchPendingDeliveries(storeId: string): Promise<DeliveryItem[]> {
  const pending = await getPendingOperations();

  return pending
    .filter((op) => op.operation === 'create_delivery')
    .map((op) => ({ op, payload: op.payload as CreateDeliveryQueuePayload }))
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
      barcode: payload.barcode || null,
      createdAt: op.createdAt,
      pendingSync: true,
    }));
}

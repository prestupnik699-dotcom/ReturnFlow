import { enqueueOperation, getPendingOperations } from '@/lib/sync/syncQueue';
import type { CatalogItem, OrderLine } from '@/features/suppliers/services/catalog.service';

export type CreateCatalogItemQueuePayload = {
  organizationId: string;
  supplierId: string;
  createdBy: string;
  name: string;
  defaultPrice: number | null;
  barcode: string | null;
};

export type PlaceOrderQueuePayload = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  createdBy: string;
  lines: OrderLine[];
};

export async function enqueueCreateCatalogItem(
  payload: CreateCatalogItemQueuePayload,
): Promise<void> {
  await enqueueOperation('create_catalog_item', payload);
}

export async function enqueuePlaceOrder(payload: PlaceOrderQueuePayload): Promise<void> {
  await enqueueOperation('place_order', payload);
}

// Shown in the catalog list immediately, before the sync queue has had a
// chance to actually reach the server — same pattern as pending returns:
// a locally-generated id prefixed so it never collides with a real
// server-issued uuid, and a pendingSync flag the UI can use to grey it
// out or show a small "syncing" indicator if desired.
export async function fetchPendingCatalogItems(supplierId: string): Promise<CatalogItem[]> {
  const pending = await getPendingOperations();

  return pending
    .filter((op) => op.operation === 'create_catalog_item')
    .map((op) => ({ op, payload: op.payload as CreateCatalogItemQueuePayload }))
    .filter(({ payload }) => payload.supplierId === supplierId)
    .map(({ op, payload }) => ({
      id: `pending-${op.id}`,
      organizationId: payload.organizationId,
      supplierId: payload.supplierId,
      name: payload.name,
      defaultPrice: payload.defaultPrice,
      barcode: payload.barcode,
      createdBy: payload.createdBy,
      createdAt: op.createdAt,
    }));
}

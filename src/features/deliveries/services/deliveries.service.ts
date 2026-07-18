import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type DeliveryItem = {
  id: string;
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
  title: string;
  quantity: number;
  barcode: string | null;
  createdAt: string;
};

type DeliveryItemRow = {
  id: string;
  organization_id: string;
  store_id: string;
  supplier_id: string;
  created_by: string;
  title: string;
  quantity: number;
  barcode: string | null;
  created_at: string;
  suppliers: { name: string } | null;
};

function mapDeliveryItem(row: DeliveryItemRow): DeliveryItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? '',
    createdBy: row.created_by,
    title: row.title,
    quantity: row.quantity,
    barcode: row.barcode,
    createdAt: row.created_at,
  };
}

const SELECT_FIELDS =
  'id, organization_id, store_id, supplier_id, created_by, title, quantity, barcode, created_at, suppliers(name)';

export async function fetchDeliveryItems(storeId: string): Promise<ServiceResult<DeliveryItem[]>> {
  const { data, error } = await supabase
    .from('delivery_items')
    .select(SELECT_FIELDS)
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return fromCaughtError(error, 'FETCH_DELIVERY_ITEMS_FAILED');
  }

  return { success: true, data: (data as unknown as DeliveryItemRow[]).map(mapDeliveryItem) };
}

type CreateDeliveryItemInput = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  createdBy: string;
  title: string;
  quantity: number;
  barcode?: string;
};

export async function createDeliveryItem(
  input: CreateDeliveryItemInput,
): Promise<ServiceResult<DeliveryItem>> {
  const { data, error } = await supabase
    .from('delivery_items')
    .insert({
      organization_id: input.organizationId,
      store_id: input.storeId,
      supplier_id: input.supplierId,
      created_by: input.createdBy,
      title: input.title,
      quantity: input.quantity,
      barcode: input.barcode || null,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_DELIVERY_ITEM_FAILED');
  }

  return { success: true, data: mapDeliveryItem(data as unknown as DeliveryItemRow) };
}

export type DeliveryCountsByStore = Record<string, number>;

// Same aggregation pattern as fetchReturnCountsByStore — used to show
// "N поставок" alongside "N возвратов" wherever store stats are shown.
export async function fetchDeliveryCountsByStore(
  organizationId: string,
): Promise<ServiceResult<DeliveryCountsByStore>> {
  const { data, error } = await supabase
    .from('delivery_items')
    .select('store_id')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) {
    return fromCaughtError(error, 'FETCH_DELIVERY_COUNTS_FAILED');
  }

  const rows = data as unknown as { store_id: string }[];
  const counts: DeliveryCountsByStore = {};

  for (const row of rows) {
    counts[row.store_id] = (counts[row.store_id] ?? 0) + 1;
  }

  return { success: true, data: counts };
}

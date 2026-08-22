import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type CatalogItem = {
  id: string;
  organizationId: string;
  supplierId: string;
  name: string;
  defaultPrice: number | null;
  barcode: string | null;
  createdBy: string;
  createdAt: string;
};

type CatalogItemRow = {
  id: string;
  organization_id: string;
  supplier_id: string;
  name: string;
  default_price: number | null;
  barcode: string | null;
  created_by: string;
  created_at: string;
};

function mapCatalogItem(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    supplierId: row.supplier_id,
    name: row.name,
    defaultPrice: row.default_price,
    barcode: row.barcode,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

const CATALOG_ITEM_FIELDS =
  'id, organization_id, supplier_id, name, default_price, barcode, created_by, created_at';

export async function fetchCatalogItemByBarcode(
  supplierId: string,
  barcode: string,
): Promise<ServiceResult<CatalogItem | null>> {
  const { data, error } = await supabase
    .from('supplier_catalog_items')
    .select(CATALOG_ITEM_FIELDS)
    .eq('supplier_id', supplierId)
    .eq('barcode', barcode)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return fromCaughtError(error, 'FETCH_CATALOG_ITEM_FAILED');
  }

  return { success: true, data: data ? mapCatalogItem(data) : null };
}

export async function fetchSupplierCatalog(
  supplierId: string,
): Promise<ServiceResult<CatalogItem[]>> {
  const { data, error } = await supabase
    .from('supplier_catalog_items')
    .select(CATALOG_ITEM_FIELDS)
    .eq('supplier_id', supplierId)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_CATALOG_FAILED');
  }

  return { success: true, data: data.map(mapCatalogItem) };
}

type CreateCatalogItemInput = {
  organizationId: string;
  supplierId: string;
  createdBy: string;
  name: string;
  defaultPrice: number | null;
  barcode: string | null;
};

export async function createCatalogItem(
  input: CreateCatalogItemInput,
): Promise<ServiceResult<CatalogItem>> {
  const { data, error } = await supabase
    .from('supplier_catalog_items')
    .insert({
      organization_id: input.organizationId,
      supplier_id: input.supplierId,
      created_by: input.createdBy,
      name: input.name,
      default_price: input.defaultPrice,
      barcode: input.barcode,
    })
    .select(CATALOG_ITEM_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_CATALOG_ITEM_FAILED');
  }

  return { success: true, data: mapCatalogItem(data) };
}

type UpdateCatalogItemInput = {
  name: string;
  defaultPrice: number | null;
  barcode: string | null;
};

export async function updateCatalogItem(
  itemId: string,
  input: UpdateCatalogItemInput,
): Promise<ServiceResult<CatalogItem>> {
  const { data, error } = await supabase
    .from('supplier_catalog_items')
    .update({ name: input.name, default_price: input.defaultPrice, barcode: input.barcode })
    .eq('id', itemId)
    .select(CATALOG_ITEM_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'UPDATE_CATALOG_ITEM_FAILED');
  }

  return { success: true, data: mapCatalogItem(data) };
}

export async function deleteCatalogItem(itemId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('supplier_catalog_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    return fromCaughtError(error, 'DELETE_CATALOG_ITEM_FAILED');
  }

  return { success: true, data: null };
}

// ============================================================
// Orders — flat rows, no header table (same pattern as delivery_items:
// several rows sharing supplier_id/store_id/created_at represent one
// order for display/history purposes).
// ============================================================

export type OrderLine = {
  catalogItemId: string | null;
  title: string;
  quantity: number;
};

type PlaceOrderInput = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  createdBy: string;
  lines: OrderLine[];
};

export async function placeCatalogOrder(input: PlaceOrderInput): Promise<ServiceResult<null>> {
  const rows = input.lines.map((line) => ({
    organization_id: input.organizationId,
    store_id: input.storeId,
    supplier_id: input.supplierId,
    catalog_item_id: line.catalogItemId,
    created_by: input.createdBy,
    title: line.title,
    quantity: line.quantity,
  }));

  const { error } = await supabase.from('catalog_order_items').insert(rows);

  if (error) {
    return fromCaughtError(error, 'PLACE_ORDER_FAILED');
  }

  return { success: true, data: null };
}

export type OrderHistoryEntry = {
  id: string;
  title: string;
  quantity: number;
  createdAt: string;
  catalogItemId: string | null;
};

export type GroupedOrder = {
  createdAt: string;
  items: OrderHistoryEntry[];
};

// Groups flat catalog_order_items rows into "one order per batch" for
// history display — rows inserted together in the same placeCatalogOrder
// call share an identical created_at timestamp (same INSERT statement),
// so grouping by that exact value reconstructs the original order.
export async function fetchSupplierOrderHistory(
  supplierId: string,
): Promise<ServiceResult<GroupedOrder[]>> {
  const { data, error } = await supabase
    .from('catalog_order_items')
    .select('id, title, quantity, created_at, catalog_item_id')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false });

  if (error) {
    return fromCaughtError(error, 'FETCH_ORDER_HISTORY_FAILED');
  }

  const grouped = new Map<string, OrderHistoryEntry[]>();
  for (const row of data) {
    const key = row.created_at;
    const entry: OrderHistoryEntry = {
      id: row.id,
      title: row.title,
      quantity: row.quantity,
      createdAt: row.created_at,
      catalogItemId: row.catalog_item_id,
    };
    const existing = grouped.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      grouped.set(key, [entry]);
    }
  }

  const result: GroupedOrder[] = Array.from(grouped.entries()).map(([createdAt, items]) => ({
    createdAt,
    items,
  }));

  return { success: true, data: result };
}

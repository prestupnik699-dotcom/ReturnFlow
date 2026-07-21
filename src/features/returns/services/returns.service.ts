import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnStatus = 'pending' | 'urgent' | 'returned' | 'archived';
export type ReturnPriority = 'low' | 'normal' | 'high' | 'critical';

export function initialStatusForPriority(priority: ReturnPriority): ReturnStatus {
  return priority === 'high' || priority === 'critical' ? 'urgent' : 'pending';
}

export type ReturnItem = {
  id: string;
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
  title: string;
  quantity: number;
  unitPrice: number | null;
  reason: string | null;
  comment: string | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  barcode: string | null;
  isExchange: boolean;
  createdAt: string;
  returnedAt: string | null;
  pendingSync?: boolean;
  pendingStatusSync?: boolean;
};

type ReturnItemRow = {
  id: string;
  organization_id: string;
  store_id: string;
  supplier_id: string;
  created_by: string;
  title: string;
  quantity: number;
  unit_price: number | null;
  reason: string | null;
  comment: string | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  barcode: string | null;
  is_exchange: boolean;
  created_at: string;
  returned_at: string | null;
  suppliers: { name: string } | null;
};

function mapReturn(row: ReturnItemRow): ReturnItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? '',
    createdBy: row.created_by,
    title: row.title,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    reason: row.reason,
    comment: row.comment,
    status: row.status,
    priority: row.priority,
    barcode: row.barcode,
    isExchange: row.is_exchange,
    createdAt: row.created_at,
    returnedAt: row.returned_at,
  };
}

const SELECT_FIELDS =
  'id, organization_id, store_id, supplier_id, created_by, title, quantity, unit_price, reason, comment, status, priority, barcode, is_exchange, created_at, returned_at, suppliers(name)';

type FetchReturnsInput = {
  storeId: string;
  statusFilter?: ReturnStatus[];
};

export async function fetchReturns(input: FetchReturnsInput): Promise<ServiceResult<ReturnItem[]>> {
  let query = supabase
    .from('return_items')
    .select(SELECT_FIELDS)
    .eq('store_id', input.storeId)
    .is('deleted_at', null);

  query =
    input.statusFilter && input.statusFilter.length > 0
      ? query.in('status', input.statusFilter)
      : query.neq('status', 'archived');

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return fromCaughtError(error, 'FETCH_RETURNS_FAILED');
  }

  return { success: true, data: (data as unknown as ReturnItemRow[]).map(mapReturn) };
}

export async function fetchReturnById(returnId: string): Promise<ServiceResult<ReturnItem>> {
  const { data, error } = await supabase
    .from('return_items')
    .select(SELECT_FIELDS)
    .eq('id', returnId)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'FETCH_RETURN_FAILED');
  }

  return { success: true, data: mapReturn(data as unknown as ReturnItemRow) };
}

export type StoreReturnCounts = Record<string, { total: number; urgent: number }>;

export async function fetchReturnCountsByStore(
  organizationId: string,
): Promise<ServiceResult<StoreReturnCounts>> {
  const { data, error } = await supabase
    .from('return_items')
    .select('store_id, status')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .neq('status', 'archived');

  if (error) {
    return fromCaughtError(error, 'FETCH_STORE_RETURN_COUNTS_FAILED');
  }

  const rows = data as unknown as { store_id: string; status: ReturnStatus }[];
  const counts: StoreReturnCounts = {};

  for (const row of rows) {
    const existing = counts[row.store_id] ?? { total: 0, urgent: 0 };
    existing.total += 1;
    if (row.status === 'urgent') {
      existing.urgent += 1;
    }
    counts[row.store_id] = existing;
  }

  return { success: true, data: counts };
}

export async function fetchReturnCountsBySupplier(
  organizationId: string,
): Promise<ServiceResult<StoreReturnCounts>> {
  const { data, error } = await supabase
    .from('return_items')
    .select('supplier_id, status')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .neq('status', 'archived');

  if (error) {
    return fromCaughtError(error, 'FETCH_SUPPLIER_RETURN_COUNTS_FAILED');
  }

  const rows = data as unknown as { supplier_id: string; status: ReturnStatus }[];
  const counts: StoreReturnCounts = {};

  for (const row of rows) {
    const existing = counts[row.supplier_id] ?? { total: 0, urgent: 0 };
    existing.total += 1;
    if (row.status === 'urgent') {
      existing.urgent += 1;
    }
    counts[row.supplier_id] = existing;
  }

  return { success: true, data: counts };
}

export type QuantityBySupplier = Record<string, number>;

export async function fetchReturnQuantityBySupplier(
  organizationId: string,
): Promise<ServiceResult<QuantityBySupplier>> {
  const { data, error } = await supabase
    .from('return_items')
    .select('supplier_id, quantity')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) {
    return fromCaughtError(error, 'FETCH_RETURN_QUANTITY_BY_SUPPLIER_FAILED');
  }

  const rows = data as unknown as { supplier_id: string; quantity: number }[];
  const totals: QuantityBySupplier = {};

  for (const row of rows) {
    totals[row.supplier_id] = (totals[row.supplier_id] ?? 0) + row.quantity;
  }

  return { success: true, data: totals };
}

type CreateReturnInput = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  createdBy: string;
  title: string;
  quantity: number;
  unitPrice?: number | null;
  reason: string;
  priority: ReturnPriority;
  barcode?: string;
  isExchange?: boolean;
};

export async function createReturn(input: CreateReturnInput): Promise<ServiceResult<ReturnItem>> {
  const { data, error } = await supabase
    .from('return_items')
    .insert({
      organization_id: input.organizationId,
      store_id: input.storeId,
      supplier_id: input.supplierId,
      created_by: input.createdBy,
      title: input.title,
      quantity: input.quantity,
      unit_price: input.unitPrice ?? null,
      reason: input.reason || null,
      priority: input.priority,
      status: initialStatusForPriority(input.priority),
      barcode: input.barcode || null,
      is_exchange: input.isExchange ?? false,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_RETURN_FAILED');
  }

  return { success: true, data: mapReturn(data as unknown as ReturnItemRow) };
}

type UpdateReturnInput = {
  supplierId: string;
  title: string;
  quantity: number;
  unitPrice?: number | null;
  reason: string;
  priority: ReturnPriority;
  barcode?: string;
  isExchange?: boolean;
  currentStatus: ReturnStatus;
};

export async function updateReturn(
  returnId: string,
  input: UpdateReturnInput,
): Promise<ServiceResult<ReturnItem>> {
  const isResolved = input.currentStatus === 'returned' || input.currentStatus === 'archived';

  const { data, error } = await supabase
    .from('return_items')
    .update({
      supplier_id: input.supplierId,
      title: input.title,
      quantity: input.quantity,
      unit_price: input.unitPrice ?? null,
      reason: input.reason || null,
      priority: input.priority,
      ...(isResolved ? {} : { status: initialStatusForPriority(input.priority) }),
      barcode: input.barcode || null,
      is_exchange: input.isExchange ?? false,
    })
    .eq('id', returnId)
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'UPDATE_RETURN_FAILED');
  }

  return { success: true, data: mapReturn(data as unknown as ReturnItemRow) };
}

export async function markReturnAsReturned(
  returnId: string,
  profileId: string,
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('return_items')
    .update({ status: 'returned', returned_by: profileId, returned_at: new Date().toISOString() })
    .eq('id', returnId);

  if (error) {
    return fromCaughtError(error, 'MARK_RETURNED_FAILED');
  }

  return { success: true, data: null };
}

export async function archiveReturn(returnId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('return_items')
    .update({ status: 'archived' })
    .eq('id', returnId);

  if (error) {
    return fromCaughtError(error, 'ARCHIVE_RETURN_FAILED');
  }

  return { success: true, data: null };
}

export async function restoreReturn(returnId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('return_items')
    .update({ status: 'pending' })
    .eq('id', returnId);

  if (error) {
    return fromCaughtError(error, 'RESTORE_RETURN_FAILED');
  }

  return { success: true, data: null };
}

export async function deleteReturn(returnId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('return_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', returnId);

  if (error) {
    return fromCaughtError(error, 'DELETE_RETURN_FAILED');
  }

  return { success: true, data: null };
}

export async function hardDeleteReturn(returnId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('return_items').delete().eq('id', returnId);

  if (error) {
    return fromCaughtError(error, 'HARD_DELETE_RETURN_FAILED');
  }

  return { success: true, data: null };
}

export type TitleSuggestion = { title: string; count: number };

// Aggregated client-side (same pattern as fetchReturnCountsByStore) rather
// than via a DB-side GROUP BY, since Supabase's JS client has no group-by
// helper and a single store's return history is small enough that this is
// cheap. Ordered by frequency (most-typed first), tie-broken by recency,
// so the person's most common items for this supplier surface first.
export async function fetchTitleSuggestions(
  storeId: string,
  supplierId: string,
): Promise<ServiceResult<TitleSuggestion[]>> {
  const { data, error } = await supabase
    .from('return_items')
    .select('title, created_at')
    .eq('store_id', storeId)
    .eq('supplier_id', supplierId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return fromCaughtError(error, 'FETCH_TITLE_SUGGESTIONS_FAILED');
  }

  const rows = data as unknown as { title: string; created_at: string }[];
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.title, (counts.get(row.title) ?? 0) + 1);
  }

  const suggestions = Array.from(counts.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);

  return { success: true, data: suggestions };
}

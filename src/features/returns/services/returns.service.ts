import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnStatus = 'pending' | 'urgent' | 'returned' | 'archived';
export type ReturnPriority = 'low' | 'normal' | 'high' | 'critical';

export type ReturnItem = {
  id: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  title: string;
  quantity: number;
  reason: string | null;
  comment: string | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  createdAt: string;
  returnedAt: string | null;
};

type ReturnItemRow = {
  id: string;
  store_id: string;
  supplier_id: string;
  title: string;
  quantity: number;
  reason: string | null;
  comment: string | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  created_at: string;
  returned_at: string | null;
  suppliers: { name: string } | null;
};

function mapReturn(row: ReturnItemRow): ReturnItem {
  return {
    id: row.id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? '',
    title: row.title,
    quantity: row.quantity,
    reason: row.reason,
    comment: row.comment,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    returnedAt: row.returned_at,
  };
}

const SELECT_FIELDS =
  'id, store_id, supplier_id, title, quantity, reason, comment, status, priority, created_at, returned_at, suppliers(name)';

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

type CreateReturnInput = {
  organizationId: string;
  storeId: string;
  supplierId: string;
  createdBy: string;
  title: string;
  quantity: number;
  reason: string;
  priority: ReturnPriority;
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
      reason: input.reason || null,
      priority: input.priority,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_RETURN_FAILED');
  }

  return { success: true, data: mapReturn(data as unknown as ReturnItemRow) };
}

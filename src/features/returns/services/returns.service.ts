import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ReturnStatus = 'pending' | 'urgent' | 'returned' | 'archived';
export type ReturnPriority = 'low' | 'normal' | 'high' | 'critical';

export type ReturnItem = {
  id: string;
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  createdBy: string;
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
  organization_id: string;
  store_id: string;
  supplier_id: string;
  created_by: string;
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
    organizationId: row.organization_id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? '',
    createdBy: row.created_by,
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
  'id, organization_id, store_id, supplier_id, created_by, title, quantity, reason, comment, status, priority, created_at, returned_at, suppliers(name)';

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

type UpdateReturnInput = {
  supplierId: string;
  title: string;
  quantity: number;
  reason: string;
  priority: ReturnPriority;
};

export async function updateReturn(
  returnId: string,
  input: UpdateReturnInput,
): Promise<ServiceResult<ReturnItem>> {
  const { data, error } = await supabase
    .from('return_items')
    .update({
      supplier_id: input.supplierId,
      title: input.title,
      quantity: input.quantity,
      reason: input.reason || null,
      priority: input.priority,
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

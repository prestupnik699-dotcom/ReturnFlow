import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';
import type { ReturnStatus } from '@/features/returns/services/returns.service';

export type ReturnStats = {
  totalCount: number;
  totalQuantity: number;
  byStatus: Record<ReturnStatus, number>;
  bySupplier: { supplierId: string; supplierName: string; count: number }[];
};

type StatsRow = {
  id: string;
  quantity: number;
  status: ReturnStatus;
  supplier_id: string;
  suppliers: { name: string } | null;
};

export async function fetchReturnStats(
  storeId: string,
  sinceIso: string | null,
): Promise<ServiceResult<ReturnStats>> {
  let query = supabase
    .from('return_items')
    .select('id, quantity, status, supplier_id, suppliers(name)')
    .eq('store_id', storeId)
    .is('deleted_at', null);

  if (sinceIso) {
    query = query.gte('created_at', sinceIso);
  }

  const { data, error } = await query;

  if (error) {
    return fromCaughtError(error, 'FETCH_STATS_FAILED');
  }

  const rows = data as unknown as StatsRow[];

  const byStatus: Record<ReturnStatus, number> = {
    pending: 0,
    urgent: 0,
    returned: 0,
    archived: 0,
  };
  const supplierMap = new Map<
    string,
    { supplierId: string; supplierName: string; count: number }
  >();
  let totalQuantity = 0;

  for (const row of rows) {
    byStatus[row.status] += 1;
    totalQuantity += row.quantity;

    const existing = supplierMap.get(row.supplier_id);
    if (existing) {
      existing.count += 1;
    } else {
      supplierMap.set(row.supplier_id, {
        supplierId: row.supplier_id,
        supplierName: row.suppliers?.name ?? '',
        count: 1,
      });
    }
  }

  const bySupplier = Array.from(supplierMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    success: true,
    data: { totalCount: rows.length, totalQuantity, byStatus, bySupplier },
  };
}

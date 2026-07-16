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

type SupplierAgg = { supplierId: string; supplierName: string; count: number };

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
  const supplierMap = new Map<string, SupplierAgg>();
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

export type DailyActivityPoint = { date: string; count: number };

// Trailing 7 days (oldest → newest, including today) of return-creation
// counts, for the Dashboard's weekly activity chart. Grouped client-side
// from a single lightweight query rather than a per-day round trip.
export async function fetchWeeklyActivity(
  storeId: string,
): Promise<ServiceResult<DailyActivityPoint[]>> {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  const { data, error } = await supabase
    .from('return_items')
    .select('created_at')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .gte('created_at', start.toISOString());

  if (error) {
    return fromCaughtError(error, 'FETCH_WEEKLY_ACTIVITY_FAILED');
  }

  const rows = data as unknown as { created_at: string }[];

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const counts = new Map<string, number>();
  const points: DailyActivityPoint[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dayKey(d);
    counts.set(key, 0);
    points.push({ date: key, count: 0 });
  }

  for (const row of rows) {
    const key = dayKey(new Date(row.created_at));
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  for (const point of points) {
    point.count = counts.get(point.date) ?? 0;
  }

  return { success: true, data: points };
}

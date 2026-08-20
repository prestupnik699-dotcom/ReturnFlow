import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type WeeklyOrderSummary = {
  orderCount: number;
  itemCount: number;
};

// "Orders" don't have a header row (see catalog_order_items' own comment
// for why) — grouping by created_at here reconstructs how many distinct
// placeCatalogOrder calls happened this week, the same way order history
// does per-supplier, just across every supplier in the organization.
export async function fetchWeeklyOrderSummary(
  organizationId: string,
): Promise<ServiceResult<WeeklyOrderSummary>> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('catalog_order_items')
    .select('created_at, quantity')
    .eq('organization_id', organizationId)
    .gte('created_at', weekAgo.toISOString());

  if (error) {
    return fromCaughtError(error, 'FETCH_WEEKLY_ORDER_SUMMARY_FAILED');
  }

  const distinctBatches = new Set(data.map((row) => row.created_at));

  return {
    success: true,
    data: {
      orderCount: distinctBatches.size,
      itemCount: data.length,
    },
  };
}

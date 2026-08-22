export type OrderHistoryRow = {
  id: string;
  title: string;
  quantity: number;
  createdAt: string;
  catalogItemId: string | null;
};

export type GroupedOrderRow = {
  createdAt: string;
  items: OrderHistoryRow[];
};

// catalog_order_items has no header row — several rows sharing an
// identical created_at timestamp represent one order, because they were
// all written in the same INSERT statement (see placeCatalogOrder).
// Grouping by that exact value reconstructs the original order for
// display purposes. Input rows are expected to already be sorted
// newest-first; grouping preserves that order since it processes rows
// in the order given and only appends within an existing group.
export function groupOrderHistory(rows: OrderHistoryRow[]): GroupedOrderRow[] {
  const grouped = new Map<string, OrderHistoryRow[]>();

  for (const row of rows) {
    const key = row.createdAt;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(key, [row]);
    }
  }

  return Array.from(grouped.entries()).map(([createdAt, items]) => ({ createdAt, items }));
}

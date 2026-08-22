import {
  groupOrderHistory,
  type OrderHistoryRow,
} from '@/features/suppliers/utils/groupOrderHistory';

function makeRow(overrides: Partial<OrderHistoryRow> = {}): OrderHistoryRow {
  return {
    id: 'row-1',
    title: 'Domestos 1000ml',
    quantity: 2,
    createdAt: '2026-01-01T10:00:00.000Z',
    catalogItemId: 'catalog-1',
    ...overrides,
  };
}

describe('groupOrderHistory', () => {
  it('returns an empty array for no rows', () => {
    expect(groupOrderHistory([])).toEqual([]);
  });

  it('puts a single row into its own group', () => {
    const row = makeRow();
    expect(groupOrderHistory([row])).toEqual([{ createdAt: row.createdAt, items: [row] }]);
  });

  // This is the core rule: rows sharing an identical created_at
  // timestamp were written by the same placeCatalogOrder INSERT call,
  // so they represent one order and must be grouped together.
  it('groups rows that share the exact same createdAt timestamp', () => {
    const timestamp = '2026-01-01T10:00:00.000Z';
    const rowA = makeRow({ id: 'a', title: 'Domestos 1000ml', createdAt: timestamp });
    const rowB = makeRow({ id: 'b', title: 'Ajax 500ml', createdAt: timestamp });

    const result = groupOrderHistory([rowA, rowB]);

    expect(result).toHaveLength(1);
    expect(result[0]!.createdAt).toBe(timestamp);
    expect(result[0]!.items).toEqual([rowA, rowB]);
  });

  it('keeps rows with different timestamps in separate groups', () => {
    const rowA = makeRow({ id: 'a', createdAt: '2026-01-01T10:00:00.000Z' });
    const rowB = makeRow({ id: 'b', createdAt: '2026-01-02T10:00:00.000Z' });

    const result = groupOrderHistory([rowA, rowB]);

    expect(result).toHaveLength(2);
  });

  it('preserves the input order of distinct groups', () => {
    const rowA = makeRow({ id: 'a', createdAt: '2026-01-02T10:00:00.000Z' });
    const rowB = makeRow({ id: 'b', createdAt: '2026-01-01T10:00:00.000Z' });

    // Input rows are expected pre-sorted newest-first, as the service
    // queries them — grouping must not silently reorder them.
    const result = groupOrderHistory([rowA, rowB]);

    expect(result[0]!.createdAt).toBe('2026-01-02T10:00:00.000Z');
    expect(result[1]!.createdAt).toBe('2026-01-01T10:00:00.000Z');
  });

  it('handles three or more rows sharing one timestamp', () => {
    const timestamp = '2026-01-01T10:00:00.000Z';
    const rows = [
      makeRow({ id: 'a', createdAt: timestamp }),
      makeRow({ id: 'b', createdAt: timestamp }),
      makeRow({ id: 'c', createdAt: timestamp }),
    ];

    const result = groupOrderHistory(rows);

    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(3);
  });

  it('handles a mix of grouped and standalone rows', () => {
    const sharedTimestamp = '2026-01-01T10:00:00.000Z';
    const rows = [
      makeRow({ id: 'a', createdAt: sharedTimestamp }),
      makeRow({ id: 'b', createdAt: sharedTimestamp }),
      makeRow({ id: 'c', createdAt: '2026-01-02T10:00:00.000Z' }),
    ];

    const result = groupOrderHistory(rows);

    expect(result).toHaveLength(2);
    expect(result.find((g) => g.createdAt === sharedTimestamp)?.items).toHaveLength(2);
  });

  it('preserves each row with a null catalogItemId (deleted catalog item)', () => {
    const row = makeRow({ catalogItemId: null });
    const result = groupOrderHistory([row]);
    expect(result[0]!.items[0]!.catalogItemId).toBeNull();
  });
});

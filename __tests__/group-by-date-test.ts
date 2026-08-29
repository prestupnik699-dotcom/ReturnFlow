import { groupByDate } from '@/features/deliveries/utils/groupByDate';

function isoAt(daysAgo: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

describe('groupByDate', () => {
  it('returns an empty array for no items', () => {
    expect(groupByDate([])).toEqual([]);
  });

  it('labels an item from today as "today"', () => {
    const result = groupByDate([{ createdAt: isoAt(0) }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelKind).toBe('today');
  });

  it('labels an item from yesterday as "yesterday"', () => {
    const result = groupByDate([{ createdAt: isoAt(1) }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelKind).toBe('yesterday');
  });

  it('labels an item from further back as "date" with the iso preserved', () => {
    const iso = isoAt(5);
    const result = groupByDate([{ createdAt: iso }]);
    expect(result).toHaveLength(1);
    expect(result[0]!.labelKind).toBe('date');
    expect(result[0]!.dateIso).toBe(iso);
  });

  it('groups multiple items from the same day into one section', () => {
    const result = groupByDate([
      { createdAt: isoAt(0, 9) },
      { createdAt: isoAt(0, 14) },
      { createdAt: isoAt(0, 20) },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.data).toHaveLength(3);
  });

  it('preserves the input order of items within a section', () => {
    // Deliberately not sorted by time — the function must not re-sort,
    // since the caller may have sorted by name/quantity instead of date.
    const items = [
      { createdAt: isoAt(0, 20), name: 'C' },
      { createdAt: isoAt(0, 9), name: 'A' },
      { createdAt: isoAt(0, 14), name: 'B' },
    ];
    const result = groupByDate(items);
    expect(result[0]!.data.map((i) => i.name)).toEqual(['C', 'A', 'B']);
  });

  it('orders sections newest-day-first regardless of input item order', () => {
    const items = [{ createdAt: isoAt(5) }, { createdAt: isoAt(0) }, { createdAt: isoAt(1) }];
    const result = groupByDate(items);
    expect(result.map((s) => s.labelKind)).toEqual(['today', 'yesterday', 'date']);
  });

  it('gives each distinct day its own section', () => {
    const result = groupByDate([
      { createdAt: isoAt(2) },
      { createdAt: isoAt(3) },
      { createdAt: isoAt(4) },
    ]);
    expect(result).toHaveLength(3);
  });
});

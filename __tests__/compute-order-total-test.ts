import { computeOrderTotal } from '@/features/orders/utils/computeOrderTotal';

describe('computeOrderTotal', () => {
  it('returns zero total and no prices for an empty order', () => {
    expect(computeOrderTotal([])).toEqual({ total: 0, hasAnyPrice: false, hasMissingPrice: false });
  });

  it('sums quantity times unit price across all lines', () => {
    const result = computeOrderTotal([
      { quantity: 2, unitPrice: 10 },
      { quantity: 3, unitPrice: 5 },
    ]);
    expect(result.total).toBe(35);
    expect(result.hasAnyPrice).toBe(true);
    expect(result.hasMissingPrice).toBe(false);
  });

  it('treats a line with no price as contributing zero to the total', () => {
    const result = computeOrderTotal([
      { quantity: 2, unitPrice: 10 },
      { quantity: 5, unitPrice: null },
    ]);
    expect(result.total).toBe(20);
  });

  // This is the exact distinction the UI relies on to show "Итого: X
  // (у части товаров нет цены)" instead of presenting an incomplete sum
  // as if it were the real total.
  it('flags hasMissingPrice when at least one line has no price, even if others do', () => {
    const result = computeOrderTotal([
      { quantity: 1, unitPrice: 10 },
      { quantity: 1, unitPrice: null },
    ]);
    expect(result.hasAnyPrice).toBe(true);
    expect(result.hasMissingPrice).toBe(true);
  });

  it('reports no prices at all when every line lacks a price', () => {
    const result = computeOrderTotal([
      { quantity: 1, unitPrice: null },
      { quantity: 2, unitPrice: null },
    ]);
    expect(result.total).toBe(0);
    expect(result.hasAnyPrice).toBe(false);
    expect(result.hasMissingPrice).toBe(true);
  });

  it('reports no missing prices when every line has a price', () => {
    const result = computeOrderTotal([
      { quantity: 1, unitPrice: 10 },
      { quantity: 1, unitPrice: 20 },
    ]);
    expect(result.hasMissingPrice).toBe(false);
  });

  it('handles decimal prices without rounding errors affecting the comparison', () => {
    const result = computeOrderTotal([{ quantity: 3, unitPrice: 6.9 }]);
    expect(result.total).toBeCloseTo(20.7);
  });

  it('handles a zero quantity line without affecting the total incorrectly', () => {
    const result = computeOrderTotal([
      { quantity: 0, unitPrice: 10 },
      { quantity: 2, unitPrice: 5 },
    ]);
    expect(result.total).toBe(10);
  });
});

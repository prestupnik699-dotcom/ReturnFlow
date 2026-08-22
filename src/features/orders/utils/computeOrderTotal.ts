export type OrderTotalLine = {
  quantity: number;
  unitPrice: number | null;
};

export type OrderTotalSummary = {
  total: number;
  hasAnyPrice: boolean;
  hasMissingPrice: boolean;
};

// Lines without a unit price contribute 0 to the total but still count
// toward hasMissingPrice — the UI uses that to warn the sum is partial
// rather than silently presenting an incomplete total as if it were
// the real one.
export function computeOrderTotal(lines: OrderTotalLine[]): OrderTotalSummary {
  const hasAnyPrice = lines.some((line) => line.unitPrice != null);
  const hasMissingPrice = lines.some((line) => line.unitPrice == null);
  const total = lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);

  return { total, hasAnyPrice, hasMissingPrice };
}

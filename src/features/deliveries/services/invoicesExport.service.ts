function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export type InvoiceExportRow = {
  invoiceNumber: string;
  distributorName: string;
  totalAmount: number | null;
  pageCount: number | null;
  itemCount: number | null;
  hasSignature: boolean;
  receivedAt: string;
};

export type InvoiceExportLabels = {
  columns: {
    invoiceNumber: string;
    distributor: string;
    totalAmount: string;
    pages: string;
    items: string;
    signature: string;
    date: string;
  };
  yes: string;
  no: string;
  reportTitle: string;
  totalInvoicesLabel: string;
  grandTotalLabel: string;
};

function grandTotal(rows: InvoiceExportRow[]): number {
  return rows.reduce((sum, row) => sum + (row.totalAmount ?? 0), 0);
}

export function generateInvoicesCsv(rows: InvoiceExportRow[], labels: InvoiceExportLabels): string {
  const header = [
    labels.columns.invoiceNumber,
    labels.columns.distributor,
    labels.columns.totalAmount,
    labels.columns.pages,
    labels.columns.items,
    labels.columns.signature,
    labels.columns.date,
  ]
    .map(csvEscape)
    .join(',');

  const lines = rows.map((row) =>
    [
      row.invoiceNumber,
      row.distributorName,
      row.totalAmount != null ? formatMoney(row.totalAmount) : '',
      row.pageCount != null ? String(row.pageCount) : '',
      row.itemCount != null ? String(row.itemCount) : '',
      row.hasSignature ? labels.yes : labels.no,
      formatDate(row.receivedAt),
    ]
      .map(csvEscape)
      .join(','),
  );

  // A trailing summary row, same reasoning as the returns export — the
  // accountant sees the total at a glance instead of summing manually.
  const totalRow = [labels.grandTotalLabel, '', formatMoney(grandTotal(rows)), '', '', '', '']
    .map(csvEscape)
    .join(',');

  // BOM so Excel opens Cyrillic/Georgian text as UTF-8 correctly.
  return '\uFEFF' + [header, ...lines, totalRow].join('\n');
}

export function generateInvoicesHtml(
  rows: InvoiceExportRow[],
  labels: InvoiceExportLabels,
): string {
  const tableRows = rows
    .map(
      (row) => `
    <tr>
      <td>${row.invoiceNumber}</td>
      <td>${row.distributorName}</td>
      <td style="text-align:right">${row.totalAmount != null ? formatMoney(row.totalAmount) + '₾' : ''}</td>
      <td style="text-align:right">${row.pageCount ?? ''}</td>
      <td style="text-align:right">${row.itemCount ?? ''}</td>
      <td>${row.hasSignature ? labels.yes : labels.no}</td>
      <td>${formatDate(row.receivedAt)}</td>
    </tr>`,
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  tfoot td { font-weight: 700; border-top: 2px solid #333; }
</style>
</head>
<body>
  <h1>${labels.reportTitle}</h1>
  <div class="meta">${labels.totalInvoicesLabel}: ${rows.length}</div>
  <table>
    <thead>
      <tr>
        <th>${labels.columns.invoiceNumber}</th>
        <th>${labels.columns.distributor}</th>
        <th style="text-align:right">${labels.columns.totalAmount}</th>
        <th style="text-align:right">${labels.columns.pages}</th>
        <th style="text-align:right">${labels.columns.items}</th>
        <th>${labels.columns.signature}</th>
        <th>${labels.columns.date}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">${labels.grandTotalLabel}</td>
        <td style="text-align:right">${formatMoney(grandTotal(rows))}₾</td>
        <td colspan="4"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

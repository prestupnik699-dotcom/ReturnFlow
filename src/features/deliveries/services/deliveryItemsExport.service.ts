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

export type DeliveryExportRow = {
  title: string;
  supplierName: string;
  quantity: number;
  barcode: string | null;
  createdAt: string;
};

export type DeliveryExportLabels = {
  columns: {
    title: string;
    supplier: string;
    quantity: string;
    barcode: string;
    date: string;
  };
  reportTitle: string;
  totalItemsLabel: string;
};

export function generateDeliveryItemsCsv(
  rows: DeliveryExportRow[],
  labels: DeliveryExportLabels,
): string {
  const header = [
    labels.columns.title,
    labels.columns.supplier,
    labels.columns.quantity,
    labels.columns.barcode,
    labels.columns.date,
  ]
    .map(csvEscape)
    .join(',');

  const lines = rows.map((row) =>
    [
      row.title,
      row.supplierName,
      String(row.quantity),
      row.barcode ?? '',
      formatDate(row.createdAt),
    ]
      .map(csvEscape)
      .join(','),
  );

  // BOM so Excel opens Cyrillic/Georgian text as UTF-8 correctly.
  return '\uFEFF' + [header, ...lines].join('\n');
}

export function generateDeliveryItemsHtml(
  rows: DeliveryExportRow[],
  labels: DeliveryExportLabels,
): string {
  const tableRows = rows
    .map(
      (row) => `
    <tr>
      <td>${row.title}</td>
      <td>${row.supplierName}</td>
      <td style="text-align:right">${row.quantity}</td>
      <td>${row.barcode ?? ''}</td>
      <td>${formatDate(row.createdAt)}</td>
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
</style>
</head>
<body>
  <h1>${labels.reportTitle}</h1>
  <div class="meta">${labels.totalItemsLabel}: ${rows.length}</div>
  <table>
    <thead>
      <tr>
        <th>${labels.columns.title}</th>
        <th>${labels.columns.supplier}</th>
        <th style="text-align:right">${labels.columns.quantity}</th>
        <th>${labels.columns.barcode}</th>
        <th>${labels.columns.date}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;
}

import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';
import type { ReturnStatus, ReturnPriority } from '@/features/returns/services/returns.service';

export type ExportRow = {
  title: string;
  supplierName: string;
  quantity: number;
  unitPrice: number | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  barcode: string | null;
  isExchange: boolean;
  reason: string | null;
  createdAt: string;
};

type ExportRowRaw = {
  title: string;
  quantity: number;
  unit_price: number | null;
  status: ReturnStatus;
  priority: ReturnPriority;
  barcode: string | null;
  is_exchange: boolean;
  reason: string | null;
  created_at: string;
  suppliers: { name: string } | null;
};

export async function fetchReturnsForExport(
  storeId: string,
  sinceIso: string | null,
): Promise<ServiceResult<ExportRow[]>> {
  let query = supabase
    .from('return_items')
    .select(
      'title, quantity, unit_price, status, priority, barcode, is_exchange, reason, created_at, suppliers(name)',
    )
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (sinceIso) {
    query = query.gte('created_at', sinceIso);
  }

  const { data, error } = await query;

  if (error) {
    return fromCaughtError(error, 'FETCH_EXPORT_DATA_FAILED');
  }

  const rows = data as unknown as ExportRowRaw[];

  return {
    success: true,
    data: rows.map((row) => ({
      title: row.title,
      supplierName: row.suppliers?.name ?? '',
      quantity: row.quantity,
      unitPrice: row.unit_price,
      status: row.status,
      priority: row.priority,
      barcode: row.barcode,
      isExchange: row.is_exchange,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type ExportLabels = {
  columns: {
    title: string;
    supplier: string;
    quantity: string;
    unitPrice: string;
    total: string;
    status: string;
    priority: string;
    barcode: string;
    exchange: string;
    reason: string;
    date: string;
  };
  statusLabels: Record<ReturnStatus, string>;
  priorityLabels: Record<ReturnPriority, string>;
  yes: string;
  no: string;
  reportTitle: string;
  grandTotalLabel: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function lineTotal(row: ExportRow): number | null {
  return row.unitPrice == null ? null : row.unitPrice * row.quantity;
}

function grandTotal(rows: ExportRow[]): number {
  return rows.reduce((sum, row) => {
    const total = lineTotal(row);
    return total == null ? sum : sum + total;
  }, 0);
}

export function generateReturnsCsv(rows: ExportRow[], labels: ExportLabels): string {
  const header = [
    labels.columns.title,
    labels.columns.supplier,
    labels.columns.quantity,
    labels.columns.unitPrice,
    labels.columns.total,
    labels.columns.status,
    labels.columns.priority,
    labels.columns.barcode,
    labels.columns.exchange,
    labels.columns.reason,
    labels.columns.date,
  ]
    .map(csvEscape)
    .join(',');

  const lines = rows.map((row) => {
    const total = lineTotal(row);
    return [
      row.title,
      row.supplierName,
      String(row.quantity),
      row.unitPrice != null ? formatMoney(row.unitPrice) : '',
      total != null ? formatMoney(total) : '',
      labels.statusLabels[row.status],
      labels.priorityLabels[row.priority],
      row.barcode ?? '',
      row.isExchange ? labels.yes : labels.no,
      row.reason ?? '',
      formatDate(row.createdAt),
    ]
      .map((v) => csvEscape(v))
      .join(',');
  });

  // A trailing summary row so the accountant sees the total value of the
  // whole export at a glance, not just per-line amounts they'd have to
  // sum themselves in a spreadsheet.
  const totalRow = [
    labels.grandTotalLabel,
    '',
    '',
    '',
    formatMoney(grandTotal(rows)),
    '',
    '',
    '',
    '',
    '',
    '',
  ]
    .map(csvEscape)
    .join(',');

  // BOM so Excel opens Cyrillic/Georgian text as UTF-8 correctly instead of
  // garbling it — a very common gotcha with plain CSV + non-Latin text.
  return '\uFEFF' + [header, ...lines, totalRow].join('\n');
}

export function generateReturnsHtml(rows: ExportRow[], labels: ExportLabels): string {
  const tableRows = rows
    .map((row) => {
      const total = lineTotal(row);
      return `
      <tr>
        <td>${row.title}</td>
        <td>${row.supplierName}</td>
        <td style="text-align:center">${row.quantity}</td>
        <td style="text-align:right">${row.unitPrice != null ? formatMoney(row.unitPrice) : ''}</td>
        <td style="text-align:right">${total != null ? formatMoney(total) : ''}</td>
        <td>${labels.statusLabels[row.status]}</td>
        <td>${labels.priorityLabels[row.priority]}</td>
        <td>${row.barcode ?? ''}</td>
        <td style="text-align:center">${row.isExchange ? labels.yes : labels.no}</td>
        <td>${row.reason ?? ''}</td>
        <td>${formatDate(row.createdAt)}</td>
      </tr>`;
    })
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f2f2f2; font-weight: 600; }
          tfoot td { font-weight: 700; background: #f8f8f8; }
        </style>
      </head>
      <body>
        <h1>${labels.reportTitle}</h1>
        <div class="meta">${formatDate(new Date().toISOString())} · ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>${labels.columns.title}</th>
              <th>${labels.columns.supplier}</th>
              <th>${labels.columns.quantity}</th>
              <th>${labels.columns.unitPrice}</th>
              <th>${labels.columns.total}</th>
              <th>${labels.columns.status}</th>
              <th>${labels.columns.priority}</th>
              <th>${labels.columns.barcode}</th>
              <th>${labels.columns.exchange}</th>
              <th>${labels.columns.reason}</th>
              <th>${labels.columns.date}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right">${labels.grandTotalLabel}</td>
              <td style="text-align:right">${formatMoney(grandTotal(rows))}</td>
              <td colspan="6"></td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
}

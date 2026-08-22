import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type OrderPdfLine = {
  title: string;
  quantity: number;
  unitPrice: number | null;
};

type OrderPdfLabels = {
  documentTitle: string;
  columnItem: string;
  columnQuantity: string;
  columnPrice: string;
  columnSubtotal: string;
  totalLabel: string;
  noteLabel: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Mirrors generateSupplierDefectReportHtml's visual style (same fonts,
// table borders, header treatment) so every PDF the app produces looks
// like part of the same product, rather than each export inventing its
// own look.
function generateOrderHtml(
  supplierName: string,
  lines: OrderPdfLine[],
  note: string,
  labels: OrderPdfLabels,
): string {
  const tableRows = lines
    .map((line, index) => {
      const subtotal = line.unitPrice != null ? line.unitPrice * line.quantity : null;
      return `
      <tr>
        <td>${index + 1}. ${line.title}</td>
        <td style="text-align:center">${line.quantity}</td>
        <td style="text-align:right">${line.unitPrice != null ? line.unitPrice.toLocaleString() : '—'}</td>
        <td style="text-align:right">${subtotal != null ? subtotal.toLocaleString() : '—'}</td>
      </tr>`;
    })
    .join('');

  const total = lines.reduce(
    (sum, line) => sum + (line.unitPrice != null ? line.unitPrice * line.quantity : 0),
    0,
  );
  const hasAnyPrice = lines.some((line) => line.unitPrice != null);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 2px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
          th, td { border: 1px solid #ccc; padding: 7px 9px; text-align: left; }
          th { background: #f2f2f2; font-weight: 600; }
          .total { text-align: right; font-size: 14px; font-weight: 700; margin-bottom: 16px; }
          .note { font-size: 12px; color: #333; border-top: 1px solid #ddd; padding-top: 12px; }
          .note .label { font-weight: 600; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>${labels.documentTitle}: ${supplierName}</h1>
        <div class="meta">${formatDate(new Date().toISOString())}</div>

        <table>
          <thead>
            <tr>
              <th>${labels.columnItem}</th>
              <th>${labels.columnQuantity}</th>
              <th>${labels.columnPrice}</th>
              <th>${labels.columnSubtotal}</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>

        ${hasAnyPrice ? `<div class="total">${labels.totalLabel} ${total.toLocaleString()}</div>` : ''}

        ${
          note.trim()
            ? `<div class="note"><div class="label">${labels.noteLabel}</div>${note.trim()}</div>`
            : ''
        }
      </body>
    </html>
  `;
}

async function saveOnAndroid(base64: string, filename: string): Promise<void> {
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('PERMISSION_DENIED');
  }
  const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    'application/pdf',
  );
  await FileSystem.writeAsStringAsync(destinationUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

// Shares the order as a PDF instead of plain text — same underlying data,
// a more formal look for suppliers who expect a proper order document
// rather than a chat message.
export async function shareOrderAsPdf(
  supplierName: string,
  lines: OrderPdfLine[],
  note: string,
  labels: OrderPdfLabels,
): Promise<void> {
  const html = generateOrderHtml(supplierName, lines, note, labels);
  const printResult = await Print.printToFileAsync({ html, base64: true });

  if (!printResult.base64) {
    throw new Error('PDF_GENERATION_FAILED');
  }

  const filename = `${supplierName.replace(/[^a-zA-Z0-9а-яА-Я ]/g, '')}-order-${Date.now()}.pdf`;

  if (Platform.OS === 'android') {
    await saveOnAndroid(printResult.base64, filename);
  } else {
    await Sharing.shareAsync(printResult.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
  }
}

import { fetchBarcodeShortcut } from '@/features/scanner/services/barcodeShortcuts.service';

export async function getBarcodeShortcut(storeId: string, barcode: string) {
  const result = await fetchBarcodeShortcut(storeId, barcode);
  if (!result.success) return null;
  return result.data;
}

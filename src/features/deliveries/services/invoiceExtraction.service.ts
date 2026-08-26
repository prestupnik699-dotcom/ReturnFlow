import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type ExtractedInvoiceFields = {
  invoiceNumber: string | null;
  distributorName: string | null;
  totalAmount: number | null;
  pageCount: number | null;
  itemCount: number | null;
};

// Downscaled before sending — the photo only needs to be legible enough
// for Gemini to read printed text, not full resolution, and a smaller
// payload means a faster round trip on a store's likely-mediocre wifi.
async function resizeForRecognition(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  return result.uri;
}

export async function extractInvoicePhoto(
  localUri: string,
): Promise<ServiceResult<ExtractedInvoiceFields>> {
  try {
    const resizedUri = await resizeForRecognition(localUri);
    const file = new File(resizedUri);
    const imageBase64 = await file.base64();

    const { data, error } = await supabase.functions.invoke('extract-invoice-photo', {
      body: { imageBase64, mimeType: 'image/jpeg' },
    });

    if (error) {
      return fromCaughtError(error, 'EXTRACT_INVOICE_FAILED');
    }

    if (data?.error) {
      return fromCaughtError(new Error(data.error), 'EXTRACT_INVOICE_FAILED');
    }

    const extracted = data?.extracted ?? {};

    return {
      success: true,
      data: {
        invoiceNumber: extracted.invoiceNumber ?? null,
        distributorName: extracted.distributorName ?? null,
        totalAmount: extracted.totalAmount ?? null,
        pageCount: extracted.pageCount ?? null,
        itemCount: extracted.itemCount ?? null,
      },
    };
  } catch (error) {
    return fromCaughtError(error, 'EXTRACT_INVOICE_FAILED');
  }
}

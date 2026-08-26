import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type DeliveryInvoice = {
  id: string;
  organizationId: string;
  storeId: string;
  supplierId: string | null;
  createdBy: string;
  invoiceNumber: string;
  distributorName: string;
  receivedAt: string;
  totalAmount: number | null;
  pageCount: number | null;
  itemCount: number | null;
  hasSignature: boolean;
  photoUrl: string | null;
  createdAt: string;
};

type DeliveryInvoiceRow = {
  id: string;
  organization_id: string;
  store_id: string;
  supplier_id: string | null;
  created_by: string;
  invoice_number: string;
  distributor_name: string;
  received_at: string;
  total_amount: number | null;
  page_count: number | null;
  item_count: number | null;
  has_signature: boolean;
  photo_url: string | null;
  created_at: string;
};

const SELECT_FIELDS =
  'id, organization_id, store_id, supplier_id, created_by, invoice_number, distributor_name, received_at, total_amount, page_count, item_count, has_signature, photo_url, created_at';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function mapRow(row: DeliveryInvoiceRow): DeliveryInvoice {
  return {
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    createdBy: row.created_by,
    invoiceNumber: row.invoice_number,
    distributorName: row.distributor_name,
    receivedAt: row.received_at,
    totalAmount: row.total_amount,
    pageCount: row.page_count,
    itemCount: row.item_count,
    hasSignature: row.has_signature,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  };
}

async function resizeForStorage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return result.uri;
}

export type CreateDeliveryInvoiceInput = {
  organizationId: string;
  storeId: string;
  supplierId: string | null;
  createdBy: string;
  invoiceNumber: string;
  distributorName: string;
  totalAmount: number | null;
  pageCount: number | null;
  itemCount: number | null;
  hasSignature: boolean;
  // Local file URI of the invoice photo, still on-device — the row is
  // created first (see the storage bucket migration's comment for why),
  // then the photo is uploaded referencing this row's freshly-created id,
  // then photo_url is set on the same row.
  localPhotoUri: string | null;
};

export async function createDeliveryInvoice(
  input: CreateDeliveryInvoiceInput,
): Promise<ServiceResult<DeliveryInvoice>> {
  const { data, error } = await supabase
    .from('delivery_invoices')
    .insert({
      organization_id: input.organizationId,
      store_id: input.storeId,
      supplier_id: input.supplierId,
      created_by: input.createdBy,
      invoice_number: input.invoiceNumber,
      distributor_name: input.distributorName,
      total_amount: input.totalAmount,
      page_count: input.pageCount,
      item_count: input.itemCount,
      has_signature: input.hasSignature,
    })
    .select(SELECT_FIELDS)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_DELIVERY_INVOICE_FAILED');
  }

  let invoice = mapRow(data as unknown as DeliveryInvoiceRow);

  if (input.localPhotoUri) {
    try {
      const resizedUri = await resizeForStorage(input.localPhotoUri);
      const file = new File(resizedUri);
      const bytes = await file.bytes();
      const photoPath = `${invoice.id}/photo.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('delivery-invoices')
        .upload(photoPath, bytes, { contentType: 'image/jpeg' });

      if (!uploadError) {
        const { data: updated } = await supabase
          .from('delivery_invoices')
          .update({ photo_url: photoPath })
          .eq('id', invoice.id)
          .select(SELECT_FIELDS)
          .single();

        if (updated) {
          invoice = mapRow(updated as unknown as DeliveryInvoiceRow);
        }
      }
      // A photo upload failure after the row is already saved isn't
      // treated as a hard failure — the journal entry itself (the
      // important part) is safely saved either way, just without a
      // photo attached this time.
    } catch {
      // Same reasoning — swallow and keep the successfully created entry.
    }
  }

  return { success: true, data: invoice };
}

export async function fetchDeliveryInvoices(
  storeId: string,
): Promise<ServiceResult<DeliveryInvoice[]>> {
  const { data, error } = await supabase
    .from('delivery_invoices')
    .select(SELECT_FIELDS)
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .order('received_at', { ascending: false });

  if (error) {
    return fromCaughtError(error, 'FETCH_DELIVERY_INVOICES_FAILED');
  }

  return { success: true, data: (data as unknown as DeliveryInvoiceRow[]).map(mapRow) };
}

export async function fetchDeliveryInvoicePhotoUrl(photoPath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('delivery-invoices')
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}

export async function deleteDeliveryInvoice(invoiceId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('delivery_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', invoiceId);

  if (error) {
    return fromCaughtError(error, 'DELETE_DELIVERY_INVOICE_FAILED');
  }

  return { success: true, data: null };
}

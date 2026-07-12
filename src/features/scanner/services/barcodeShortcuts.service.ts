import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type BarcodeShortcut = {
  id: string;
  barcode: string;
  supplierId: string;
  supplierName: string;
  title: string;
};

type BarcodeShortcutRow = {
  id: string;
  barcode: string;
  supplier_id: string;
  title: string;
  suppliers: { name: string } | null;
};

export async function fetchBarcodeShortcut(
  storeId: string,
  barcode: string,
): Promise<ServiceResult<BarcodeShortcut | null>> {
  const { data, error } = await supabase
    .from('barcode_shortcuts')
    .select('id, barcode, supplier_id, title, suppliers(name)')
    .eq('store_id', storeId)
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    return fromCaughtError(error, 'FETCH_BARCODE_SHORTCUT_FAILED');
  }

  if (!data) {
    return { success: true, data: null };
  }

  const row = data as unknown as BarcodeShortcutRow;

  return {
    success: true,
    data: {
      id: row.id,
      barcode: row.barcode,
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name ?? '',
      title: row.title,
    },
  };
}

type SaveShortcutInput = {
  organizationId: string;
  storeId: string;
  barcode: string;
  supplierId: string;
  title: string;
  createdBy: string;
};

export async function saveBarcodeShortcut(input: SaveShortcutInput): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('barcode_shortcuts').upsert(
    {
      organization_id: input.organizationId,
      store_id: input.storeId,
      barcode: input.barcode,
      supplier_id: input.supplierId,
      title: input.title,
      created_by: input.createdBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'store_id,barcode' },
  );

  if (error) {
    return fromCaughtError(error, 'SAVE_BARCODE_SHORTCUT_FAILED');
  }

  return { success: true, data: null };
}

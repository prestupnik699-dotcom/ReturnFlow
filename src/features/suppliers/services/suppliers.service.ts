import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  favorite: boolean;
  isActive: boolean;
};

type SupplierRow = {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  favorite: boolean;
  is_active: boolean;
};

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    favorite: row.favorite,
    isActive: row.is_active,
  };
}

export type SupplierSort = 'name' | 'recent';

type FetchSuppliersInput = {
  organizationId: string;
  search?: string;
  favoritesOnly?: boolean;
  sort?: SupplierSort;
};

export async function fetchSuppliers(
  input: FetchSuppliersInput,
): Promise<ServiceResult<Supplier[]>> {
  let query = supabase
    .from('suppliers')
    .select('id, organization_id, name, contact_name, phone, email, favorite, is_active')
    .eq('organization_id', input.organizationId)
    .is('deleted_at', null);

  if (input.favoritesOnly) {
    query = query.eq('favorite', true);
  }

  if (input.search && input.search.trim().length > 0) {
    query = query.textSearch('search_vector', input.search.trim(), {
      type: 'websearch',
      config: 'simple',
    });
  }

  query =
    input.sort === 'recent'
      ? query.order('created_at', { ascending: false })
      : query.order('favorite', { ascending: false }).order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    return fromCaughtError(error, 'FETCH_SUPPLIERS_FAILED');
  }

  return { success: true, data: data.map(mapSupplier) };
}

export async function fetchSupplierById(supplierId: string): Promise<ServiceResult<Supplier>> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, organization_id, name, contact_name, phone, email, favorite, is_active')
    .eq('id', supplierId)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'FETCH_SUPPLIER_FAILED');
  }

  return { success: true, data: mapSupplier(data) };
}

type SupplierFormInput = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
};

export async function createSupplier(
  input: SupplierFormInput & { organizationId: string },
): Promise<ServiceResult<Supplier>> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      contact_name: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
    })
    .select('id, organization_id, name, contact_name, phone, email, favorite, is_active')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_SUPPLIER_FAILED');
  }

  return { success: true, data: mapSupplier(data) };
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierFormInput,
): Promise<ServiceResult<Supplier>> {
  const { data, error } = await supabase
    .from('suppliers')
    .update({
      name: input.name,
      contact_name: input.contactName || null,
      phone: input.phone || null,
      email: input.email || null,
    })
    .eq('id', supplierId)
    .select('id, organization_id, name, contact_name, phone, email, favorite, is_active')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'UPDATE_SUPPLIER_FAILED');
  }

  return { success: true, data: mapSupplier(data) };
}

export async function toggleSupplierFavorite(
  supplierId: string,
  favorite: boolean,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('suppliers').update({ favorite }).eq('id', supplierId);

  if (error) {
    return fromCaughtError(error, 'TOGGLE_FAVORITE_FAILED');
  }

  return { success: true, data: null };
}

export async function deleteSupplier(supplierId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('suppliers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', supplierId);

  if (error) {
    return fromCaughtError(error, 'DELETE_SUPPLIER_FAILED');
  }

  return { success: true, data: null };
}

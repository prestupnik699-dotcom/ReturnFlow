import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type Store = {
  id: string;
  organizationId: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

type StoreRow = {
  id: string;
  organization_id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

function mapStore(row: StoreRow): Store {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    city: row.city,
    address: row.address,
    phone: row.phone,
    isActive: row.is_active,
  };
}

export async function fetchStores(organizationId: string): Promise<ServiceResult<Store[]>> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, organization_id, name, city, address, phone, is_active')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    return fromCaughtError(error, 'FETCH_STORES_FAILED');
  }

  return { success: true, data: data.map(mapStore) };
}

type CreateStoreInput = {
  organizationId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
};

export async function createStore(input: CreateStoreInput): Promise<ServiceResult<Store>> {
  const { data, error } = await supabase
    .from('stores')
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      city: input.city || null,
      address: input.address || null,
      phone: input.phone || null,
    })
    .select('id, organization_id, name, city, address, phone, is_active')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_STORE_FAILED');
  }

  return { success: true, data: mapStore(data) };
}

export async function deleteStore(storeId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('stores')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', storeId);

  if (error) {
    return fromCaughtError(error, 'DELETE_STORE_FAILED');
  }

  return { success: true, data: null };
}

type UpdateStoreInput = {
  name: string;
  city: string;
  address: string;
  phone: string;
};

export async function updateStore(
  storeId: string,
  input: UpdateStoreInput,
): Promise<ServiceResult<Store>> {
  const { data, error } = await supabase
    .from('stores')
    .update({
      name: input.name,
      city: input.city || null,
      address: input.address || null,
      phone: input.phone || null,
    })
    .eq('id', storeId)
    .select('id, organization_id, name, city, address, phone, is_active')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'UPDATE_STORE_FAILED');
  }

  return { success: true, data: mapStore(data) };
}

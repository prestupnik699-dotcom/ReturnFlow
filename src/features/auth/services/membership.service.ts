import { supabase } from '@/lib/supabase';

export type MembershipRole =
  'Owner' | 'Administrator' | 'StoreManager' | 'Receiver' | 'Employee' | 'Viewer';

export type Membership = {
  id: string;
  organizationId: string;
  storeId: string | null;
  role: MembershipRole;
};

export async function fetchMemberships(profileId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, organization_id, store_id, role')
    .eq('profile_id', profileId)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return data.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    storeId: row.store_id,
    role: row.role,
  }));
}

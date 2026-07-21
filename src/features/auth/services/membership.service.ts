import { supabase } from '@/lib/supabase';

export type MembershipRole = 'Owner' | 'StoreManager' | 'Employee';

export type Membership = {
  id: string;
  organizationId: string;
  storeId: string | null;
  role: MembershipRole;
};

export async function fetchMemberships(profileId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, organization_id, store_id, role, organizations(id)')
    .eq('profile_id', profileId)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  // If the related organization is soft-deleted, RLS hides it from this
  // embedded select entirely (it comes back null) — that is how we detect
  // and drop memberships belonging to a deleted organization here.
  return data
    .filter((row) => row.organizations !== null)
    .map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      storeId: row.store_id,
      role: row.role,
    }));
}

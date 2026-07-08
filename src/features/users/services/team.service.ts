import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';
import type { MembershipRole } from '@/features/auth/services/membership.service';

export type ProfileStatus = 'active' | 'vacation' | 'blocked';

export type TeamMember = {
  membershipId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  role: MembershipRole;
  status: ProfileStatus;
  storeId: string | null;
};

type TeamMemberRow = {
  id: string;
  profile_id: string;
  role: MembershipRole;
  store_id: string | null;
  profiles: { first_name: string; last_name: string; status: ProfileStatus } | null;
};

export async function fetchTeamMembers(
  organizationId: string,
): Promise<ServiceResult<TeamMember[]>> {
  const { data, error } = await supabase
    .from('memberships')
    .select('id, profile_id, role, store_id, profiles(first_name, last_name, status)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null);

  if (error) {
    return fromCaughtError(error, 'FETCH_TEAM_FAILED');
  }

  const members = (data as unknown as TeamMemberRow[])
    .filter((row) => row.profiles !== null)
    .map((row) => ({
      membershipId: row.id,
      profileId: row.profile_id,
      firstName: row.profiles!.first_name,
      lastName: row.profiles!.last_name,
      role: row.role,
      status: row.profiles!.status,
      storeId: row.store_id,
    }));

  return { success: true, data: members };
}

export async function updateMemberRole(
  membershipId: string,
  role: MembershipRole,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('memberships').update({ role }).eq('id', membershipId);

  if (error) {
    return fromCaughtError(error, 'UPDATE_ROLE_FAILED');
  }

  return { success: true, data: null };
}

export async function removeMemberAccess(membershipId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('memberships')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', membershipId);

  if (error) {
    return fromCaughtError(error, 'REMOVE_ACCESS_FAILED');
  }

  return { success: true, data: null };
}

export async function setMemberStatus(
  membershipId: string,
  status: ProfileStatus,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('set_member_status', {
    target_membership_id: membershipId,
    new_status: status,
  });

  if (error) {
    return fromCaughtError(error, 'SET_STATUS_FAILED');
  }

  return { success: true, data: null };
}

import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';
import type { MembershipRole } from '@/features/auth/services/membership.service';

export type Invitation = {
  id: string;
  code: string;
  role: MembershipRole;
  expiresAt: string;
};

type CreateInvitationInput = {
  organizationId: string;
  role: MembershipRole;
};

export async function createInvitation(
  input: CreateInvitationInput,
  invitedBy: string,
): Promise<ServiceResult<Invitation>> {
  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: input.organizationId,
      store_id: null,
      role: input.role,
      invited_by: invitedBy,
    })
    .select('id, code, role, expires_at')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'CREATE_INVITATION_FAILED');
  }

  return {
    success: true,
    data: { id: data.id, code: data.code, role: data.role, expiresAt: data.expires_at },
  };
}

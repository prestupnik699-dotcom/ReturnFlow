import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type Organization = {
  id: string;
  name: string;
};

type CreateOrganizationInput = {
  name: string;
  defaultLanguage: string;
};

export async function createOrganization(
  input: CreateOrganizationInput,
  profileId: string,
): Promise<ServiceResult<Organization>> {
  // Generated client-side and inserted explicitly: RLS only allows SELECTing
  // an organization once a membership exists for it, which isn't true yet at
  // this point in the flow — the default insert().select() re-fetch would
  // fail here, before we ever get to creating that membership.
  const organizationId = Crypto.randomUUID();

  const { error: orgError } = await supabase
    .from('organizations')
    .insert({ id: organizationId, name: input.name, default_language: input.defaultLanguage });

  if (orgError) {
    return fromCaughtError(orgError, 'CREATE_ORGANIZATION_FAILED');
  }

  const { error: membershipError } = await supabase.from('memberships').insert({
    profile_id: profileId,
    organization_id: organizationId,
    store_id: null,
    role: 'Owner',
  });

  if (membershipError) {
    return fromCaughtError(membershipError, 'CREATE_MEMBERSHIP_FAILED');
  }

  return { success: true, data: { id: organizationId, name: input.name } };
}

import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export type Organization = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  country: string | null;
  defaultLanguage: string;
  timezone: string;
};

type CreateOrganizationInput = {
  name: string;
  defaultLanguage: string;
};

export async function createOrganization(
  input: CreateOrganizationInput,
  profileId: string,
): Promise<ServiceResult<Organization>> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: input.name, default_language: input.defaultLanguage })
    .select('id, name, logo_url, primary_color, country, default_language, timezone')
    .single();

  if (orgError || !org) {
    return fromCaughtError(orgError, 'CREATE_ORGANIZATION_FAILED');
  }

  const { error: membershipError } = await supabase.from('memberships').insert({
    profile_id: profileId,
    organization_id: org.id,
    store_id: null,
    role: 'Owner',
  });

  if (membershipError) {
    return fromCaughtError(membershipError, 'CREATE_MEMBERSHIP_FAILED');
  }

  return {
    success: true,
    data: {
      id: org.id,
      name: org.name,
      logoUrl: org.logo_url,
      primaryColor: org.primary_color,
      country: org.country,
      defaultLanguage: org.default_language,
      timezone: org.timezone,
    },
  };
}

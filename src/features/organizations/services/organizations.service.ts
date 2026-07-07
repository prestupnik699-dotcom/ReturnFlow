import { supabase } from '@/lib/supabase';
import * as Crypto from 'expo-crypto';
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

type OrganizationRow = {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  country: string | null;
  default_language: string;
  timezone: string;
};

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    country: row.country,
    defaultLanguage: row.default_language,
    timezone: row.timezone,
  };
}

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
  // this point in the flow.
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

  return {
    success: true,
    data: {
      id: organizationId,
      name: input.name,
      logoUrl: null,
      primaryColor: null,
      country: null,
      defaultLanguage: input.defaultLanguage,
      timezone: 'Asia/Tbilisi',
    },
  };
}

export async function fetchOrganization(
  organizationId: string,
): Promise<ServiceResult<Organization>> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, logo_url, primary_color, country, default_language, timezone')
    .eq('id', organizationId)
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'FETCH_ORGANIZATION_FAILED');
  }

  return { success: true, data: mapOrganization(data) };
}

type UpdateOrganizationInput = {
  name: string;
  defaultLanguage: string;
};

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<ServiceResult<Organization>> {
  const { data, error } = await supabase
    .from('organizations')
    .update({ name: input.name, default_language: input.defaultLanguage })
    .eq('id', organizationId)
    .select('id, name, logo_url, primary_color, country, default_language, timezone')
    .single();

  if (error || !data) {
    return fromCaughtError(error, 'UPDATE_ORGANIZATION_FAILED');
  }

  return { success: true, data: mapOrganization(data) };
}

export async function deleteOrganization(organizationId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', organizationId);

  if (error) {
    return fromCaughtError(error, 'DELETE_ORGANIZATION_FAILED');
  }

  return { success: true, data: null };
}

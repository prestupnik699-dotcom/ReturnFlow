import { supabase } from '@/lib/supabase';
import type { Profile } from '@/stores/auth.store';

export async function fetchCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, auth_user_id, first_name, last_name, photo_url, phone, language, theme, status, has_seen_onboarding',
    )
    .eq('auth_user_id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    photoUrl: data.photo_url,
    phone: data.phone,
    language: data.language,
    theme: data.theme,
    status: data.status,
    hasSeenOnboarding: data.has_seen_onboarding,
  };
}

export async function updateProfileSettings(
  profileId: string,
  input: { language: string; theme: string },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ language: input.language, theme: input.theme })
    .eq('id', profileId);

  if (error) {
    throw error;
  }
}

export async function markOnboardingSeen(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ has_seen_onboarding: true })
    .eq('id', profileId);

  if (error) {
    throw error;
  }
}

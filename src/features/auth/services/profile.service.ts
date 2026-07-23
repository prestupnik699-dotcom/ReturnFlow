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

// Path is {auth_user_id}/avatar-{timestamp}.{ext} — the storage RLS
// policies check that the first path segment matches auth.uid(), so this
// convention is what makes "only the owner can write their own avatar"
// enforceable at the storage layer, not just in application code.
export async function uploadProfilePhoto(
  profileId: string,
  authUserId: string,
  localUri: string,
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${authUserId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ photo_url: data.publicUrl })
    .eq('id', profileId);

  if (updateError) {
    throw updateError;
  }

  return data.publicUrl;
}

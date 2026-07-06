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
    .select('id, auth_user_id, first_name, last_name, photo_url, phone, language, theme, status')
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
  };
}

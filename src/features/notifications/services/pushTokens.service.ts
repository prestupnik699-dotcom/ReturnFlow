import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export async function savePushToken(
  profileId: string,
  token: string,
  deviceType: string,
): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      profile_id: profileId,
      token,
      device_type: deviceType,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' },
  );

  if (error) {
    return fromCaughtError(error, 'SAVE_PUSH_TOKEN_FAILED');
  }

  return { success: true, data: null };
}

export async function removePushToken(token: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);

  if (error) {
    return fromCaughtError(error, 'REMOVE_PUSH_TOKEN_FAILED');
  }

  return { success: true, data: null };
}

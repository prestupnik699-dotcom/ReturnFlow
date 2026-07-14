import { supabase } from '@/lib/supabase';
import { fromCaughtError, type ServiceResult } from '@/lib/result';

export async function deleteAccount(): Promise<ServiceResult<null>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    return { success: false, error: { code: 'NO_SESSION', message: 'No active session' } };
  }

  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (error) {
      return fromCaughtError(error, 'DELETE_ACCOUNT_FAILED');
    }

    if (data?.error === 'HAS_TEAMMATES') {
      return {
        success: false,
        error: {
          code: 'HAS_TEAMMATES',
          message: `profile.deleteAccount.hasTeammates::${data.organizationName ?? ''}`,
        },
      };
    }

    if (data?.error) {
      return { success: false, error: { code: 'DELETE_ACCOUNT_FAILED', message: data.error } };
    }

    return { success: true, data: null };
  } catch (error) {
    return fromCaughtError(error, 'DELETE_ACCOUNT_FAILED');
  }
}

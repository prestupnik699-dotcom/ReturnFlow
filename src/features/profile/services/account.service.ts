import { FunctionsHttpError } from '@supabase/supabase-js';
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
      // supabase-js discards the function's actual JSON response body on a
      // non-2xx status by default, surfacing only a generic "non-2xx status
      // code" message — the real payload has to be read separately from
      // error.context (the raw Response object).
      if (error instanceof FunctionsHttpError) {
        try {
          const body = await error.context.json();
          if (body?.error === 'HAS_TEAMMATES') {
            return {
              success: false,
              error: {
                code: 'HAS_TEAMMATES',
                message: `profile.deleteAccount.hasTeammates::${body.organizationName ?? ''}`,
              },
            };
          }
          if (body?.error) {
            return {
              success: false,
              error: { code: 'DELETE_ACCOUNT_FAILED', message: body.error },
            };
          }
        } catch {
          // Fall through to the generic error below if the body itself
          // can't be parsed.
        }
      }

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

import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';
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
      // A genuine network failure reaching Supabase at all (not the
      // function responding with an error) — handled separately because
      // relying on its .message here is what was producing a literal "{}"
      // on screen (a well-known JS quirk: JSON.stringify(someError)
      // collapses to "{}" since Error's own message/stack aren't
      // enumerable properties).
      if (error instanceof FunctionsFetchError) {
        return {
          success: false,
          error: { code: 'NETWORK_ERROR', message: 'profile.deleteAccount.networkError' },
        };
      }

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

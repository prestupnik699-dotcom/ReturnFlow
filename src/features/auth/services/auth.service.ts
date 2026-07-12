import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { fromCaughtError, serviceError, type ServiceResult } from '@/lib/result';

export async function login(email: string, password: string): Promise<ServiceResult<Session>> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return fromCaughtError(error, 'LOGIN_FAILED');
  }

  if (!data.session) {
    return serviceError('LOGIN_FAILED', 'No session was returned by the server.');
  }

  return { success: true, data: data.session };
}

export async function logout(): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return fromCaughtError(error, 'LOGOUT_FAILED');
  }

  return { success: true, data: null };
}

type RegisterInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
};

export async function register(input: RegisterInput): Promise<ServiceResult<Session>> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    },
  });

  if (error) {
    return fromCaughtError(error, 'REGISTER_FAILED');
  }

  if (!data.session) {
    return serviceError('REGISTER_FAILED', 'No session was returned by the server.');
  }

  const { error: invitationError } = await supabase.rpc('accept_invitation', {
    invitation_code: input.invitationCode,
  });

  if (invitationError) {
    return fromCaughtError(invitationError, 'INVALID_INVITATION_CODE');
  }

  return { success: true, data: data.session };
}

export async function requestPasswordReset(email: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'returnflow://reset-password',
  });

  if (error) {
    return fromCaughtError(error, 'PASSWORD_RESET_FAILED');
  }

  return { success: true, data: null };
}

export async function changePassword(newPassword: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return fromCaughtError(error, 'PASSWORD_CHANGE_FAILED');
  }

  return { success: true, data: null };
}

// Supabase can deliver the recovery token in the link two different ways
// depending on project auth settings — a `code` query param (PKCE, needs
// exchangeCodeForSession) or access_token/refresh_token in the URL fragment
// (implicit flow, needs setSession). This handles both without needing to
// know in advance which one a given project uses.
export async function establishRecoverySession(url: string): Promise<ServiceResult<Session>> {
  const codeMatch = url.match(/[?&]code=([^&]+)/);

  if (codeMatch && codeMatch[1]) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(codeMatch[1]);
    if (error || !data.session) {
      return fromCaughtError(error, 'INVALID_RECOVERY_LINK');
    }
    return { success: true, data: data.session };
  }

  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    const params = new URLSearchParams(url.slice(hashIndex + 1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error || !data.session) {
        return fromCaughtError(error, 'INVALID_RECOVERY_LINK');
      }
      return { success: true, data: data.session };
    }
  }

  return serviceError('INVALID_RECOVERY_LINK', 'This link is invalid or has expired.');
}

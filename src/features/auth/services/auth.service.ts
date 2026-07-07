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

  // The auth user and profile now exist. Consuming the invitation code is a
  // separate step so a bad code produces a clear, specific error rather than
  // failing signUp itself.
  const { error: invitationError } = await supabase.rpc('accept_invitation', {
    invitation_code: input.invitationCode,
  });

  if (invitationError) {
    return fromCaughtError(invitationError, 'INVALID_INVITATION_CODE');
  }

  return { success: true, data: data.session };
}

export async function requestPasswordReset(email: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

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

const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockSignUp = jest.fn();
const mockRpc = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockExchangeCodeForSession = jest.fn();
const mockSetSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import type { Session } from '@supabase/supabase-js';
import {
  login,
  logout,
  register,
  requestPasswordReset,
  changePassword,
  establishRecoverySession,
} from '@/features/auth/services/auth.service';

const FAKE_SESSION = { access_token: 'tok-123', user: { id: 'user-1' } } as unknown as Session;

beforeEach(() => {
  mockSignInWithPassword.mockReset();
  mockSignOut.mockReset();
  mockSignUp.mockReset();
  mockRpc.mockReset();
  mockResetPasswordForEmail.mockReset();
  mockUpdateUser.mockReset();
  mockExchangeCodeForSession.mockReset();
  mockSetSession.mockReset();
});

describe('login', () => {
  it('returns the session on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const result = await login('a@b.com', 'password123');

    expect(result).toEqual({ success: true, data: FAKE_SESSION });
  });

  it('wraps a Supabase error as LOGIN_FAILED', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials'),
    });

    const result = await login('a@b.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('LOGIN_FAILED');
      expect(result.error.message).toBe('Invalid login credentials');
    }
  });

  it('fails when Supabase reports no error but also returns no session', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { session: null }, error: null });

    const result = await login('a@b.com', 'password123');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('LOGIN_FAILED');
    }
  });
});

describe('register', () => {
  const baseInput = {
    email: 'new@b.com',
    password: 'password123',
    firstName: 'Guram',
    lastName: 'Test',
    invitationCode: '',
  };

  // D-022: the first user of a brand-new business has no invitation code
  // and goes on to create their own organization — registration must
  // succeed without ever calling accept_invitation in that case.
  it('succeeds without calling accept_invitation when no invitation code is given', async () => {
    mockSignUp.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const result = await register(baseInput);

    expect(result).toEqual({ success: true, data: FAKE_SESSION });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('accepts the invitation when a code is provided, then succeeds', async () => {
    mockSignUp.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    mockRpc.mockResolvedValue({ error: null });

    const result = await register({ ...baseInput, invitationCode: '  ABC123  ' });

    expect(mockRpc).toHaveBeenCalledWith('accept_invitation', { invitation_code: 'ABC123' });
    expect(result).toEqual({ success: true, data: FAKE_SESSION });
  });

  it('fails with INVALID_INVITATION_CODE when the code is rejected', async () => {
    mockSignUp.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });
    mockRpc.mockResolvedValue({ error: new Error('Invitation code not found') });

    const result = await register({ ...baseInput, invitationCode: 'BADCODE' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INVITATION_CODE');
    }
  });

  it('wraps a sign-up error as REGISTER_FAILED', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null }, error: new Error('Email taken') });

    const result = await register(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('REGISTER_FAILED');
    }
  });
});

describe('logout', () => {
  it('succeeds when Supabase reports no error', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const result = await logout();
    expect(result).toEqual({ success: true, data: null });
  });

  it('wraps a sign-out error as LOGOUT_FAILED', async () => {
    mockSignOut.mockResolvedValue({ error: new Error('network down') });
    const result = await logout();
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('LOGOUT_FAILED');
    }
  });
});

describe('requestPasswordReset', () => {
  it('succeeds when Supabase reports no error', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordReset('a@b.com');
    expect(result).toEqual({ success: true, data: null });
  });
});

describe('changePassword', () => {
  it('succeeds when Supabase reports no error', async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    const result = await changePassword('newpassword123');
    expect(result).toEqual({ success: true, data: null });
  });
});

describe('establishRecoverySession', () => {
  it('exchanges a PKCE code from the URL for a session', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const result = await establishRecoverySession('returnflow://reset-password?code=abc123');

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    expect(result).toEqual({ success: true, data: FAKE_SESSION });
  });

  it('sets the session from access/refresh tokens in a hash fragment', async () => {
    mockSetSession.mockResolvedValue({ data: { session: FAKE_SESSION }, error: null });

    const result = await establishRecoverySession(
      'returnflow://reset-password#access_token=at1&refresh_token=rt1',
    );

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'at1',
      refresh_token: 'rt1',
    });
    expect(result).toEqual({ success: true, data: FAKE_SESSION });
  });

  it('fails with INVALID_RECOVERY_LINK when the link has neither a code nor tokens', async () => {
    const result = await establishRecoverySession('returnflow://reset-password');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_RECOVERY_LINK');
    }
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('fails with INVALID_RECOVERY_LINK when the code exchange itself fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: new Error('expired code'),
    });

    const result = await establishRecoverySession('returnflow://reset-password?code=expired');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_RECOVERY_LINK');
    }
  });
});

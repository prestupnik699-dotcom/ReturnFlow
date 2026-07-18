// Mock variables must be prefixed with "mock" — babel-plugin-jest-hoist
// only allows identifiers matching /^mock/ to be referenced inside a
// jest.mock() factory, since jest.mock calls are hoisted above imports.
const mockGetSession = jest.fn();
const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: () => mockGetSession() },
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';
import { deleteAccount } from '@/features/profile/services/account.service';

const AUTHENTICATED_SESSION = {
  data: { session: { access_token: 'test-token-123' } },
};

beforeEach(() => {
  mockGetSession.mockReset();
  mockInvoke.mockReset();
});

describe('deleteAccount', () => {
  it('fails immediately with NO_SESSION when there is no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NO_SESSION');
    }
    // Must not attempt the edge function call without a token.
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('reports NETWORK_ERROR (not the raw error) when the request never reaches the server', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError({ reason: 'offline' }),
    });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.error.message).toBe('profile.deleteAccount.networkError');
    }
  });

  it('surfaces HAS_TEAMMATES with the organization name from the function response body', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ error: 'HAS_TEAMMATES', organizationName: 'GG House 3' }),
      }),
    });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('HAS_TEAMMATES');
      expect(result.error.message).toBe('profile.deleteAccount.hasTeammates::GG House 3');
    }
  });

  it("surfaces the function's own error body for other failures", async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => ({ error: 'SOME_OTHER_REASON' }),
      }),
    });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DELETE_ACCOUNT_FAILED');
      expect(result.error.message).toBe('SOME_OTHER_REASON');
    }
  });

  // This is the exact scenario the "{}" bug came from: the HTTP error's
  // body can't be parsed as JSON, so the code must fall through to a
  // generic, non-garbage error rather than ever letting a stringified
  // Error object reach the message field.
  it('falls back to a generic error when the HTTP error body cannot be parsed', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsHttpError({
        json: async () => {
          throw new Error('body is not valid JSON');
        },
      }),
    });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DELETE_ACCOUNT_FAILED');
      expect(result.error.message).not.toBe('{}');
      expect(result.error.message).not.toBe('[object Object]');
    }
  });

  it('surfaces HAS_TEAMMATES when it comes back as data.error instead of a thrown error', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({
      data: { error: 'HAS_TEAMMATES', organizationName: 'Libo Group' },
      error: null,
    });

    const result = await deleteAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('HAS_TEAMMATES');
      expect(result.error.message).toBe('profile.deleteAccount.hasTeammates::Libo Group');
    }
  });

  it('succeeds when the function reports no error', async () => {
    mockGetSession.mockResolvedValue(AUTHENTICATED_SESSION);
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    const result = await deleteAccount();

    expect(result).toEqual({ success: true, data: null });
  });
});

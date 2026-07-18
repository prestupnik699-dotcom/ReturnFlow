import { fromCaughtError, serviceError } from '@/lib/result';

describe('serviceError', () => {
  it('wraps a code and message into a failed ServiceResult', () => {
    const result = serviceError('SOME_CODE', 'Something went wrong');
    expect(result).toEqual({
      success: false,
      error: { code: 'SOME_CODE', message: 'Something went wrong' },
    });
  });
});

describe('fromCaughtError', () => {
  it('uses the real Error message when it is usable', () => {
    const result = fromCaughtError(new Error('Network request failed'), 'MY_CODE');
    expect(result).toEqual({
      success: false,
      error: { code: 'MY_CODE', message: 'Network request failed' },
    });
  });

  // Regression test for the "{}" bug on Profile → Delete account: a
  // JSON.stringify()'d Error collapses to a literal "{}" string because
  // Error's own message/stack aren't enumerable properties. That string
  // must never surface to the UI as if it were a real error message.
  it('falls back to a generic message when the Error message is a stringified empty object', () => {
    const result = fromCaughtError(new Error('{}'), 'MY_CODE');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('An unexpected error occurred');
      expect(result.error.message).not.toBe('{}');
    }
  });

  it('falls back to a generic message when the Error message is "[object Object]"', () => {
    const result = fromCaughtError(new Error('[object Object]'), 'MY_CODE');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('An unexpected error occurred');
    }
  });

  it('falls back to a generic message when the Error message is blank/whitespace', () => {
    const result = fromCaughtError(new Error('   '), 'MY_CODE');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('An unexpected error occurred');
    }
  });

  it('falls back to a generic message when the caught value is not an Error at all', () => {
    const result = fromCaughtError('a plain string was thrown', 'MY_CODE');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe('An unexpected error occurred');
      expect(result.error.code).toBe('MY_CODE');
    }
  });

  it('defaults the code to UNKNOWN_ERROR when none is given', () => {
    const result = fromCaughtError(new Error('boom'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    }
  });
});

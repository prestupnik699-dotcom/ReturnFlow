export type ServiceError = {
  code: string;
  message: string;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: ServiceError };

export function serviceError(code: string, message: string): ServiceResult<never> {
  return { success: false, error: { code, message } };
}

function isUsableMessage(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim() !== '{}' &&
    value.trim() !== '[object Object]'
  );
}

export function fromCaughtError(
  error: unknown,
  fallbackCode = 'UNKNOWN_ERROR',
): ServiceResult<never> {
  // Supabase's PostgrestError (and similar error-shaped objects from
  // other SDKs) are NOT `instanceof Error` in JavaScript — they're
  // plain objects with a `.message` string. The stricter instanceof
  // check silently discarded every real database error message and
  // replaced it with a useless generic fallback, making every actual
  // failure (RLS violation, constraint violation, network error) look
  // identical and undiagnosable.
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: unknown }).message
        : undefined;

  const message = isUsableMessage(rawMessage) ? rawMessage : 'An unexpected error occurred';
  return serviceError(fallbackCode, message);
}

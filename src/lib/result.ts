export type ServiceError = {
  code: string;
  message: string;
};

export type ServiceResult<T> = { success: true; data: T } | { success: false; error: ServiceError };

export function serviceError(code: string, message: string): ServiceResult<never> {
  return { success: false, error: { code, message } };
}

export function fromCaughtError(
  error: unknown,
  fallbackCode = 'UNKNOWN_ERROR',
): ServiceResult<never> {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return serviceError(fallbackCode, message);
}

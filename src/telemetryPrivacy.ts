export function privateErrorSummary(error: unknown) {
  return error instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ApiError', 'AxiosError'].includes(error.name) ? error.name : 'UnknownError';
}

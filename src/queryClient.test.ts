import { describe, expect, it } from 'vitest';
import { ApiError } from './services/api';
import { retryRead } from './queryClient';

describe('read retry policy', () => {
  it.each([400, 401, 403, 404, 429])('never repeats a rejected request (%s)', status => {
    expect(retryRead(0, new ApiError('rejected', status))).toBe(false);
  });
  it.each([500, 502, 503, 504, undefined])('bounds transient failures to one retry (%s)', status => {
    expect(retryRead(0, new ApiError('unavailable', status))).toBe(true);
    expect(retryRead(1, new ApiError('unavailable', status))).toBe(false);
  });
});

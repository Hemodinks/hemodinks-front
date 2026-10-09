import { describe, expect, it } from 'vitest';
import { readRetryAfter } from './retryAfter';

describe('Retry-After contract', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  it('prioritizes seconds in the header over the JSON fallback', () => {
    expect(readRetryAfter(' 12 ', { retryAfterSeconds: 30 }, now)).toBe(12);
    expect(readRetryAfter('0', { retryAfterSeconds: 30 }, now)).toBe(0);
  });
  it('supports HTTP dates and an already elapsed deadline', () => {
    expect(readRetryAfter('Thu, 08 Oct 2026 12:00:05 GMT', undefined, now)).toBe(5);
    expect(readRetryAfter('Thu, 08 Oct 2026 11:59:00 GMT', undefined, now)).toBe(0);
  });
  it.each([undefined, '', 'invalid', '-1', '1.5', 'Infinity'])('uses the JSON fallback for %s', value => {
    expect(readRetryAfter(value, { retryAfterSeconds: 4 }, now)).toBe(4);
  });
  it.each([-1, 1.5, '20', null, Infinity, Number.MAX_VALUE])('does not invent a wait for invalid JSON: %s', retryAfterSeconds => {
    expect(readRetryAfter(undefined, { retryAfterSeconds }, now)).toBeUndefined();
  });
});

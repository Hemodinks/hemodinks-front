// Retry-After is the authority for the wait; the JSON field supports clients
// that cannot read the header (for example, an older CORS configuration).
export function readRetryAfter(value: unknown, data?: unknown, now = Date.now()): number | undefined {
  if (typeof value === 'string' && value.trim()) {
    const header = value.trim();
    if (/^\d+$/.test(header)) {
      const seconds = Number(header);
      if (Number.isSafeInteger(seconds)) return seconds;
    } else if (!/^[+-]?[\d.]+$/.test(header)) {
      const date = Date.parse(header);
      if (Number.isFinite(date)) return Math.max(0, Math.ceil((date - now) / 1000));
    }
  }
  if (typeof data === 'object' && data !== null && 'retryAfterSeconds' in data) {
    const seconds = data.retryAfterSeconds;
    if (typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds >= 0) return seconds;
  }
  return undefined;
}

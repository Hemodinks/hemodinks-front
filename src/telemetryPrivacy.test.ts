import { expect, it } from 'vitest';
import { sanitizeTelemetryEvent, sanitizeSpan, privateErrorSummary } from './telemetryPrivacy';
it('drops request credentials, recovery URLs, user data and DOM breadcrumbs from errors', () => {
  const output = sanitizeTelemetryEvent({ type: 'error', timestamp: 1, request: { url: '/reset?token=SECRET', headers: { Authorization: 'Bearer SECRET' } }, user: { email: 'PRIVATE' }, exception: { values: [{ value: 'SECRET' }] }, breadcrumbs: [{ message: 'PRIVATE' }] });
  expect(output).toEqual({ type: 'error', timestamp: 1, message: 'Falha na aplicação' });
  expect(privateErrorSummary(Object.assign(new Error('SECRET'), { name: 'SECRET' }))).toBe('UnknownError');
});
it('keeps trace timing and numeric status without private attributes or exception events', () => {
  const span = { name: '/reset?token=SECRET', kind: 0, spanContext: () => ({ traceId: '123' }), startTime: [1,0], endTime: [2,0], duration: [1,0], ended: true, status: { code: 2, message: 'SECRET' }, attributes: { 'http.status_code': 401, 'url.full': 'SECRET' }, events: [{ name: 'SECRET' }], links: [], resource: {}, instrumentationScope: {} } as unknown as Parameters<typeof sanitizeSpan>[0];
  const output = sanitizeSpan(span);
  expect(JSON.stringify(output)).not.toContain('SECRET');
  expect(output.duration).toEqual([1,0]);
  expect(output.attributes).toEqual({ 'http.response.status_code': 401 });
});

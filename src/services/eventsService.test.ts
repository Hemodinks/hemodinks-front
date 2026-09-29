import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from './api';
import { getAgendaEvents } from './eventsService';
afterEach(() => vi.restoreAllMocks());
it('serializes optional filters with the authenticated token, including false status', async () => {
  const spy = vi.spyOn(apiClient, 'request').mockResolvedValue({ data: [] });
  await getAgendaEvents('token', '2026-09-01T00:00:00Z', '2026-09-30T23:59:59Z', { search: 'Reunião & auditoria', userId: 99, isCompleted: false });
  const config = spy.mock.calls[0][0];
  expect(config.url).toBe('/api/events/');
  expect(config.headers).toMatchObject({ Authorization: 'Bearer token' });
  const params = new URLSearchParams(config.params);
  expect(params.get('fromDate')).toBe(new Date('2026-09-01T00:00:00Z').toLocaleDateString('en-CA'));
  expect(params.get('toDate')).toBe(new Date('2026-09-30T23:59:59Z').toLocaleDateString('en-CA'));
  expect(Object.fromEntries(params)).toMatchObject({ from: '2026-09-01T00:00:00Z', to: '2026-09-30T23:59:59Z', search: 'Reunião & auditoria', userId: '99', isCompleted: 'false' });
});

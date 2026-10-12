import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { AuthSession } from '../../types';
import { advanceSessionEpoch } from '../../services/sessionEpoch';
import * as service from '../../services/eventEmailService';
import { useAgendaEventEmail } from './useAgendaEventEmail';
import type { EventEmailPreview } from '../../types/eventEmail';
vi.mock('../../services/eventEmailService', () => ({ getEventEmailNotification: vi.fn(), queueEventEmailNotification: vi.fn() }));
const session = { token: 'clinic-a-token', user: { id: 1, clinicaId: 1 } } as AuthSession;
const preview: EventEmailPreview = { recipients: [{ userId: 2, nome: 'Pessoa A', email: 'a@example.test', status: 'available' }],
  recipientCount: 1, pendingCount: 0, sentCount: 0, failedCount: 0, excludedCount: 0, canSend: true };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.getEventEmailNotification).mockResolvedValue(preview); });

it('loads trusted recipients and queues only once during a double click', async () => {
  let finish!: (value: { queuedCount: number }) => void;
  vi.mocked(service.queueEventEmailNotification).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.getEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(AbortSignal));
  let submission!: Promise<void>;
  act(() => { submission = result.current.send(); void result.current.send(); });
  expect(service.queueEventEmailNotification).toHaveBeenCalledTimes(1);
  expect(service.queueEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(String));
  await act(async () => { finish({ queuedCount: 1 }); await submission; });
  expect(result.current.result).toEqual({ queuedCount: 1 });
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).toHaveBeenCalledTimes(1);
});

it('retains the idempotency key for retry after an uncertain write failure', async () => {
  vi.mocked(service.queueEventEmailNotification).mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValue({ queuedCount: 1 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  expect(result.current.error).toBe('Falha de conexão');
  await act(() => result.current.send());
  const calls = vi.mocked(service.queueEventEmailNotification).mock.calls;
  expect(calls[0][2]).toBe(calls[1][2]);
});

it('does not send when the authenticated context has changed after preview', async () => {
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  advanceSessionEpoch();
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});

it('discards late preview data from a previous clinic', async () => {
  let old!: (value: EventEmailPreview) => void;
  vi.mocked(service.getEventEmailNotification).mockImplementationOnce(() => new Promise(resolve => { old = resolve; }));
  const clinicB = { ...session, token: 'clinic-b-token', user: { ...session.user, clinicaId: 2 } };
  const next = { ...preview, recipients: [{ userId: 3, nome: 'Pessoa B', email: 'b@example.test', status: 'available' as const }] };
  vi.mocked(service.getEventEmailNotification).mockResolvedValueOnce(next);
  const { result, rerender } = renderHook(({ current }) => useAgendaEventEmail(10, current), { initialProps: { current: session } });
  rerender({ current: clinicB });
  await waitFor(() => expect(result.current.preview).toEqual(next));
  await act(async () => old(preview));
  expect(result.current.preview).toEqual(next);
});

it('ignores a queue result after switching to another clinic', async () => {
  let finish!: (value: { queuedCount: number }) => void;
  vi.mocked(service.queueEventEmailNotification).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ current }) => useAgendaEventEmail(10, current), { initialProps: { current: session } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  let submission!: Promise<void>;
  act(() => { submission = result.current.send(); });
  rerender({ current: { ...session, token: 'clinic-b-token', user: { ...session.user, clinicaId: 2 } } });
  await act(async () => { finish({ queuedCount: 1 }); await submission; });
  expect(result.current.result).toBeNull();
});

it('does not queue without available recipients and aborts previews on close', async () => {
  vi.mocked(service.getEventEmailNotification).mockResolvedValue({ ...preview, canSend: false });
  const { result, unmount } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
  const signal = vi.mocked(service.getEventEmailNotification).mock.calls[0][2];
  unmount();
  expect(signal?.aborted).toBe(true);
});

it('preserves queue acknowledgement if refreshing delivery status fails', async () => {
  vi.mocked(service.queueEventEmailNotification).mockResolvedValue({ queuedCount: 1 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(service.getEventEmailNotification).mockRejectedValueOnce(new Error('Status indisponível'));
  await act(() => result.current.send());
  expect(result.current.result).toEqual({ queuedCount: 1 });
  expect(result.current.error).toBe('Status indisponível');
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).toHaveBeenCalledOnce();
});

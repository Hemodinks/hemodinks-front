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
  recipientCount: 1, pendingCount: 0, sentCount: 0, failedCount: 0, excludedCount: 0, canSend: true, creatorCopy: { recipient: { userId: 1, nome: 'Autor', email: 'autor@example.test', status: 'available' }, canSend: true, unavailableReason: null } };
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.getEventEmailNotification).mockResolvedValue(preview); });

it('loads trusted recipients and queues only once during a double click', async () => {
  let finish!: (value: { queuedCount: number }) => void;
  vi.mocked(service.queueEventEmailNotification).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.getEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(AbortSignal), false);
  let submission!: Promise<void>;
  act(() => { submission = result.current.send(); void result.current.send(); });
  expect(service.queueEventEmailNotification).toHaveBeenCalledTimes(1);
  expect(service.queueEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(String), false);
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


it('opts into the authenticated creator through a new preview without queuing until confirmation', async () => {
  const withCreator = { ...preview, creatorCopy: { recipient: { userId: 1, nome: 'Autor', email: 'autor@example.test', status: 'available' as const }, canSend: true, unavailableReason: null } };
  vi.mocked(service.getEventEmailNotification).mockResolvedValue(withCreator);
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.copyToCreator).toBe(false);
  act(() => result.current.setCopyToCreator(true));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, session.token, expect.any(AbortSignal), true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
  vi.mocked(service.queueEventEmailNotification).mockResolvedValue({ queuedCount: 2 });
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(String), true);
});

it('refreshes recipients after an uncertain queue failure without replacing the key or changing its payload', async () => {
  vi.mocked(service.queueEventEmailNotification).mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValue({ queuedCount: 1 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  act(() => { result.current.retry(); result.current.setCopyToCreator(true); });
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  const calls = vi.mocked(service.queueEventEmailNotification).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[1]).toEqual(calls[0]);
  expect(result.current.copyToCreator).toBe(false);
});

it('clears creator opt-in and results on a clinic change', async () => {
  const { result, rerender } = renderHook(({ current }) => useAgendaEventEmail(10, current), { initialProps: { current: session } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setCopyToCreator(true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  rerender({ current: { ...session, token: 'clinic-b-token', user: { ...session.user, clinicaId: 2 } } });
  await waitFor(() => expect(result.current.copyToCreator).toBe(false));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, 'clinic-b-token', expect.any(AbortSignal), false);
  expect(result.current.result).toBeNull();
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});

it('does not rotate an uncertain write key just because recipients were refreshed', async () => {
  vi.mocked(service.queueEventEmailNotification).mockRejectedValueOnce(new Error('Resposta perdida')).mockResolvedValue({ queuedCount: 1 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  act(() => result.current.retry());
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.send());
  const calls = vi.mocked(service.queueEventEmailNotification).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[1][2]).toBe(calls[0][2]);
});

it('can remove creator opt-in before confirmation and submits the last preview selection', async () => {
  vi.mocked(service.queueEventEmailNotification).mockResolvedValue({ queuedCount: 1 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setCopyToCreator(true));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, session.token, expect.any(AbortSignal), true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setCopyToCreator(false));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, session.token, expect.any(AbortSignal), false));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).toHaveBeenCalledWith(10, session.token, expect.any(String), false);
});

it('discards a late opted-in preview when the clinic changes', async () => {
  let finish!: (value: EventEmailPreview) => void;
  const { result, rerender } = renderHook(({ current }) => useAgendaEventEmail(10, current), { initialProps: { current: session } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(service.getEventEmailNotification).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  act(() => result.current.setCopyToCreator(true));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenCalledTimes(2));
  const clinicB = { ...session, token: 'clinic-b-token', user: { ...session.user, clinicaId: 2 } };
  const next = { ...preview, recipients: [{ userId: 3, nome: 'Clínica B', email: 'b@example.test', status: 'available' as const }] };
  vi.mocked(service.getEventEmailNotification).mockResolvedValue(next);
  rerender({ current: clinicB });
  expect(result.current.preview).toBeNull();
  await waitFor(() => expect(result.current.preview).toEqual(next));
  await act(async () => finish({ ...preview, creatorCopy: { recipient: preview.recipients[0], canSend: true, unavailableReason: null } }));
  expect(result.current.preview).toEqual(next);
  expect(result.current.copyToCreator).toBe(false);
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});

it('refreshes pending status into sent and failed while keeping the acknowledged queue disabled', async () => {
  vi.mocked(service.queueEventEmailNotification).mockResolvedValue({ queuedCount: 2 });
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(service.getEventEmailNotification).mockResolvedValueOnce({ ...preview, recipients: [{ ...preview.recipients[0], status: 'pending' }], pendingCount: 1, canSend: false });
  await act(() => result.current.send());
  expect(result.current.preview?.pendingCount).toBe(1);
  vi.mocked(service.getEventEmailNotification).mockResolvedValueOnce({ ...preview, recipients: [
    { ...preview.recipients[0], status: 'sent' }, { userId: 3, nome: 'Falhou', email: 'falhou@example.test', status: 'failed' },
  ], recipientCount: 2, sentCount: 1, failedCount: 1, canSend: false });
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.preview?.failedCount).toBe(1));
  expect(result.current.preview?.sentCount).toBe(1);
  expect(result.current.result).toEqual({ queuedCount: 2 });
  await act(() => result.current.send());
  expect(service.queueEventEmailNotification).toHaveBeenCalledOnce();
});

it('allows removing an unsubmitted creator copy after a refresh revokes eligibility', async () => {
  const { result } = renderHook(() => useAgendaEventEmail(10, session));
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setCopyToCreator(true));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, session.token, expect.any(AbortSignal), true));
  await waitFor(() => expect(result.current.loading).toBe(false));
  vi.mocked(service.getEventEmailNotification).mockResolvedValueOnce({ ...preview,
    creatorCopy: { recipient: null, canSend: false, unavailableReason: 'creator_not_authorized' } });
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.preview?.creatorCopy?.canSend).toBe(false));
  act(() => result.current.setCopyToCreator(false));
  await waitFor(() => expect(service.getEventEmailNotification).toHaveBeenLastCalledWith(10, session.token, expect.any(AbortSignal), false));
  expect(result.current.copyToCreator).toBe(false);
  expect(service.queueEventEmailNotification).not.toHaveBeenCalled();
});

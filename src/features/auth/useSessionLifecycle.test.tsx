import { act, fireEvent, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiClient, get } from '../../services/api';
import { renewSession, recordSessionActivity } from '../../services/sessionService';
import type { AuthSession } from '../../types';
import { useSessionExpiration } from './useSessionLifecycle';

vi.mock('../../services', () => ({ AUTH_EXPIRED_EVENT: 'hemodinks:auth-expired', getCurrentLicenca: vi.fn() }));
vi.mock('../../services/sessionService', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/sessionService')>(), renewSession: vi.fn(), recordSessionActivity: vi.fn(),
}));

let sequence = 0;
function token(minutes = 30) {
  return `header.${btoa(JSON.stringify({ sid: 'session-a', usuarioGlobalId: 1, usuarioClinicaId: 2,
    perfilId: 1, perfilNome: 'Administrador', exp: Date.now() / 1000 + minutes * 60, jti: ++sequence }))}.signature`;
}
function session(accessToken = token()): AuthSession {
  return { token: accessToken, user: { id: 1, clinicaId: 1, perfilId: 1, nome: 'User',
    perfilNome: 'Administrador', precisaTrocarSenha: false } } as AuthSession;
}
function mount(initial = session()) {
  const expired = vi.fn();
  const hook = renderHook(() => {
    const [value, persist] = useState(initial);
    useSessionExpiration(value, expired, persist);
    return value;
  });
  return { ...hook, expired };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  vi.mocked(renewSession).mockReset().mockImplementation(async () => ({ token: token(), idleTimeoutMinutes: 30 }));
  vi.mocked(recordSessionActivity).mockReset().mockResolvedValue({ idleTimeoutMinutes: 30 });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('active session renewal', () => {
  it('keeps a user typing in a form authenticated beyond the initial token lifetime', async () => {
    const hook = mount();
    await act(async () => {});
    const first = hook.result.current.token;
    for (let minute = 0; minute < 40; minute++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      await act(async () => { fireEvent.keyDown(window, { key: 'a' }); });
    }
    expect(hook.expired).not.toHaveBeenCalled();
    expect(hook.result.current.token).not.toBe(first);
    hook.unmount();
  });

  it('expires after real inactivity even when timers renew a token', async () => {
    const hook = mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(30 * 60_000); });
    expect(hook.expired).toHaveBeenCalledTimes(1);
    expect(renewSession).toHaveBeenCalledWith(expect.any(String), false);
    hook.unmount();
  });

  it('preserves the session on network failure and retries later', async () => {
    vi.mocked(renewSession).mockRejectedValueOnce(new ApiError('offline'));
    const hook = mount(session(token(1)));
    await act(async () => {});
    expect(hook.expired).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(renewSession).toHaveBeenCalledTimes(2);
    expect(hook.expired).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('ends a session rejected by the server', async () => {
    vi.mocked(renewSession).mockRejectedValue(new ApiError('revoked', 401));
    const hook = mount(session(token(1)));
    await act(async () => {});
    expect(hook.expired).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('shares one renewal across simultaneous requests and sends the updated token', async () => {
    let resolve!: (value: { token: string; idleTimeoutMinutes: number }) => void;
    vi.mocked(renewSession).mockReturnValue(new Promise(done => { resolve = done; }));
    const old = token(1);
    const hook = mount(session(old));
    const request = vi.spyOn(apiClient, 'request').mockResolvedValue({ status: 200, data: { ok: true } });
    const first = get('/test', old);
    const second = get('/test', old);
    const updated = token();
    await act(async () => { resolve({ token: updated, idleTimeoutMinutes: 30 }); await Promise.all([first, second]); });
    expect(renewSession).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0].headers).toMatchObject({ Authorization: `Bearer ${updated}` });
    hook.unmount();
  });

  it('does not restore a session after the component has been removed', async () => {
    let resolve!: (value: { token: string; idleTimeoutMinutes: number }) => void;
    vi.mocked(renewSession).mockReturnValue(new Promise(done => { resolve = done; }));
    const persist = vi.fn();
    const initial = session(token(1));
    const hook = renderHook(() => useSessionExpiration(initial, vi.fn(), persist));
    hook.unmount();
    await act(async () => { resolve({ token: token(), idleTimeoutMinutes: 30 }); });
    expect(persist).not.toHaveBeenCalled();
  });

  it('ignores an unauthorized response from a previous token', async () => {
    const old = token(1);
    const hook = mount(session(old));
    await act(async () => {});
    expect(hook.result.current.token).not.toBe(old);
    act(() => { window.dispatchEvent(new CustomEvent('hemodinks:auth-expired', { detail: { token: old } })); });
    expect(hook.expired).not.toHaveBeenCalled();
    act(() => { window.dispatchEvent(new CustomEvent('hemodinks:auth-expired', { detail: { token: hook.result.current.token } })); });
    expect(hook.expired).toHaveBeenCalledTimes(1);
    hook.unmount();
  });
});

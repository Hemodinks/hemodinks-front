import { restoreSession } from './sessionService';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './api';
import { renewSession } from './sessionService';

function token(membership = 2) {
  return `h.${btoa(JSON.stringify({ sid: 'session-a', usuarioGlobalId: 1, usuarioClinicaId: membership }))}.s`;
}
afterEach(() => vi.restoreAllMocks());

describe('refresh transport', () => {
  it('uses the HttpOnly cookie and a CSRF header, without sending an expired bearer', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { token: token(), idleTimeoutMinutes: 30 } });
    await renewSession(token(), true);
    expect(post).toHaveBeenCalledWith('/api/session/renovar', {
      sessionId: 'session-a', membershipId: 2, active: true,
    }, expect.objectContaining({ withCredentials: true, headers: { 'X-Session-Refresh': '1' } }));
  });

  it('bounds conflict retries and still rejects revoked credentials', async () => {
    const post = vi.spyOn(apiClient, 'post')
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
      .mockResolvedValueOnce({ data: { token: token(), idleTimeoutMinutes: 30 } });
    await renewSession(token(), false);
    expect(post).toHaveBeenCalledTimes(2);
    post.mockReset().mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
    await expect(renewSession(token(), true)).rejects.toMatchObject({ status: 401 });
    expect(post).toHaveBeenCalledTimes(navigator.locks ? 1 : 2);
  });

  it('rejects a refreshed token for another clinic membership', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { token: token(99), idleTimeoutMinutes: 30 } });
    await expect(renewSession(token(), true)).rejects.toMatchObject({ status: 401 });
  });
  it('does not retry the server absolute deadline as a cookie rotation conflict', async () => {
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ isAxiosError: true,
      response: { status: 401, data: { code: 'session_absolute_expired' } } });
    await expect(renewSession(token(), true)).rejects.toMatchObject({ status: 401,
      code: 'session_absolute_expired', message: 'Sua sessão atingiu o tempo máximo. Entre novamente.' });
    expect(post).toHaveBeenCalledTimes(1);
  });

});

it('keeps infrastructure failure separate from session expiration', async () => {
  vi.spyOn(apiClient, 'post').mockRejectedValue({ isAxiosError: true,
    response: { status: 503, data: { code: 'session_absolute_expired' } } });
  await expect(renewSession(token(), true)).rejects.toMatchObject({ status: 503,
    message: 'Não foi possível renovar a sessão.' });
});

it('does not loop on a network failure during restoration', async () => {
  const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ isAxiosError: true, code: 'ERR_NETWORK' });
  await expect(restoreSession()).rejects.toMatchObject({ code: 'ERR_NETWORK' });
  expect(post).toHaveBeenCalledTimes(1);
});
it('bounds restoration conflicts and never sends client identity', async () => {
  const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ isAxiosError: true, response: { status: 409 } });
  await expect(restoreSession()).rejects.toBeDefined();
  expect(post).toHaveBeenCalledTimes(3);
  expect(post).toHaveBeenCalledWith('/api/session/restaurar', {}, expect.objectContaining({ withCredentials: true, headers: { 'X-Session-Refresh': '1' } }));
});

it('limits bootstrap waiting for a lock held by another tab and never bypasses that lock', async () => {
  vi.useFakeTimers();
  const action = vi.spyOn(apiClient, 'post');
  const previous = Object.getOwnPropertyDescriptor(navigator, 'locks');
  Object.defineProperty(navigator, 'locks', { configurable: true, value: {
    request: vi.fn((_name, options) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    })),
  } });
  try {
    const pending = restoreSession();
    const rejected = expect(pending).rejects.toBeDefined();
    await vi.advanceTimersByTimeAsync(15_001);
    await rejected;
    expect(action).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
    if (previous) Object.defineProperty(navigator, 'locks', previous);
    else Reflect.deleteProperty(navigator, 'locks');
  }
});

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
});

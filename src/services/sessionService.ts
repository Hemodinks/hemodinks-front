import { readSessionFailureCode, SESSION_ABSOLUTE_EXPIRED_CODE, SESSION_ABSOLUTE_EXPIRED_MESSAGE } from './sessionExpiration';
import axios from 'axios';
import { withSessionLock } from './sessionLock';
import type { LoginResponse } from '../types';
import { apiClient, ApiError } from './api';
import { decodeJwtPayload } from '../shared/utils/jwt';

export type SessionRenewal = { token: string; idleTimeoutMinutes: number };

export async function recordSessionActivity(token: string): Promise<{ idleTimeoutMinutes: number }> {
  try {
    return (await apiClient.post('/api/session/atividade', {}, {
      timeout: 30_000, headers: { Authorization: `Bearer ${token}` },
    })).data;
  } catch (error) {
    if (axios.isAxiosError(error)) throw new ApiError('Não foi possível registrar a atividade.', error.response?.status, readSessionFailureCode(error.response?.data) ?? error.code);
    throw error;
  }
}

export async function revokeSession(token: string) {
  const claims = decodeJwtPayload(token);
  if (!claims?.sid) return;
  const perform = () => apiClient.post('/api/session/sair', {
    sessionId: claims.sid, membershipId: Number(claims.usuarioClinicaId), active: false,
  }, { withCredentials: true, timeout: 10_000, headers: { 'X-Session-Refresh': '1', Authorization: `Bearer ${token}` } });
  await withSessionLock(perform);
}

export function sessionIdentity(token: string) {
  const claims = decodeJwtPayload(token);
  return JSON.stringify([claims?.sid, claims?.usuarioGlobalId, claims?.usuarioClinicaId,
    claims?.equipeId, claims?.equipeOperadorId, claims?.sid ? undefined : claims?.auth_time]);
}

export async function renewSession(token: string, active: boolean): Promise<SessionRenewal> {
  const claims = decodeJwtPayload(token);
  const perform = async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await apiClient.post<SessionRenewal>(claims?.sid
          ? '/api/session/renovar' : '/api/session/renovar-equipe', {
          sessionId: claims?.sid, membershipId: Number(claims?.usuarioClinicaId), active,
        }, {
          withCredentials: true, timeout: 30_000,
          headers: { 'X-Session-Refresh': '1', ...(!claims?.sid ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!response.data.token || sessionIdentity(response.data.token) !== sessionIdentity(token))
          throw new ApiError('A sessão foi alterada. Entre novamente.', 401);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const code = readSessionFailureCode(error.response?.data);
          if (error.response?.status === 401 && code === SESSION_ABSOLUTE_EXPIRED_CODE)
            throw new ApiError(SESSION_ABSOLUTE_EXPIRED_MESSAGE, error.response?.status, code);
          const concurrentCookieResponse = !navigator.locks && claims?.sid
            && error.response?.status === 401 && attempt === 0;
          if ((error.response?.status === 409 && attempt < 2) || concurrentCookieResponse) {
            await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
            continue;
          }
          throw new ApiError('Não foi possível renovar a sessão.', error.response?.status, readSessionFailureCode(error.response?.data) ?? error.code);
        }
        throw error;
      }
    }
  };
  // Cookies are shared by tabs. Serialize rotations across tabs when Web Locks is available.
  return withSessionLock(perform);
}

export async function restoreSession(): Promise<LoginResponse | null> {
  // The deadline includes waiting for another tab, not only the HTTP request.
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(new DOMException('Session restoration timed out', 'TimeoutError')), 15_000);
  try { return await withSessionLock(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return (await apiClient.post<LoginResponse>('/api/session/restaurar', {}, {
          withCredentials: true, timeout: 15_000, signal: controller.signal, headers: { 'X-Session-Refresh': '1' },
        })).data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) return null;
        if (axios.isAxiosError(error) && error.response?.status === 409 && attempt < 2) continue;
        throw error;
      }
    }
  }, controller.signal); } finally { clearTimeout(deadline); }
}

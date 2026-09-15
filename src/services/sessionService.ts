import axios from 'axios';
import { apiClient, ApiError } from './api';
import { decodeJwtPayload } from '../shared/utils/jwt';

export type SessionRenewal = { token: string; idleTimeoutMinutes: number };

export async function recordSessionActivity(token: string): Promise<{ idleTimeoutMinutes: number }> {
  try {
    return (await apiClient.post('/api/session/atividade', {}, {
      timeout: 30_000, headers: { Authorization: `Bearer ${token}` },
    })).data;
  } catch (error) {
    if (axios.isAxiosError(error)) throw new ApiError('Não foi possível registrar a atividade.', error.response?.status, error.code);
    throw error;
  }
}

export async function revokeSession(token: string) {
  const claims = decodeJwtPayload(token);
  if (!claims?.sid) return;
  const perform = () => apiClient.post('/api/session/sair', {
    sessionId: claims.sid, membershipId: Number(claims.usuarioClinicaId), active: false,
  }, { withCredentials: true, timeout: 10_000, headers: { 'X-Session-Refresh': '1' } });
  if (navigator.locks) await navigator.locks.request('hemodinks-session-refresh', perform);
  else await perform();
}

export function sessionIdentity(token: string) {
  const claims = decodeJwtPayload(token);
  return JSON.stringify([claims?.sid, claims?.usuarioGlobalId, claims?.usuarioClinicaId,
    claims?.equipeId, claims?.equipeOperadorId]);
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
          const concurrentCookieResponse = !navigator.locks && claims?.sid
            && error.response?.status === 401 && attempt === 0;
          if ((error.response?.status === 409 && attempt < 2) || concurrentCookieResponse) {
            await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
            continue;
          }
          throw new ApiError('Não foi possível renovar a sessão.', error.response?.status, error.code);
        }
        throw error;
      }
    }
  };
  // Cookies are shared by tabs. Serialize rotations across tabs when Web Locks is available.
  return navigator.locks ? navigator.locks.request('hemodinks-session-refresh', perform) : perform();
}

import type { ClinicPayload, PlatformClinic, PublicClinic, SelectClinicResponse, SessionClinic } from '../types';
import type { PlatformActiveSessionsResponse } from '../types/activeSessions';
import { del, get, post, put } from './api';

export function listPublicClinics(busca = '', signal?: AbortSignal) {
  const query = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
  return get<PublicClinic[]>(`/api/public/clinicas${query}`, undefined, { signal });
}

export function listPlatformClinics(token: string) {
  return get<PlatformClinic[]>('/api/platform/clinicas', token);
}

export function getPlatformClinic(id: number, token: string) {
  return get<PlatformClinic>(`/api/platform/clinicas/${id}`, token);
}

export function createPlatformClinic(payload: ClinicPayload, token: string) {
  return post<PlatformClinic>('/api/platform/clinicas', payload, token);
}

export function updatePlatformClinic(id: number, payload: ClinicPayload, token: string) {
  return put<PlatformClinic>(`/api/platform/clinicas/${id}`, payload, token);
}

export function deactivatePlatformClinic(id: number, token: string) {
  return del<void>(`/api/platform/clinicas/${id}`, token);
}

export function listPlatformActiveSessions(token: string, pagina = 1, tamanhoPagina = 200, signal?: AbortSignal) {
  return get<PlatformActiveSessionsResponse>(
    `/api/platform/sessoes-ativas?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`, token, { signal });
}

export function selectSessionClinic(clinicaId: number, token: string) {
  return post<SelectClinicResponse>('/api/session/selecionar-clinica', { clinicaId }, token);
}

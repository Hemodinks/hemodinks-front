import type { ClinicPayload, PlatformClinic, PublicClinic, SelectClinicResponse, SessionClinic } from '../types';
import { del, get, post, put } from './api';

export function listPublicClinics(busca = '') {
  const query = busca.trim() ? `?busca=${encodeURIComponent(busca.trim())}` : '';
  return get<PublicClinic[]>(`/api/public/clinicas${query}`);
}

export function listPlatformClinics(token: string) {
  return get<PlatformClinic[]>('/api/platform/clinicas', token);
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

export function listSessionClinics(token: string) {
  return get<SessionClinic[]>('/api/session/clinicas', token);
}

export function selectSessionClinic(clinicaId: number, token: string) {
  return post<SelectClinicResponse>('/api/session/selecionar-clinica', { clinicaId }, token);
}

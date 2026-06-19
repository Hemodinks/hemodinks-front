import type { ListQuery, MedicalGroup, MedicalGroupFormData, MedicalUserOption, PagedResult } from '../types';
import { del, get, post, put } from './api';
import { buildListQueryParams } from './queryParams';

export function getMedicalGroups(token: string, query?: ListQuery) {
  return get<PagedResult<MedicalGroup>>('/api/grupos-medicos/', token, {
    params: buildListQueryParams(query),
  });
}

export function getMedicalGroup(id: number, token: string) {
  return get<MedicalGroup>(`/api/grupos-medicos/${id}`, token);
}

export function createMedicalGroup(payload: MedicalGroupFormData, token: string) {
  return post<MedicalGroup>('/api/grupos-medicos/', payload, token);
}

export function updateMedicalGroup(id: number, payload: MedicalGroupFormData, token: string) {
  return put<MedicalGroup>(`/api/grupos-medicos/${id}`, payload, token);
}

export function deleteMedicalGroup(id: number, token: string) {
  return del<void>(`/api/grupos-medicos/${id}`, token);
}

export function getScopedMedicalUsers(token: string) {
  return get<MedicalUserOption[]>('/api/grupos-medicos/medicos', token);
}

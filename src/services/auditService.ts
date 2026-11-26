import type { AuditoriaClinicaItem, AuditoriaConfiguracao, PagedResult } from '../types';
import { get, put } from './api';

// Tela geral de auditoria (Administrador/SuperAdministrador, sempre na clinica ativa).
export function listAuditoria(token: string, page: number, pageSize: number,
  filtros: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  for (const [key, value] of Object.entries(filtros)) {
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  }
  return get<PagedResult<AuditoriaClinicaItem>>('/api/auditoria-clinica', token, { params });
}

export function getAuditoriaConfiguracao(token: string) {
  return get<AuditoriaConfiguracao>('/api/auditoria-clinica/configuracao', token);
}

export function updateAuditoriaConfiguracao(token: string, configuracao: AuditoriaConfiguracao) {
  return put<AuditoriaConfiguracao>('/api/auditoria-clinica/configuracao', configuracao, token);
}

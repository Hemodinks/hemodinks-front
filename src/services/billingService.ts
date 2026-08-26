import type { BillingHistoryFile, Paciente, PacienteListQuery, PagedResult } from '../types';
import { del, get, getBlob, upload } from './api';
import { buildListQueryParams } from './queryParams';

export function getFaturamentosMedicos(token: string, query?: PacienteListQuery) {
  return get<PagedResult<Paciente>>('/api/faturamentos-medicos/', token, {
    params: buildListQueryParams(query),
  });
}

export function getBillingHistoryFiles(token: string, ano?: number, mes?: number) {
  return get<BillingHistoryFile[]>('/api/faturamentos-medicos/historico/arquivos', token, {
    params: { ...(ano == null ? {} : { ano }), ...(mes == null ? {} : { mes }) },
  });
}

export function uploadBillingHistoryFile(token: string, ano: number, mes: number, file: File) {
  const body = new FormData();
  body.append('arquivo', file);
  return upload<BillingHistoryFile>(`/api/faturamentos-medicos/historico/${ano}/${mes}/arquivos`, body, token);
}

export function downloadBillingHistoryFile(token: string, fileId: number) {
  return getBlob(`/api/faturamentos-medicos/historico/arquivos/${fileId}/download`, token);
}

export function deleteBillingHistoryFile(token: string, fileId: number) {
  return del<void>(`/api/faturamentos-medicos/historico/arquivos/${fileId}`, token);
}

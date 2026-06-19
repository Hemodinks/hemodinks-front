import type {
  Paciente,
  PacienteArquivo,
  PacienteListQuery,
  PacienteObservacao,
  PacientePayload,
  PagedResult,
} from '../types';
import { del, get, post, put, upload } from './api';
import { buildListQueryParams } from './queryParams';

export function getPacientes(token: string, query?: PacienteListQuery) {
  return get<PagedResult<Paciente>>('/api/pacientes/', token, {
    params: buildListQueryParams(query),
  });
}

export function getPaciente(id: number, token: string) {
  return get<Paciente>(`/api/pacientes/${id}`, token);
}

export function createPaciente(payload: PacientePayload, token: string) {
  return post<Paciente>('/api/pacientes/', payload, token);
}

export function updatePaciente(id: number, payload: PacientePayload, token: string) {
  return put<Paciente>(`/api/pacientes/${id}`, payload, token);
}

export function deletePaciente(id: number, token: string) {
  return del<void>(`/api/pacientes/${id}`, token);
}

export function uploadPacienteArquivo(id: number, file: File, token: string) {
  const body = new FormData();
  body.append('file', file);
  return upload<PacienteArquivo>(`/api/pacientes/${id}/arquivos`, body, token);
}

export function getPacienteObservacoes(id: number, token: string) {
  return get<PacienteObservacao[]>(`/api/pacientes/${id}/observacoes`, token);
}

export function createPacienteObservacao(
  id: number,
  payload: { texto: string; observacaoPaiId?: number | null },
  token: string,
) {
  return post<{ pacienteId: number; createdCount: number }>(`/api/pacientes/${id}/observacoes`, payload, token);
}

export function markPacienteObservacoesAsRead(id: number, token: string) {
  return post<{ pacienteId: number; updatedCount: number }>(
    `/api/pacientes/${id}/observacoes/marcar-lidas`,
    undefined,
    token,
  );
}

export function deletePacienteArquivo(id: number, arquivoId: number, token: string) {
  return del<void>(`/api/pacientes/${id}/arquivos/${arquivoId}`, token);
}
